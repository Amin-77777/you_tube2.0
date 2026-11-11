import mongoose from "mongoose";
import Comment from "../Modals/comment.js";
import CommentReaction from "../Modals/CommentReaction.js";
import CommentReport from "../Modals/CommentReport.js";
import CommentEditHistory from "../Modals/CommentEditHistory.js";
import CommentModerationLog from "../Modals/CommentModerationLog.js";
import User from "../Modals/Auth.js";
import {
  validateCommentSubmission,
  sanitizeHtml,
} from "../services/spamDetectionService.js";
import {
  translateComment,
  detectLanguage,
  SUPPORTED_LANGUAGES,
} from "../services/translationService.js";
import {
  notifyCommentReply,
  notifyCommentLike,
  notifyCommentMentions,
} from "../services/commentNotificationService.js";
import {
  generateCaptchaChallenge,
  verifyCaptcha,
} from "../services/captchaService.js";

const EDIT_TIME_LIMIT_MINUTES = parseInt(
  process.env.COMMENT_EDIT_TIME_LIMIT_MINUTES || "15",
  10
);

/**
 * Helper to extract authenticated user from request
 */
function getAuthUser(req) {
  return req.user || null;
}

/**
 * 1. POST /api/comments or /comment/postcomment
 * Create comment or reply with full multilingual, security, and spam detection
 */
export const postcomment = async (req, res) => {
  try {
    const user = getAuthUser(req);
    const body = req.body || {};

    const userId = user?._id || user?.id || body.userid || body.userId;
    const videoId = body.videoId || body.videoid;
    const rawText = body.originalText || body.commentbody || body.text || "";
    const parentCommentId = body.parentCommentId || body.parentId || null;
    const captchaChallengeId = body.captchaChallengeId;
    const captchaAnswer = body.captchaAnswer;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required to post comments." });
    }

    if (!videoId || String(videoId).trim().length === 0) {
      return res.status(400).json({ message: "Valid video ID is required." });
    }

    // Retrieve user record
    const userDoc = user || (await User.findById(userId));
    if (!userDoc) {
      return res.status(401).json({ message: "User account not found." });
    }

    // Validate CAPTCHA if challenge submitted
    if (captchaChallengeId) {
      const capResult = verifyCaptcha(captchaChallengeId, captchaAnswer);
      if (!capResult.success) {
        return res.status(400).json({
          captchaRequired: true,
          message: capResult.message,
        });
      }
    }

    // Validate comment against spam, profanity, length, rate limit, duplicate
    const isReply = Boolean(parentCommentId);
    const validation = await validateCommentSubmission({
      userId,
      userDoc,
      videoId,
      text: rawText,
      parentCommentId,
      isReply,
    });

    if (!validation.isValid) {
      return res.status(validation.status || 400).json({
        message: validation.message,
        requireCaptcha: validation.requireCaptcha || false,
        retryAfterSeconds: validation.retryAfterSeconds,
      });
    }

    // Check parent comment if this is a reply
    let parentComment = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ message: "Invalid parent comment ID." });
      }
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found." });
      }
    }

    // Detect language of comment
    const detectedLanguage = detectLanguage(validation.sanitizedText);

    // Location privacy: attach only if permitted and available
    let userLocation = "";
    if (userDoc.showLocationInComments !== false && userDoc.lastLoginLocation) {
      userLocation = userDoc.lastLoginLocation;
    }

    // Create the new comment
    const newComment = new Comment({
      userId: userDoc._id,
      userid: userDoc._id,
      videoId,
      videoid: videoId,
      parentCommentId: parentCommentId || null,
      originalText: validation.sanitizedText,
      commentbody: validation.sanitizedText,
      usercommented: userDoc.name || body.usercommented || "Anonymous",
      userImage: userDoc.image || "",
      userLocation,
      detectedLanguage,
      version: 1,
      moderationStatus: "Approved",
    });

    await newComment.save();

    // If reply: increment parent comment's repliesCount atomically and notify
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment._id, {
        $inc: { repliesCount: 1 },
      });
      notifyCommentReply({
        parentComment,
        replyComment: newComment,
        actorUser: userDoc,
      }).catch((e) => console.warn("Reply notification error:", e.message));
    }

    // Notify any @mentions in the comment
    notifyCommentMentions({
      comment: newComment,
      text: validation.sanitizedText,
      actorUser: userDoc,
    }).catch((e) => console.warn("Mention notification error:", e.message));

    // Return populated comment with legacy compatibility flag
    return res.status(201).json({
      success: true,
      comment: true, // legacy
      result: newComment,
      requireCaptcha: validation.requireCaptcha,
    });
  } catch (error) {
    console.error("[postcomment] Error:", error);
    return res.status(500).json({ message: "Internal server error while posting comment" });
  }
};

