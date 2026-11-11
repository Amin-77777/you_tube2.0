import mongoose from "mongoose";

const commentMentionSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
      index: true,
    },
    mentionedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    mentionedUsername: {
      type: String,
      required: true,
    },
    notified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

commentMentionSchema.index({ commentId: 1, mentionedUserId: 1 });

export default mongoose.model("CommentMention", commentMentionSchema);
