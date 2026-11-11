import mongoose from "mongoose";

const commentTranslationSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
      index: true,
    },
    sourceLanguage: {
      type: String,
      required: true,
      default: "auto",
    },
    targetLanguage: {
      type: String,
      required: true,
      index: true,
    },
    translatedText: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      default: "integrated",
    },
    cachedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

commentTranslationSchema.index({ commentId: 1, targetLanguage: 1 }, { unique: true });

export default mongoose.model("CommentTranslation", commentTranslationSchema);