/**
 * 2. GET /api/comments/:contentId or /comment/:videoid
 * Retrieve comments with sorting, pagination, user reactions, and reply counts
 */
export const getallcomment = async (req, res) => {
  try {
    const contentId = req.params.contentId || req.params.videoid;
    const {
      sort = "relevant",
      page = 1,
      limit = 20,
      parentCommentId = null,
    } = req.query;

    if (!contentId || String(contentId).trim().length === 0) {
      return res.status(400).json({ message: "Valid video ID is required." });
    }

    const authUser = getAuthUser(req);
    const currentUserId = authUser?._id || authUser?.id || req.headers["x-user-id"];

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Filter top-level vs threaded
    const videoMatches = [contentId, String(contentId)];
    if (mongoose.Types.ObjectId.isValid(contentId)) {
      videoMatches.push(new mongoose.Types.ObjectId(contentId));
    }

    const query = {
      $or: [{ videoId: { $in: videoMatches } }, { videoid: { $in: videoMatches } }],
      parentCommentId: parentCommentId && mongoose.Types.ObjectId.isValid(parentCommentId) ? new mongoose.Types.ObjectId(parentCommentId) : null,
      moderationStatus: { $ne: "Removed" }, // Exclude admin removed comments
    };

    // Sorting strategies
    let sortOptions = { createdAt: -1 }; // default newest
    if (sort === "oldest") {
      sortOptions = { createdAt: 1 };
    } else if (sort === "likes") {
      sortOptions = { likesCount: -1, createdAt: -1 };
    } else if (sort === "dislikes") {
      sortOptions = { dislikesCount: -1, createdAt: -1 };
    } else if (sort === "relevant") {
      // Relevance combines likes, replies, and recency
      sortOptions = { likesCount: -1, repliesCount: -1, createdAt: -1 };
    }

    const [comments, totalCount] = await Promise.all([
      Comment.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name image lastLoginLocation showLocationInComments")
        .lean(),
      Comment.countDocuments(query),
    ]);

    // Check user's reactions if logged in
    const commentIds = comments.map((c) => c._id);
    let userReactionsMap = new Map();

    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      const userReactions = await CommentReaction.find({
        commentId: { $in: commentIds },
        userId: currentUserId,
      }).lean();

      for (const r of userReactions) {
        userReactionsMap.set(String(r.commentId), r.type);
      }
    }

    // Format comments for response
    const formatted = comments.map((c) => {
      const isDeleted = c.isDeleted === true;
      const userDoc = c.userId || {};
      const userReaction = userReactionsMap.get(String(c._id)) || null;

      // Location privacy check
      let displayLocation = "";
      if (userDoc.showLocationInComments !== false && (c.userLocation || userDoc.lastLoginLocation)) {
        displayLocation = c.userLocation || userDoc.lastLoginLocation || "";
      }

      return {
        _id: c._id,
        videoId: c.videoId || c.videoid,
        videoid: c.videoId || c.videoid,
        userId: userDoc._id || c.userId || c.userid,
        userid: userDoc._id || c.userId || c.userid,
        parentCommentId: c.parentCommentId,
        originalText: isDeleted ? "This comment has been deleted." : c.originalText || c.commentbody,
        commentbody: isDeleted ? "This comment has been deleted." : c.commentbody || c.originalText,
        usercommented: isDeleted ? "[Deleted]" : userDoc.name || c.usercommented || "Anonymous",
        userImage: isDeleted ? "" : userDoc.image || c.userImage || "",
        userLocation: isDeleted ? "" : displayLocation,
        detectedLanguage: c.detectedLanguage || "en",
        isEdited: c.isEdited || false,
        isDeleted,
        likesCount: c.likesCount || 0,
        dislikesCount: c.dislikesCount || 0,
        repliesCount: c.repliesCount || 0,
        version: c.version || 1,
        createdAt: c.createdAt || c.commentedon,
        commentedon: c.createdAt || c.commentedon,
        userReaction,
      };
    });

    // Support both array return (for legacy component compatibility) and envelope
    if (req.originalUrl?.includes("/api/comments") && !req.headers["x-legacy-response"]) {
      return res.status(200).json({
        comments: formatted,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          hasMore: skip + comments.length < totalCount,
        },
      });
    }

    // Legacy direct array return
    return res.status(200).json(formatted);
  } catch (error) {
    console.error("[getallcomment] Error:", error);
    return res.status(500).json({ message: "Internal server error fetching comments" });
  }
};

