import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    jwtId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenHash: {
      type: String,
      default: "",
    },
    deviceId: {
      type: String,
      default: "",
    },
    trustedDeviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "trusted_device",
      default: null,
    },
    deviceName: {
      type: String,
      default: "Web Browser",
    },
    browser: {
      name: { type: String, default: "Unknown" },
      version: { type: String, default: "" },
    },
    os: {
      name: { type: String, default: "Unknown" },
      version: { type: String, default: "" },
    },
    deviceType: {
      type: String,
      enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
      default: "Desktop",
    },
    ip: {
      type: String,
      default: "",
    },
    location: {
      city: { type: String, default: "Unknown" },
      region: { type: String, default: "Unknown" },
      country: { type: String, default: "Unknown" },
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, revoked: 1, expiresAt: 1 });

export default mongoose.model("session", sessionSchema);
