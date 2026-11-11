import mongoose from "mongoose";

const commentEditHistorySchema = new mongoose.Schema(
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
    },
    previousText: {
      type: String,
      required: true,
    },
    newText: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

commentEditHistorySchema.index({ commentId: 1, editedAt: -1 });

export default mongoose.model("CommentEditHistory", commentEditHistorySchema);