/**
 * 3. GET /api/comments/:commentId/replies
 * Retrieve threaded replies for a specific parent comment
 */
export const getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const authUser = getAuthUser(req);
    const currentUserId = authUser?._id || authUser?.id || req.headers["x-user-id"];

    const replies = await Comment.find({
      parentCommentId: commentId,
      moderationStatus: { $ne: "Removed" },
    })
      .sort({ createdAt: 1 }) // Chronological for replies
      .populate("userId", "name image lastLoginLocation showLocationInComments")
      .lean();

    const replyIds = replies.map((r) => r._id);
    let userReactionsMap = new Map();

    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      const userReactions = await CommentReaction.find({
        commentId: { $in: replyIds },
        userId: currentUserId,
      }).lean();

      for (const r of userReactions) {
        userReactionsMap.set(String(r.commentId), r.type);
      }
    }

    const formatted = replies.map((c) => {
      const isDeleted = c.isDeleted === true;
      const userDoc = c.userId || {};
      const userReaction = userReactionsMap.get(String(c._id)) || null;

      let displayLocation = "";
      if (userDoc.showLocationInComments !== false && (c.userLocation || userDoc.lastLoginLocation)) {
        displayLocation = c.userLocation || userDoc.lastLoginLocation || "";
      }

      return {
        _id: c._id,
        videoId: c.videoId || c.videoid,
        videoid: c.videoId || c.videoid,
        userId: userDoc._id || c.userId || c.userid,
        userid: userDoc._id || c.userId || c.userid,
        parentCommentId: c.parentCommentId,
        originalText: isDeleted ? "This comment has been deleted." : c.originalText || c.commentbody,
        commentbody: isDeleted ? "This comment has been deleted." : c.commentbody || c.originalText,
        usercommented: isDeleted ? "[Deleted]" : userDoc.name || c.usercommented || "Anonymous",
        userImage: isDeleted ? "" : userDoc.image || c.userImage || "",
        userLocation: isDeleted ? "" : displayLocation,
        detectedLanguage: c.detectedLanguage || "en",
        isEdited: c.isEdited || false,
        isDeleted,
        likesCount: c.likesCount || 0,
        dislikesCount: c.dislikesCount || 0,
        repliesCount: c.repliesCount || 0,
        version: c.version || 1,
        createdAt: c.createdAt || c.commentedon,
        commentedon: c.createdAt || c.commentedon,
        userReaction,
      };
    });

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("[getCommentReplies] Error:", error);
    return res.status(500).json({ message: "Internal server error fetching replies" });
  }
};

/**
 * 4. PUT /api/comments/:commentId or POST /comment/editcomment/:id
 * Edit comment with ownership check, 15-minute time window, and optimistic concurrency
 */
