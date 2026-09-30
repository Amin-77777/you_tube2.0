import crypto from "crypto";
import Subscription from "../Modals/Subscription.js";
import PaymentTransaction from "../Modals/PaymentTransaction.js";
import Invoice from "../Modals/Invoice.js";
import User from "../Modals/Auth.js";
import Video from "../Modals/video.js";
import {
  SUBSCRIPTION_CONFIG,
  calculatePlanPrice,
} from "../config/subscriptionPlans.js";
import {
  canWatchVideo,
  getStreamingQuality,
} from "../middleware/accessControl.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayKeyId,
} from "../services/razorpayService.js";
import { sendSubscriptionConfirmationEmail } from "../services/emailService.js";
import { getOrCreateUserSubscription } from "./subscription.js";

function generateInvoiceNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `INV-${new Date().getFullYear()}-${timestamp}-${random}`;
}

/**
 * Controller: POST /subscription/create-order
 * Validates plan & duration server-side and creates Razorpay test order
 */
export const createOrder = async (req, res) => {
  const { planId, duration = "monthly" } = req.body;
  const userId = req.userId;

  if (!planId || !SUBSCRIPTION_CONFIG.PLANS[planId]) {
    return res.status(400).json({ message: "Invalid subscription plan selected" });
  }

  if (planId === "Free") {
    return res.status(400).json({ message: "Free plan does not require payment" });
  }

  try {
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User account not found" });
    }

    // 1. Calculate amount strictly SERVER-SIDE
    const priceCalc = calculatePlanPrice(planId, duration);

    // 2. Create Razorpay Order
    const receipt = `rcpt_${userId.toString().slice(-6)}_${Date.now().toString(36)}`;
    const razorpayOrder = await createRazorpayOrder({
      amountInPaise: priceCalc.amountInPaise,
      currency: priceCalc.currency,
      receipt,
      notes: {
        userId: userId.toString(),
        planId,
        duration: priceCalc.duration.id,
      },
    });

    // 3. Create Pending Transaction Record
    const transaction = await PaymentTransaction.create({
      userId,
      razorpayOrderId: razorpayOrder.id,
      plan: planId,
      duration: priceCalc.duration.id,
      amount: priceCalc.amountInPaise,
      currency: priceCalc.currency,
      status: "PENDING",
      paymentMethod: "razorpay_test",
    });

    console.log(
      `[Payment Order] Created Razorpay order ${razorpayOrder.id} for user ${userId} (${planId} - ${priceCalc.duration.name}: ${priceCalc.currency} ${priceCalc.amount})`
    );

    return res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: priceCalc.amount,
      amountInPaise: priceCalc.amountInPaise,
      currency: priceCalc.currency,
      keyId: razorpayOrder.keyId || getRazorpayKeyId(),
      plan: priceCalc.plan.name,
      planId,
      duration: priceCalc.duration.id,
      durationName: priceCalc.duration.name,
      user: {
        name: userDoc.name || "Subscriber",
        email: userDoc.email,
      },
      isTestSimulation: razorpayOrder.isTestSimulation || false,
    });
  } catch (error) {
    console.error("[Payment Order] Error:", error.message);
    return res.status(500).json({ message: "Failed to create payment order", error: error.message });
  }
};

/**
 * Controller: POST /subscription/verify-payment
 * Server-side signature validation, duplicate protection, and subscription activation
 */
