import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subscription",
    },
    subscriptionPlan: {
      type: String,
      enum: ["Free", "Bronze", "Silver", "Gold"],
      required: true,
      default: "Free",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "AUTHORIZED",
        "STARTED",
        "IN_PROGRESS",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
      ],
      default: "AUTHORIZED",
      index: true,
    },
    fileSize: {
      type: String,
      default: "Unknown",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    deviceInfo: {
      type: String,
      default: "",
    },
    deviceId: {
      type: String,
      default: "",
    },
    quotaConsumed: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    tokenExpiresAt: {
      type: Date,
      index: true,
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal audit & quota querying
downloadSchema.index({ userId: 1, createdAt: -1 });
downloadSchema.index({ userId: 1, videoId: 1, createdAt: -1 });
downloadSchema.index({ userId: 1, quotaConsumed: 1, createdAt: -1 });
downloadSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("download", downloadSchema);