export const editcomment = async (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    const body = req.body || {};
    const newText = body.originalText || body.commentbody || body.text || "";
    const clientVersion = body.version !== undefined ? parseInt(body.version, 10) : null;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const authUser = getAuthUser(req);
    const userId = authUser?._id || authUser?.id || req.headers["x-user-id"] || body.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required to edit comment." });
    }

    const targetComment = await Comment.findById(commentId);
    if (!targetComment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (targetComment.isDeleted) {
      return res.status(400).json({ message: "Deleted comments cannot be edited." });
    }

    // Ownership check (author or admin)
    const isOwner = String(targetComment.userId || targetComment.userid) === String(userId);
    const isAdmin = authUser?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to edit this comment." });
    }

    // Enforce 15-minute edit window (unless admin)
    if (!isAdmin) {
      const now = Date.now();
      const createdAtTime = new Date(targetComment.createdAt).getTime();
      const diffMinutes = (now - createdAtTime) / (60 * 1000);

      if (diffMinutes > EDIT_TIME_LIMIT_MINUTES) {
        return res.status(403).json({
          message: `Comments can only be edited within ${EDIT_TIME_LIMIT_MINUTES} minutes of posting.`,
        });
      }
    }

    // Optimistic concurrency control check
    if (clientVersion !== null && clientVersion !== targetComment.version) {
      return res.status(409).json({
        message: "This comment was modified by another session. Please reload and try again.",
        currentVersion: targetComment.version,
      });
    }

    // Validate new text content
    const validation = await validateCommentSubmission({
      userId,
      userDoc: authUser,
      videoId: targetComment.videoId,
      text: newText,
      parentCommentId: targetComment.parentCommentId,
    });

    if (!validation.isValid) {
      return res.status(validation.status || 400).json({ message: validation.message });
    }

    // Record edit in CommentEditHistory
    await CommentEditHistory.create({
      commentId: targetComment._id,
      userId,
      previousText: targetComment.originalText || targetComment.commentbody || "",
      newText: validation.sanitizedText,
      version: targetComment.version,
    });

    // Update comment
    targetComment.originalText = validation.sanitizedText;
    targetComment.commentbody = validation.sanitizedText;
    targetComment.isEdited = true;
    targetComment.version += 1;
    targetComment.detectedLanguage = detectLanguage(validation.sanitizedText);
    await targetComment.save();

    return res.status(200).json({
      success: true,
      comment: targetComment,
    });
  } catch (error) {
    console.error("[editcomment] Error:", error);
    return res.status(500).json({ message: "Internal server error editing comment" });
  }
};

/**
 * 5. DELETE /api/comments/:commentId or /comment/deletecomment/:id
 * Soft deletion that preserves reply hierarchy and placeholders
 */
export const deletecomment = async (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const authUser = getAuthUser(req);
    const userId = authUser?._id || authUser?.id || req.headers["x-user-id"] || req.body?.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required to delete comment." });
    }

    const targetComment = await Comment.findById(commentId);
    if (!targetComment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const isOwner = String(targetComment.userId || targetComment.userid) === String(userId);
    const isAdmin = authUser?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to delete this comment." });
    }

    // Check if comment has replies
    const hasReplies =
      targetComment.repliesCount > 0 ||
      (await Comment.exists({ parentCommentId: targetComment._id }));

    if (hasReplies) {
      // Soft deletion: Preserve reply hierarchy by replacing with placeholder
      targetComment.isDeleted = true;
      targetComment.deletedAt = new Date();
      targetComment.deletedBy = userId;
      targetComment.originalText = "This comment has been deleted.";
      targetComment.commentbody = "This comment has been deleted.";
      await targetComment.save();
    } else {
      // If it's a leaf node without replies, perform soft deletion
      targetComment.isDeleted = true;
      targetComment.deletedAt = new Date();
      targetComment.deletedBy = userId;
      await targetComment.save();

      // If it was a reply, decrement parent's repliesCount atomically
      if (targetComment.parentCommentId) {
        await Comment.findByIdAndUpdate(targetComment.parentCommentId, {
          $inc: { repliesCount: -1 },
        });
      }
    }

    return res.status(200).json({
      success: true,
      comment: true, // Legacy compatibility
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("[deletecomment] Error:", error);
    return res.status(500).json({ message: "Internal server error deleting comment" });
  }
};

