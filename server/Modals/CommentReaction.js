import mongoose from "mongoose";

const commentReactionSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["like", "dislike"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent a user from liking or disliking the same comment multiple times
commentReactionSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export default mongoose.model("CommentReaction", commentReactionSchema);
