import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      default: "",
      index: true,
    },
    type: {
      type: String,
      enum: [
        "SUBSCRIPTION_PURCHASE",
        "SUBSCRIPTION_CANCEL",
        "SYSTEM",
        "COMMENT_REPLY",
        "COMMENT_LIKE",
        "COMMENT_MENTION",
        "COMMENT_MODERATION",
      ],
      default: "SYSTEM",
    },
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      default: "",
    },
    previewText: {
      type: String,
      default: "",
    },
    htmlContent: {
      type: String,
      default: "",
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    actorName: {
      type: String,
      default: "",
    },
    actorImage: {
      type: String,
      default: "",
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      default: null,
    },
    link: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveryStatus: {
      type: String,
      enum: ["DELIVERED_SMTP", "SIMULATED", "FAILED", "IN_APP"],
      default: "IN_APP",
    },
    deliveryDetails: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
