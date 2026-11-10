import mongoose from "mongoose";

const otpChallengeSchema = new mongoose.Schema(
  {
    challengeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
    },
    channel: {
      type: String,
      enum: ["email", "sms"],
      default: "email",
    },
    otpHash: {
      type: String,
      required: true,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    lastResentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "EXPIRED", "FAILED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    deviceMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: "",
    },
    loginEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "login_event",
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

otpChallengeSchema.index({ challengeId: 1, status: 1 });
otpChallengeSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.model("otp_challenge", otpChallengeSchema);
