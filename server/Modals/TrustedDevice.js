import mongoose from "mongoose";

const trustedDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      default: "",
      index: true,
    },
    deviceName: {
      type: String,
      default: "Unknown Device",
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
    location: {
      city: { type: String, default: "Unknown" },
      region: { type: String, default: "Unknown" },
      country: { type: String, default: "Unknown" },
    },
    lastIp: {
      type: String,
      default: "",
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
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

trustedDeviceSchema.index({ userId: 1, revoked: 1, expiresAt: 1 });

export default mongoose.model("trusted_device", trustedDeviceSchema);
