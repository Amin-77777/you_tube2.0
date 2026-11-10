import mongoose from "mongoose";

const loginEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    authMethod: {
      type: String,
      default: "email",
    },
    status: {
      type: String,
      enum: ["Success", "Failed", "OTP Required", "OTP Failed", "Blocked"],
      required: true,
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    ipClassification: {
      type: String,
      enum: ["IPv4", "IPv6", "Unknown"],
      default: "IPv4",
    },
    location: {
      city: { type: String, default: "Unknown" },
      region: { type: String, default: "Unknown" },
      country: { type: String, default: "Unknown" },
      timezone: { type: String, default: "Asia/Kolkata" },
      approximate: { type: Boolean, default: true },
    },
    browser: {
      name: { type: String, default: "Unknown" },
      version: { type: String, default: "" },
      family: { type: String, default: "Unknown" },
    },
    os: {
      name: { type: String, default: "Unknown" },
      version: { type: String, default: "" },
    },
    device: {
      type: {
        type: String,
        enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
        default: "Unknown",
      },
      model: { type: String, default: "" },
      name: { type: String, default: "" },
      deviceId: { type: String, default: "" },
      isTrusted: { type: Boolean, default: false },
      environmentChanged: { type: Boolean, default: false },
    },
    userAgent: {
      type: String,
      default: "",
    },
    riskIndicators: {
      type: [String],
      default: [],
    },
    otpRequired: {
      type: Boolean,
      default: false,
    },
    otpSucceeded: {
      type: Boolean,
      default: false,
    },
    verificationMethod: {
      type: String,
      enum: ["email", "sms", "none"],
      default: "none",
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "session",
      default: null,
    },
    trustedDeviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "trusted_device",
      default: null,
    },
    otpRequestedAt: { type: Date, default: null },
    otpVerifiedAt: { type: Date, default: null },
    authenticatedAt: { type: Date, default: null },
    logoutAt: { type: Date, default: null },
  },
  {
    timestamps: true, // creates createdAt and updatedAt in UTC
  }
);

loginEventSchema.index({ userId: 1, createdAt: -1 });
loginEventSchema.index({ ip: 1, createdAt: -1 });
loginEventSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("login_event", loginEventSchema);
