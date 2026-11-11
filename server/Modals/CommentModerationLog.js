import mongoose from "mongoose";

const commentModerationLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "APPROVE",
        "REMOVE",
        "RESTORE",
        "FLAG",
        "SUSPEND_USER",
        "UNSUSPEND_USER",
        "RESOLVE_REPORT",
        "DISMISS_REPORT",
      ],
      required: true,
    },
    previousStatus: {
      type: String,
      default: "",
    },
    newStatus: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

commentModerationLogSchema.index({ commentId: 1, timestamp: -1 });
commentModerationLogSchema.index({ adminId: 1, timestamp: -1 });

export default mongoose.model("CommentModerationLog", commentModerationLogSchema);