/**
 * 6. POST /api/comments/:commentId/reaction
 * Like or dislike a comment with atomic updates and anti-duplication
 */
export const toggleReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { type } = req.body; // "like" or "dislike"

    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({ message: "Reaction type must be 'like' or 'dislike'." });
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const authUser = getAuthUser(req);
    const userId = authUser?._id || authUser?.id || req.headers["x-user-id"];

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required to react to comments." });
    }

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: "Comment not found or deleted." });
    }

    // Check existing reaction by user
    const existingReaction = await CommentReaction.findOne({
      commentId,
      userId,
    });

    let newReactionState = null;
    let likeDelta = 0;
    let dislikeDelta = 0;

    if (!existingReaction) {
      // First-time reaction
      await CommentReaction.create({
        commentId,
        userId,
        type,
      });
      newReactionState = type;
      if (type === "like") likeDelta = 1;
      if (type === "dislike") dislikeDelta = 1;

      // Notify comment author on like
      if (type === "like" && authUser) {
        notifyCommentLike({ comment, actorUser: authUser }).catch((e) =>
          console.warn("Like notification error:", e.message)
        );
      }
    } else if (existingReaction.type === type) {
      // Clicking same reaction toggles it off
      await CommentReaction.findByIdAndDelete(existingReaction._id);
      newReactionState = null;
      if (type === "like") likeDelta = -1;
      if (type === "dislike") dislikeDelta = -1;
    } else {
      // Switching from like to dislike or vice versa
      existingReaction.type = type;
      await existingReaction.save();
      newReactionState = type;

      if (type === "like") {
        likeDelta = 1;
        dislikeDelta = -1;
        if (authUser) {
          notifyCommentLike({ comment, actorUser: authUser }).catch((e) =>
            console.warn("Like notification error:", e.message)
          );
        }
      } else {
        likeDelta = -1;
        dislikeDelta = 1;
      }
    }

    // Update counts atomically on Comment (guaranteed never negative)
    const updated = await Comment.findByIdAndUpdate(
      commentId,
      {
        $inc: { likesCount: likeDelta, dislikesCount: dislikeDelta },
      },
      { new: true }
    );

    // Ensure non-negative counts
    if (updated.likesCount < 0 || updated.dislikesCount < 0) {
      updated.likesCount = Math.max(0, updated.likesCount);
      updated.dislikesCount = Math.max(0, updated.dislikesCount);
      await updated.save();
    }

    return res.status(200).json({
      success: true,
      userReaction: newReactionState,
      likesCount: Math.max(0, updated.likesCount),
      dislikesCount: Math.max(0, updated.dislikesCount),
    });
  } catch (error) {
    console.error("[toggleReaction] Error:", error);
    return res.status(500).json({ message: "Internal server error updating reaction" });
  }
};

/**
 * 7. POST /api/comments/:commentId/translate
 * Translate a comment with language detection and DB caching
 */
export const translateCommentHandler = async (req, res) => {
  try {
    const { commentId } = req.params;
    let { targetLanguage } = req.body;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const authUser = getAuthUser(req);
    if (!targetLanguage) {
      targetLanguage = authUser?.preferredLanguage || "en";
    }

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: "Comment not found or deleted." });
    }

    const textToTranslate = comment.originalText || comment.commentbody || "";
    if (!textToTranslate.trim()) {
      return res.status(400).json({ message: "Comment has no text to translate." });
    }

    const result = await translateComment({
      commentId: comment._id,
      text: textToTranslate,
      targetLanguage,
      sourceLanguage: comment.detectedLanguage || null,
    });

    return res.status(200).json({
      success: true,
      commentId: comment._id,
      originalText: textToTranslate,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      sourceLanguageName: SUPPORTED_LANGUAGES[result.sourceLanguage] || result.sourceLanguage,
      targetLanguageName: SUPPORTED_LANGUAGES[result.targetLanguage] || result.targetLanguage,
      isCached: result.isCached || false,
    });
  } catch (error) {
    console.error("[translateCommentHandler] Error:", error);
    return res.status(502).json({
      success: false,
      message: error.message || "Failed to translate comment. Please try again.",
      canRetry: true,
    });
  }
};

