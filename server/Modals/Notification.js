import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["SUBSCRIPTION_PURCHASE", "SUBSCRIPTION_CANCEL", "SYSTEM"],
      default: "SUBSCRIPTION_PURCHASE",
    },
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    previewText: {
      type: String,
      default: "",
    },
    htmlContent: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    deliveryStatus: {
      type: String,
      enum: ["DELIVERED_SMTP", "SIMULATED", "FAILED"],
      default: "SIMULATED",
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

export default mongoose.model("Notification", notificationSchema);
