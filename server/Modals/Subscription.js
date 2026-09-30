import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["Free", "Bronze", "Silver", "Gold"],
      default: "Free",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null, // Null means perpetual for Free, or specific date for paid tiers
    },
    registeredDevices: [
      {
        deviceId: { type: String, required: true },
        deviceName: { type: String },
        registeredAt: { type: Date, default: Date.now },
        lastUsedAt: { type: Date, default: Date.now },
      },
    ],
    history: [
      {
        plan: { type: String },
        action: { type: String, enum: ["created", "upgraded", "downgraded", "cancelled", "expired"] },
        timestamp: { type: Date, default: Date.now },
        details: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helper method to check if subscription is currently valid
subscriptionSchema.methods.isActive = function () {
  if (this.status !== "active") return false;
  if (!this.endDate) return true; // Perpetual Free plan
  return new Date(this.endDate) > new Date();
};

export default mongoose.model("subscription", subscriptionSchema);
