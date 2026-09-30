import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
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
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subscription",
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "payment_transaction",
    },
    userName: {
      type: String,
      default: "Valued Subscriber",
    },
    userEmail: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    planTier: {
      type: Number,
      default: 1,
    },
    duration: {
      type: String,
      default: "monthly",
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    paymentId: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["PAID", "REFUNDED", "CANCELLED"],
      default: "PAID",
      index: true,
    },
    emailDeliveryStatus: {
      type: String,
      default: "generated",
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("invoice", invoiceSchema);
