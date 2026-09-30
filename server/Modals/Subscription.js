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
    duration: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: [
        "FREE",
        "ACTIVE",
        "PENDING",
        "PAYMENT_FAILED",
        "CANCELLED",
        "EXPIRED",
        "REFUNDED",
        "active",
        "expired",
        "cancelled",
      ],
      default: "ACTIVE",
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    renewalDate: {
      type: Date,
      default: null,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    lastPaymentId: {
      type: String,
    },
    lastOrderId: {
      type: String,
    },
    invoiceNumber: {
      type: String,
    },
    dailyWatchTimeMinutesUsed: {
      type: Number,
      default: 0,
    },
    dailyWatchTimeLastDate: {
      type: Date,
      default: Date.now,
    },
    scheduledDowngrade: {
      targetPlan: { type: String },
      effectiveDate: { type: Date },
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
        action: {
          type: String,
          enum: [
            "created",
            "upgraded",
            "downgraded",
            "cancelled",
            "expired",
            "renewed",
            "payment_failed",
          ],
        },
        timestamp: { type: Date, default: Date.now },
        details: { type: String },
        paymentId: { type: String },
        orderId: { type: String },
        invoiceNumber: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to verify if active paid tier is still valid
subscriptionSchema.methods.isActive = function () {
  const normStatus = (this.status || "").toUpperCase();
  if (normStatus !== "ACTIVE") return false;
  const expiry = this.expiryDate || this.endDate;
  if (!expiry) return true; // Perpetual Free
  return new Date(expiry) > new Date();
};

export default mongoose.model("subscription", subscriptionSchema);
