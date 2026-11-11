import Notification from "../Modals/Notification.js";
import User from "../Modals/Auth.js";
import CommentMention from "../Modals/CommentMention.js";

/**
 * Sends notification when a user replies to a comment
 */
export async function notifyCommentReply({ parentComment, replyComment, actorUser }) {
  if (!parentComment || !replyComment || !actorUser) return;
  const recipientId = parentComment.userId || parentComment.userid;

  // Don't notify oneself
  if (String(recipientId) === String(actorUser._id || actorUser.id)) {
    return;
  }

  try {
    const recipient = await User.findById(recipientId).select("email notificationPreferences").lean();
    if (!recipient) return;

    if (recipient.notificationPreferences?.replies === false) {
      return;
    }

    // Check for recent unread duplicate
    const existing = await Notification.findOne({
      userId: recipient._id,
      actorId: actorUser._id,
      commentId: replyComment._id,
      type: "COMMENT_REPLY",
      read: false,
    }).lean();

    if (existing) return;

    const preview = replyComment.originalText || replyComment.commentbody || "";
    const truncatedPreview = preview.length > 120 ? preview.substring(0, 117) + "..." : preview;

    await Notification.create({
      userId: recipient._id,
      userEmail: recipient.email || "",
      type: "COMMENT_REPLY",
      title: `${actorUser.name || "Someone"} replied to your comment`,
      subject: "New reply on YourTube",
      previewText: truncatedPreview,
      htmlContent: `<p><strong>${actorUser.name || "Someone"}</strong> replied to your comment: "${truncatedPreview}"</p>`,
      actorId: actorUser._id,
      actorName: actorUser.name || "User",
      actorImage: actorUser.image || "",
      commentId: replyComment._id,
      videoId: replyComment.videoId || replyComment.videoid,
      link: `/watch/${replyComment.videoId || replyComment.videoid}`,
      read: false,
      deliveryStatus: "IN_APP",
      metadata: {
        parentCommentId: parentComment._id,
        replyCommentId: replyComment._id,
      },
    });
  } catch (err) {
    console.warn("Failed to create reply notification:", err.message);
  }
}

/**
 * Sends notification when a user likes a comment
 */
export async function notifyCommentLike({ comment, actorUser }) {
  if (!comment || !actorUser) return;
  const recipientId = comment.userId || comment.userid;

  if (String(recipientId) === String(actorUser._id || actorUser.id)) {
    return;
  }

  try {
    const recipient = await User.findById(recipientId).select("email notificationPreferences").lean();
    if (!recipient) return;

    if (recipient.notificationPreferences?.likes === false) {
      return;
    }

    // Check if notification already exists
    const existing = await Notification.findOne({
      userId: recipient._id,
      actorId: actorUser._id,
      commentId: comment._id,
      type: "COMMENT_LIKE",
    }).lean();

    if (existing) return;

    const preview = comment.originalText || comment.commentbody || "";
    const truncatedPreview = preview.length > 100 ? preview.substring(0, 97) + "..." : preview;

    await Notification.create({
      userId: recipient._id,
      userEmail: recipient.email || "",
      type: "COMMENT_LIKE",
      title: `${actorUser.name || "Someone"} liked your comment`,
      subject: "New like on your comment",
      previewText: `Liked: "${truncatedPreview}"`,
      htmlContent: `<p><strong>${actorUser.name || "Someone"}</strong> liked your comment: "${truncatedPreview}"</p>`,
      actorId: actorUser._id,
      actorName: actorUser.name || "User",
      actorImage: actorUser.image || "",
      commentId: comment._id,
      videoId: comment.videoId || comment.videoid,
      link: `/watch/${comment.videoId || comment.videoid}`,
      read: false,
      deliveryStatus: "IN_APP",
    });
  } catch (err) {
    console.warn("Failed to create like notification:", err.message);
  }
}

/**
 * Extracts @mentions and notifies mentioned users
 */
export async function notifyCommentMentions({ comment, text, actorUser }) {
  if (!comment || !text || !actorUser) return;

  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  if (!matches || matches.length === 0) return;

  const usernames = Array.from(new Set(matches.map((m) => m[1])));

  for (const rawUsername of usernames) {
    try {
      // Find matching user by name or channelname (case-insensitive)
      const user = await User.findOne({
        $or: [
          { channelname: { $regex: new RegExp(`^${rawUsername}$`, "i") } },
          { name: { $regex: new RegExp(`^${rawUsername}$`, "i") } },
        ],
      })
        .select("_id name email notificationPreferences")
        .lean();

      if (!user) continue;
      if (String(user._id) === String(actorUser._id || actorUser.id)) continue;

      if (user.notificationPreferences?.mentions === false) {
        continue;
      }

      // Record mention
      await CommentMention.create({
        commentId: comment._id,
        mentionedUserId: user._id,
        mentionedUsername: rawUsername,
        notified: true,
      });

      const preview = text.length > 120 ? text.substring(0, 117) + "..." : text;

      await Notification.create({
        userId: user._id,
        userEmail: user.email || "",
        type: "COMMENT_MENTION",
        title: `${actorUser.name || "Someone"} mentioned you in a comment`,
        subject: "You were mentioned in a comment",
        previewText: preview,
        htmlContent: `<p><strong>${actorUser.name || "Someone"}</strong> mentioned you: "${preview}"</p>`,
        actorId: actorUser._id,
        actorName: actorUser.name || "User",
        actorImage: actorUser.image || "",
        commentId: comment._id,
        videoId: comment.videoId || comment.videoid,
        link: `/watch/${comment.videoId || comment.videoid}`,
        read: false,
        deliveryStatus: "IN_APP",
      });
    } catch (err) {
      console.warn("Failed to notify mentioned user:", err.message);
    }
  }
}

/**
 * Notifies comment author about administrative moderation decisions
 */
export async function notifyModerationAction({ comment, action, reason = "", adminUser }) {
  if (!comment) return;
  const recipientId = comment.userId || comment.userid;
  if (!recipientId) return;

  try {
    const recipient = await User.findById(recipientId).select("email notificationPreferences").lean();
    if (!recipient) return;

    if (recipient.notificationPreferences?.moderation === false) {
      return;
    }

    const title =
      action === "REMOVE"
        ? "Your comment was removed by moderators"
        : action === "RESTORE"
        ? "Your comment was restored by moderators"
        : `Moderation update on your comment`;

    const description =
      action === "REMOVE"
        ? `Your comment was removed for community guidelines: ${reason || "Unspecified policy violation"}.`
        : `Your previously removed comment has been approved and restored.`;

    await Notification.create({
      userId: recipient._id,
      userEmail: recipient.email || "",
      type: "COMMENT_MODERATION",
      title,
      subject: title,
      previewText: description,
      htmlContent: `<p>${description}</p>`,
      commentId: comment._id,
      videoId: comment.videoId || comment.videoid,
      link: `/watch/${comment.videoId || comment.videoid}`,
      read: false,
      deliveryStatus: "IN_APP",
      metadata: { action, reason },
    });
  } catch (err) {
    console.warn("Failed to create moderation notification:", err.message);
  }
}