export const verifyPayment = async (req, res) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    planId,
    duration = "monthly",
  } = req.body;
  const userId = req.userId;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({
      success: false,
      message: "Missing required payment verification parameters.",
    });
  }

  try {
    // 1. Duplicate Payment Check / Idempotency
    const existingPayment = await PaymentTransaction.findOne({
      razorpayPaymentId,
      status: "SUCCESS",
    });
    if (existingPayment) {
      return res.status(200).json({
        success: true,
        alreadyProcessed: true,
        message: "Payment has already been verified and processed.",
      });
    }

    // 2. Find Pending Transaction
    const transaction = await PaymentTransaction.findOne({
      razorpayOrderId,
      userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Original order record not found.",
      });
    }

    // 3. Server-side Signature Verification
    const isValidSignature = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValidSignature) {
      transaction.status = "FAILED";
      transaction.failureReason = "Invalid Razorpay payment signature";
      transaction.razorpayPaymentId = razorpayPaymentId;
      transaction.razorpaySignature = razorpaySignature;
      await transaction.save();

      console.warn(`[Payment Verify] Signature mismatch for order ${razorpayOrderId}`);
      return res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid signature.",
      });
    }

    // 4. Update Transaction Status
    transaction.status = "SUCCESS";
    transaction.razorpayPaymentId = razorpayPaymentId;
    transaction.razorpaySignature = razorpaySignature;
    transaction.verifiedAt = new Date();
    await transaction.save();

    // 5. Activate User Subscription
    const targetPlan = planId || transaction.plan;
    const targetDuration = duration || transaction.duration || "monthly";
    const durationConfig = SUBSCRIPTION_CONFIG.DURATIONS[targetDuration] || SUBSCRIPTION_CONFIG.DURATIONS.monthly;
    const durationDays = durationConfig.days || 30;

    const sub = await getOrCreateUserSubscription(userId);
    const prevPlan = sub.plan;
    const startDate = new Date();
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const invoiceNum = generateInvoiceNumber();

    sub.plan = targetPlan;
    sub.duration = targetDuration;
    sub.status = "ACTIVE";
    sub.startDate = startDate;
    sub.endDate = expiryDate;
    sub.expiryDate = expiryDate;
    sub.renewalDate = expiryDate;
    sub.autoRenew = true;
    sub.amount = transaction.amount;
    sub.currency = transaction.currency;
    sub.lastPaymentId = razorpayPaymentId;
    sub.lastOrderId = razorpayOrderId;
    sub.invoiceNumber = invoiceNum;
    sub.scheduledDowngrade = null;

    sub.history.push({
      plan: targetPlan,
      action: prevPlan === targetPlan ? "renewed" : "upgraded",
      timestamp: new Date(),
      details: `${targetPlan} plan (${targetDuration}) activated via Razorpay payment`,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      invoiceNumber: invoiceNum,
    });

    await sub.save();
    transaction.subscriptionId = sub._id;
    await transaction.save();

    // 6. Generate Invoice Record
    const userDoc = await User.findById(userId);
    const invoice = await Invoice.create({
      invoiceNumber: invoiceNum,
      userId,
      subscriptionId: sub._id,
      transactionId: transaction._id,
      userName: userDoc?.name || "Subscriber",
      userEmail: userDoc?.email || "",
      planName: targetPlan,
      planTier: SUBSCRIPTION_CONFIG.PLANS[targetPlan]?.tier || 1,
      duration: targetDuration,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      paymentDate: new Date(),
      startDate,
      expiryDate,
      status: "PAID",
    });

    // 7. Send Asynchronous Confirmation Email
    sendSubscriptionConfirmationEmail({
      toEmail: userDoc?.email,
      userName: userDoc?.name,
      planName: targetPlan,
      planTier: SUBSCRIPTION_CONFIG.PLANS[targetPlan]?.tier || 1,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      invoiceNumber: invoiceNum,
      startDate,
      expiryDate,
      features: SUBSCRIPTION_CONFIG.PLANS[targetPlan]?.features || [],
    }).catch((emailErr) => console.warn("[Payment Verify] Email sending warning:", emailErr.message));

    console.log(
      `[Payment Verify] SUCCESS! Subscription for user ${userId} activated on ${targetPlan} until ${expiryDate.toISOString()}`
    );

    return res.status(200).json({
      success: true,
      message: `Congratulations! Your ${targetPlan} subscription is now active.`,
      subscription: {
        id: sub._id,
        plan: sub.plan,
        duration: sub.duration,
        status: sub.status,
        startDate: sub.startDate,
        expiryDate: sub.expiryDate,
        autoRenew: sub.autoRenew,
        features: SUBSCRIPTION_CONFIG.PLANS[targetPlan]?.features,
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        paymentDate: invoice.paymentDate,
      },
    });
  } catch (error) {
    console.error("[Payment Verify] Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error during payment verification.",
      error: error.message,
    });
  }
};

/**
 * Controller: POST /subscription/cancel
 * Cancels auto-renewal while keeping paid benefits active until expiryDate
 */
export const cancelSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.userId });
    if (!sub || sub.plan === "Free") {
      return res.status(400).json({ message: "No active paid subscription to cancel" });
    }

    sub.autoRenew = false;
    sub.history.push({
      plan: sub.plan,
      action: "cancelled",
      timestamp: new Date(),
      details: `Auto-renewal cancelled by user. Access remains active until ${sub.expiryDate || sub.endDate}`,
    });

    await sub.save();

    return res.status(200).json({
      success: true,
      message: `Your subscription will remain active until ${new Date(
        sub.expiryDate || sub.endDate
      ).toLocaleDateString()}, but it will not renew automatically.`,
      subscription: {
        plan: sub.plan,
        status: sub.status,
        autoRenew: sub.autoRenew,
        expiryDate: sub.expiryDate || sub.endDate,
      },
    });
  } catch (error) {
    console.error("[Subscription Cancel] Error:", error.message);
    return res.status(500).json({ message: "Failed to cancel subscription" });
  }
};

