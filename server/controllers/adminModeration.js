import mongoose from "mongoose";
import Comment from "../Modals/comment.js";
import CommentReport from "../Modals/CommentReport.js";
import CommentModerationLog from "../Modals/CommentModerationLog.js";
import CommentEditHistory from "../Modals/CommentEditHistory.js";
import User from "../Modals/Auth.js";
import { notifyModerationAction } from "../services/commentNotificationService.js";

/**
 * GET /api/admin/comments
 * View all comments with filtering by status, user, date, search
 */
export const getAdminComments = async (req, res) => {
  try {
    const {
      status = "All",
      userId,
      search = "",
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (status && status !== "All") {
      filter.moderationStatus = status;
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    if (search.trim()) {
      filter.$or = [
        { originalText: { $regex: search.trim(), $options: "i" } },
        { usercommented: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ reportsCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name email image role isCommentBanned commentSuspendedUntil")
        .lean(),
      Comment.countDocuments(filter),
    ]);

    return res.status(200).json({
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[getAdminComments] Error:", error);
    return res.status(500).json({ message: "Failed to fetch admin comments" });
  }
};

/**
 * GET /api/admin/comment-reports
 * View reported comments and filter by reason, status, user, date
 */
export const getAdminCommentReports = async (req, res) => {
  try {
    const {
      reason = "All",
      status = "All",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (reason && reason !== "All") {
      filter.reason = reason;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      CommentReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("commentId")
        .populate("reporterId", "name email image")
        .populate("reviewedBy", "name email")
        .lean(),
      CommentReport.countDocuments(filter),
    ]);

    return res.status(200).json({
      reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[getAdminCommentReports] Error:", error);
    return res.status(500).json({ message: "Failed to fetch comment reports" });
  }
};

/**
 * PUT /api/admin/comments/:commentId/moderate
 * Moderate comment: APPROVE, REMOVE, RESTORE, or FLAG with audit log
 */
export const moderateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { action, reason = "", notes = "" } = req.body;
    const adminUser = req.user;

    const VALID_ACTIONS = ["APPROVE", "REMOVE", "RESTORE", "FLAG"];
    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        message: `Action must be one of: ${VALID_ACTIONS.join(", ")}`,
      });
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const previousStatus = comment.moderationStatus;
    let newStatus = previousStatus;

    if (action === "APPROVE") {
      newStatus = "Approved";
      comment.moderationStatus = "Approved";
      comment.moderationReason = "";
      // If it was previously removed, un-delete it
      if (comment.isDeleted && comment.originalText !== "This comment has been deleted.") {
        comment.isDeleted = false;
        comment.deletedAt = null;
      }
    } else if (action === "REMOVE") {
      newStatus = "Removed";
      comment.moderationStatus = "Removed";
      comment.moderationReason = reason || "Violates community guidelines";
      comment.isDeleted = true;
      comment.deletedAt = new Date();
      comment.deletedBy = adminUser?._id;
    } else if (action === "RESTORE") {
      newStatus = "Approved";
      comment.moderationStatus = "Approved";
      comment.moderationReason = "";
      comment.isDeleted = false;
      comment.deletedAt = null;
    } else if (action === "FLAG") {
      newStatus = "Flagged";
      comment.moderationStatus = "Flagged";
      comment.moderationReason = reason;
    }

    await comment.save();

    // Create Audit Log Entry
    const adminLog = await CommentModerationLog.create({
      adminId: adminUser?._id || new mongoose.Types.ObjectId(),
      commentId: comment._id,
      action,
      previousStatus,
      newStatus,
      reason,
      notes,
      timestamp: new Date(),
    });

    // If approving or removing, mark pending reports as resolved
    if (action === "APPROVE" || action === "REMOVE") {
      await CommentReport.updateMany(
        { commentId: comment._id, status: "Pending" },
        {
          $set: {
            status: action === "APPROVE" ? "Dismissed" : "Resolved",
            reviewedBy: adminUser?._id,
            reviewedAt: new Date(),
            adminNotes: notes || reason,
          },
        }
      );
    }

    // Send notification to author
    notifyModerationAction({
      comment,
      action,
      reason,
      adminUser,
    }).catch((e) => console.warn("Moderation notification error:", e.message));

    return res.status(200).json({
      success: true,
      comment,
      moderationLog: adminLog,
      message: `Comment ${action.toLowerCase()}d successfully`,
    });
  } catch (error) {
    console.error("[moderateComment] Error:", error);
    return res.status(500).json({ message: "Internal server error moderating comment" });
  }
};

/**
 * GET /api/admin/comments/:commentId/history
 * View complete moderation and edit history for a comment
 */
export const getCommentFullHistory = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Valid comment ID is required." });
    }

    const [comment, editHistory, moderationLogs, reports] = await Promise.all([
      Comment.findById(commentId).populate("userId", "name email image").lean(),
      CommentEditHistory.find({ commentId }).sort({ editedAt: -1 }).lean(),
      CommentModerationLog.find({ commentId })
        .sort({ timestamp: -1 })
        .populate("adminId", "name email")
        .lean(),
      CommentReport.find({ commentId })
        .sort({ createdAt: -1 })
        .populate("reporterId", "name email")
        .lean(),
    ]);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    return res.status(200).json({
      comment,
      editHistory,
      moderationLogs,
      reports,
    });
  } catch (error) {
    console.error("[getCommentFullHistory] Error:", error);
    return res.status(500).json({ message: "Failed to fetch comment history" });
  }
};