/**
 * 8. POST /api/comments/:commentId/report
 * User report endpoint with predefined reasons and duplicate report prevention
 */
export const reportComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, description = "" } = req.body;

    const VALID_REASONS = [
      "Spam",
      "Harassment",
      "Offensive Content",
      "Hate Speech",
      "Threats",
      "Misleading Information",
      "Malicious Links",
      "Other",
    ];

    if (!reason || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({
        message: `Please select a valid report reason: ${VALID_REASONS.join(", ")}`,
      });
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const authUser = getAuthUser(req);
    const reporterId = authUser?._id || authUser?.id || req.headers["x-user-id"];

    if (!reporterId || !mongoose.Types.ObjectId.isValid(reporterId)) {
      return res.status(401).json({ message: "Authentication required to report comments." });
    }

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: "Comment not found or deleted." });
    }

    // Check if user already reported this comment (Edge Case #1)
    const existingReport = await CommentReport.findOne({
      commentId,
      reporterId,
    });

    if (existingReport) {
      return res.status(409).json({
        message: "You have already reported this comment. Our moderation team is reviewing it.",
      });
    }

    const report = new CommentReport({
      commentId,
      reporterId,
      reason,
      description: sanitizeHtml(description).substring(0, 1000),
      status: "Pending",
    });

    await report.save();

    // Increment reports count on the comment
    await Comment.findByIdAndUpdate(commentId, {
      $inc: { reportsCount: 1 },
    });

    // NOTE: Section 7 explicit requirement:
    // A comment must NOT be automatically deleted or hidden simply because it receives multiple dislikes or reports!
    // Reports flag comments for administrator review.

    return res.status(201).json({
      success: true,
      message: "Thank you. This comment has been reported and flagged for moderation review.",
      reportId: report._id,
    });
  } catch (error) {
    console.error("[reportComment] Error:", error);
    return res.status(500).json({ message: "Internal server error reporting comment" });
  }
};

/**
 * 9. GET /api/comments/:commentId/history
 * View edit history of a comment
 */
export const getCommentEditHistory = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const history = await CommentEditHistory.find({ commentId })
      .sort({ editedAt: -1 })
      .lean();

    return res.status(200).json(history);
  } catch (error) {
    console.error("[getCommentEditHistory] Error:", error);
    return res.status(500).json({ message: "Internal server error fetching edit history" });
  }
};

/**
 * 10. GET /api/comments/users/mentions?q=...
 * Autocomplete search for @mentions
 */
export const searchMentionUsers = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const queryStr = String(q).trim().toLowerCase();

    if (!queryStr) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      $or: [
        { name: { $regex: queryStr, $options: "i" } },
        { channelname: { $regex: queryStr, $options: "i" } },
      ],
    })
      .select("_id name channelname image")
      .limit(8)
      .lean();

    const formatted = users.map((u) => ({
      _id: u._id,
      name: u.name,
      channelname: u.channelname || u.name?.replace(/\s+/g, "").toLowerCase(),
      image: u.image || "",
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("[searchMentionUsers] Error:", error);
    return res.status(500).json({ message: "Internal server error searching users" });
  }
};

/**
 * 11. GET /api/comments/captcha/challenge
 * Generate a CAPTCHA challenge for suspicious or rate-limited sessions
 */
export const getCaptchaChallenge = (req, res) => {
  try {
    const challenge = generateCaptchaChallenge();
    return res.status(200).json(challenge);
  } catch (error) {
    console.error("[getCaptchaChallenge] Error:", error);
    return res.status(500).json({ message: "Failed to generate CAPTCHA challenge" });
  }
};
