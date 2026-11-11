import mongoose from "mongoose";

const commentReportSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        "Spam",
        "Harassment",
        "Offensive Content",
        "Hate Speech",
        "Threats",
        "Misleading Information",
        "Malicious Links",
        "Other",
      ],
      required: true,
    },
    description: {
      type: String,
      default: "",
      maxLength: 1000,
    },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Resolved", "Dismissed"],
      default: "Pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reports from the same user for the same comment
commentReportSchema.index({ commentId: 1, reporterId: 1 }, { unique: true });
commentReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("CommentReport", commentReportSchema);