/**
 * POST /api/admin/users/:userId/suspend-comments
 * Suspend commenting privileges for a user
 */
export const suspendUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { durationHours = 24, reason = "", permanent = false } = req.body;
    const adminUser = req.user;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Valid user ID is required." });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (permanent) {
      targetUser.isCommentBanned = true;
      targetUser.commentSuspendedUntil = null;
    } else {
      const hours = parseInt(durationHours, 10) || 24;
      targetUser.isCommentBanned = false;
      targetUser.commentSuspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    await targetUser.save();

    // Log administrative action
    await CommentModerationLog.create({
      adminId: adminUser?._id || new mongoose.Types.ObjectId(),
      commentId: new mongoose.Types.ObjectId(), // Placeholder for user-level action
      action: "SUSPEND_USER",
      previousStatus: "Active",
      newStatus: permanent ? "Permanent Ban" : `Suspended ${durationHours}h`,
      reason,
      notes: `Suspended by admin`,
      targetUserId: targetUser._id,
      timestamp: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: permanent
        ? "User commenting privileges permanently suspended."
        : `User commenting privileges suspended until ${targetUser.commentSuspendedUntil.toLocaleString()}.`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        isCommentBanned: targetUser.isCommentBanned,
        commentSuspendedUntil: targetUser.commentSuspendedUntil,
      },
    });
  } catch (error) {
    console.error("[suspendUserComments] Error:", error);
    return res.status(500).json({ message: "Failed to suspend user" });
  }
};

/**
 * POST /api/admin/users/:userId/unsuspend-comments
 * Restore user commenting privileges
 */
export const unsuspendUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = req.user;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Valid user ID is required." });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    targetUser.isCommentBanned = false;
    targetUser.commentSuspendedUntil = null;
    await targetUser.save();

    await CommentModerationLog.create({
      adminId: adminUser?._id || new mongoose.Types.ObjectId(),
      commentId: new mongoose.Types.ObjectId(),
      action: "UNSUSPEND_USER",
      previousStatus: "Suspended",
      newStatus: "Active",
      reason: "Administrative reinstatement",
      targetUserId: targetUser._id,
      timestamp: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "User commenting privileges restored successfully.",
    });
  } catch (error) {
    console.error("[unsuspendUserComments] Error:", error);
    return res.status(500).json({ message: "Failed to restore user privileges" });
  }
};

/**
 * GET /api/admin/moderation-logs
 * Fetch global moderation audit trail
 */
export const getModerationAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      CommentModerationLog.find()
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("adminId", "name email")
        .populate("targetUserId", "name email")
        .lean(),
      CommentModerationLog.countDocuments(),
    ]);

    return res.status(200).json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[getModerationAuditLogs] Error:", error);
    return res.status(500).json({ message: "Failed to fetch moderation logs" });
  }
};

/**
 * GET /api/admin/users
 * Search users for admin suspension management
 */
export const searchUsersForAdmin = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const queryStr = String(q).trim();
    const filter = {};
    if (queryStr) {
      filter.$or = [
        { name: { $regex: queryStr, $options: "i" } },
        { email: { $regex: queryStr, $options: "i" } },
      ];
    }
    const users = await User.find(filter)
      .select("_id name email image role isCommentBanned commentSuspendedUntil")
      .limit(30)
      .lean();
    return res.status(200).json(users);
  } catch (error) {
    console.error("[searchUsersForAdmin] Error:", error);
    return res.status(500).json({ message: "Failed to search users" });
  }
};