/**
 * Controller: POST /subscription/schedule-downgrade
 * Schedules downgrade for next renewal cycle without removing current benefits
 */
export const scheduleDowngrade = async (req, res) => {
  const { targetPlan } = req.body;
  if (!targetPlan || !SUBSCRIPTION_CONFIG.PLANS[targetPlan]) {
    return res.status(400).json({ message: "Invalid target plan" });
  }

  try {
    const sub = await Subscription.findOne({ userId: req.userId });
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    const effectiveDate = sub.expiryDate || sub.endDate || new Date();
    sub.scheduledDowngrade = {
      targetPlan,
      effectiveDate,
    };
    sub.autoRenew = false;

    sub.history.push({
      plan: sub.plan,
      action: "downgraded",
      timestamp: new Date(),
      details: `Downgrade to ${targetPlan} scheduled for ${effectiveDate}`,
    });

    await sub.save();

    return res.status(200).json({
      success: true,
      message: `Your downgrade to ${targetPlan} will take effect on ${new Date(effectiveDate).toLocaleDateString()}. Your current ${sub.plan} benefits remain active until then.`,
      scheduledDowngrade: sub.scheduledDowngrade,
    });
  } catch (error) {
    console.error("[Downgrade Schedule] Error:", error.message);
    return res.status(500).json({ message: "Failed to schedule downgrade" });
  }
};

/**
 * Controller: GET /subscription/billing-history
 * Returns user's invoices and transactions
 */
export const getBillingHistory = async (req, res) => {
  try {
    const [invoices, transactions] = await Promise.all([
      Invoice.find({ userId: req.userId }).sort({ createdAt: -1 }).lean(),
      PaymentTransaction.find({ userId: req.userId }).sort({ createdAt: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      invoices,
      transactions,
    });
  } catch (error) {
    console.error("[Billing History] Error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve billing history" });
  }
};

/**
 * Controller: GET /subscription/invoice/:invoiceNumber
 * IDOR-protected single invoice view
 */
export const getInvoiceDetails = async (req, res) => {
  const { invoiceNumber } = req.params;

  try {
    const invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized access to this invoice" });
    }

    return res.status(200).json({ success: true, invoice });
  } catch (error) {
    console.error("[Invoice View] Error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve invoice" });
  }
};

/**
 * Controller: POST /subscription/watch-time
 * Track daily watch time and check daily watch limit
 */
export const recordWatchTime = async (req, res) => {
  const { minutes = 1 } = req.body;
  const userId = req.userId;

  try {
    const sub = await getOrCreateUserSubscription(userId);
    const planConfig = SUBSCRIPTION_CONFIG.PLANS[sub.plan] || SUBSCRIPTION_CONFIG.PLANS.Free;
    const limitMinutes = planConfig.dailyWatchLimitMinutes;

    const now = new Date();
    const lastDate = sub.dailyWatchTimeLastDate ? new Date(sub.dailyWatchTimeLastDate) : new Date(0);
    const isSameDay =
      now.getUTCFullYear() === lastDate.getUTCFullYear() &&
      now.getUTCMonth() === lastDate.getUTCMonth() &&
      now.getUTCDate() === lastDate.getUTCDate();

    let usedToday = isSameDay ? sub.dailyWatchTimeMinutesUsed || 0 : 0;
    usedToday += Math.max(1, parseInt(minutes, 10));

    sub.dailyWatchTimeMinutesUsed = usedToday;
    sub.dailyWatchTimeLastDate = now;
    await sub.save();

    const remainingMinutes = Math.max(0, limitMinutes - usedToday);
    const limitExceeded = limitMinutes < 9999 && usedToday > limitMinutes;

    return res.status(200).json({
      plan: sub.plan,
      limitMinutes,
      usedTodayMinutes: usedToday,
      remainingMinutes,
      limitExceeded,
    });
  } catch (error) {
    console.error("[Watch Time] Error:", error.message);
    return res.status(500).json({ message: "Failed to record watch time" });
  }
};

/**
 * Controller: GET /subscription/check-access/:videoId
 * Check if current user has permission to play the specified video
 */
export const checkVideoAccess = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.userId;

  try {
    const videoDoc = await Video.findById(videoId);
    if (!videoDoc) {
      return res.status(404).json({ message: "Video not found" });
    }

    const check = await canWatchVideo(userId, videoDoc);
    const quality = check.allowed ? getStreamingQuality(check.userPlan || "Free") : "360p";

    return res.status(200).json({
      videoId,
      accessLevel: videoDoc.accessLevel || "free",
      maxStreamingQuality: quality,
      ...check,
    });
  } catch (error) {
    console.error("[Check Video Access] Error:", error.message);
    return res.status(500).json({ message: "Failed to check video access", error: error.message });
  }
};

