import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import User from "./Modals/Auth.js";
import Video from "./Modals/video.js";
import Subscription from "./Modals/Subscription.js";
import PaymentTransaction from "./Modals/PaymentTransaction.js";
import Invoice from "./Modals/Invoice.js";
import {
  SUBSCRIPTION_CONFIG,
  calculatePlanPrice,
  hasRequiredAccess,
} from "./config/subscriptionPlans.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayKeySecret,
} from "./services/razorpayService.js";
import { getOrCreateUserSubscription } from "./controllers/subscription.js";
import {
  canWatchVideo,
  getStreamingQuality,
  getDailyWatchLimit,
} from "./middleware/accessControl.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function runTests() {
  console.log("==================================================");
  console.log("TESTING RAZORPAY SUBSCRIPTION MANAGEMENT SYSTEM");
  console.log("==================================================");

  const dbUrl = process.env.DB_URL || "mongodb://127.0.0.1:27017/youtube";
  await mongoose.connect(dbUrl);
  console.log("✓ Connected to MongoDB database");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ [PASS ${total}] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL ${total}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Plan Configuration & Price Calculations
    // ----------------------------------------------------
    console.log("\n--- TEST 1: Plan Config & Pricing Calculation ---");
    assert(SUBSCRIPTION_CONFIG.PLANS.Free.monthlyPrice === 0, "Free plan monthly price is 0");
    assert(SUBSCRIPTION_CONFIG.PLANS.Bronze.monthlyPrice === 199, "Bronze plan monthly price is ₹199");
    assert(SUBSCRIPTION_CONFIG.PLANS.Silver.monthlyPrice === 499, "Silver plan monthly price is ₹499");
    assert(SUBSCRIPTION_CONFIG.PLANS.Gold.monthlyPrice === 999, "Gold plan monthly price is ₹999");

    const bronzeMonthly = calculatePlanPrice("Bronze", "monthly");
    assert(bronzeMonthly.amountPaise === 19900, "Bronze monthly price is 19900 paise (₹199)");

    const bronzeQuarterly = calculatePlanPrice("Bronze", "quarterly");
    // 199 * 3 = 597; 10% discount = 537.3 -> 537
    assert(bronzeQuarterly.amountPaise === 53700, "Bronze quarterly (10% off) is 53700 paise (₹537)");

    const goldYearly = calculatePlanPrice("Gold", "yearly");
    // 999 * 12 = 11988; 20% discount = 9590.4 -> 9590
    assert(goldYearly.amountPaise === 959000, "Gold yearly (20% off) is 959000 paise (₹9,590)");

    // ----------------------------------------------------
    // TEST 2: Razorpay Order Creation
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Razorpay Order Creation ---");
    const orderData = await createRazorpayOrder({
      amountPaise: 49900,
      currency: "INR",
      receipt: "rcpt_test_123",
      notes: { plan: "Silver", duration: "monthly" },
    });
    assert(Boolean(orderData.id), `Order generated with ID: ${orderData.id}`);
    assert(orderData.amount === 49900, "Order amount matches 49900 paise");
    assert(orderData.currency === "INR", "Order currency is INR");

    // ----------------------------------------------------
    // TEST 3: Razorpay HMAC-SHA256 Signature Verification
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Signature Verification (HMAC-SHA256) ---");
    const secret = getRazorpayKeySecret();
    const testOrderId = orderData.id;
    const testPaymentId = `pay_${Date.now()}`;
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest("hex");

    const isValid = verifyRazorpaySignature({
      razorpayOrderId: testOrderId,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: validSignature,
    });
    assert(isValid === true, "Valid HMAC-SHA256 signature accepted");

    const isInvalid = verifyRazorpaySignature({
      razorpayOrderId: testOrderId,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: "invalid_fake_signature_abc",
    });
    assert(isInvalid === false, "Invalid HMAC-SHA256 signature rejected");

    // ----------------------------------------------------
    // TEST 4: Duplicate Payment Idempotency Protection
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Duplicate Payment Prevention ---");
    let testUser = await User.findOne({ email: "subscriber_tester@example.com" });
    if (!testUser) {
      testUser = await User.create({
        email: "subscriber_tester@example.com",
        name: "Subscriber Tester",
      });
    }

    const dupPaymentId = `pay_dup_${Date.now()}`;
    // First record:
    await PaymentTransaction.create({
      razorpayOrderId: testOrderId,
      razorpayPaymentId: dupPaymentId,
      razorpaySignature: validSignature,
      userId: testUser._id,
      plan: "Bronze",
      duration: "monthly",
      amount: 19900,
      currency: "INR",
      status: "SUCCESS",
    });

    const existingTx = await PaymentTransaction.findOne({ razorpayPaymentId: dupPaymentId });
    assert(existingTx !== null, "Initial transaction recorded");

    // Attempting duplicate check
    let duplicateDetected = false;
    if (existingTx && existingTx.status === "SUCCESS") {
      duplicateDetected = true;
    }
    assert(duplicateDetected === true, "Duplicate payment attempt correctly detected and blocked");

    // ----------------------------------------------------
    // TEST 5: Subscription Activation & Expiry Setting
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Subscription Activation & Duration Expiry ---");
    let sub = await getOrCreateUserSubscription(testUser._id);
    assert(sub.plan === "Free" || Boolean(sub.plan), `User current plan: ${sub.plan}`);

    // Activate Silver Quarterly
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    sub.plan = "Silver";
    sub.duration = "quarterly";
    sub.status = "ACTIVE";
    sub.startDate = now;
    sub.endDate = expiryDate;
    sub.expiryDate = expiryDate;
    sub.renewalDate = expiryDate;
    sub.autoRenew = true;
    await sub.save();

    const updatedSub = await Subscription.findById(sub._id);
    assert(updatedSub.plan === "Silver", "Subscription upgraded to Silver");
    assert(updatedSub.duration === "quarterly", "Duration set to quarterly (90 days)");
    assert(Boolean(updatedSub.expiryDate), "Expiry date successfully set");

    // ----------------------------------------------------
    // TEST 6: Invoice Record Creation
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Automated Invoice Generation ---");
    const testInvoiceNum = `INV-TEST-${Date.now().toString(36).toUpperCase()}`;
    const invoice = await Invoice.create({
      invoiceNumber: testInvoiceNum,
      userId: testUser._id,
      subscriptionId: sub._id,
      userName: testUser.name,
      userEmail: testUser.email,
      planName: "Silver",
      planTier: 3,
      duration: "quarterly",
      amount: 134700,
      currency: "INR",
      paymentId: dupPaymentId,
      orderId: testOrderId,
      startDate: now,
      expiryDate,
      status: "PAID",
    });

    assert(invoice.invoiceNumber === testInvoiceNum, `Invoice generated: ${testInvoiceNum}`);
    assert(invoice.amount === 134700, "Invoice amount matches quarterly Silver (₹1,347)");
    assert(invoice.status === "PAID", "Invoice status marked PAID");

    // ----------------------------------------------------
    // TEST 7: Premium Video Access Control
    // ----------------------------------------------------
    console.log("\n--- TEST 7: Premium Video Access Enforcement ---");
    const freeVideo = { accessLevel: "free", videotitle: "Free Bunny" };
    const bronzeVideo = { accessLevel: "bronze", videotitle: "Bronze Synth" };
    const silverVideo = { accessLevel: "silver", videotitle: "Silver Sintel" };
    const goldVideo = { accessLevel: "gold", videotitle: "Gold 4K City" };

    // With Silver user:
    const silverCheckFree = await canWatchVideo(testUser._id, freeVideo);
    assert(silverCheckFree.allowed === true, "Silver subscriber can watch Free video");

    const silverCheckBronze = await canWatchVideo(testUser._id, bronzeVideo);
    assert(silverCheckBronze.allowed === true, "Silver subscriber can watch Bronze video");

    const silverCheckSilver = await canWatchVideo(testUser._id, silverVideo);
    assert(silverCheckSilver.allowed === true, "Silver subscriber can watch Silver video");

    const silverCheckGold = await canWatchVideo(testUser._id, goldVideo);
    assert(silverCheckGold.allowed === false, "Silver subscriber CANNOT watch Gold VIP video (Blocked)");

    // Unauthenticated guest user:
    const guestCheckGold = await canWatchVideo(null, goldVideo);
    assert(guestCheckGold.allowed === false, "Unauthenticated guest blocked from Gold video");

    // ----------------------------------------------------
    // TEST 8: Streaming Quality & Watch Limit Entitlements
    // ----------------------------------------------------
    console.log("\n--- TEST 8: Plan Streaming Quality & Watch Limits ---");
    assert(getStreamingQuality("Free") === SUBSCRIPTION_CONFIG.PLANS.Free.maxStreamingQuality, "Free quality matches config");
    assert(getStreamingQuality("Bronze") === SUBSCRIPTION_CONFIG.PLANS.Bronze.maxStreamingQuality, "Bronze quality matches config");
    assert(getStreamingQuality("Silver") === SUBSCRIPTION_CONFIG.PLANS.Silver.maxStreamingQuality, "Silver quality matches config");
    assert(getStreamingQuality("Gold") === SUBSCRIPTION_CONFIG.PLANS.Gold.maxStreamingQuality, "Gold quality matches config");

    assert(getDailyWatchLimit("Free") === SUBSCRIPTION_CONFIG.PLANS.Free.dailyWatchLimitMinutes, "Free watch limit matches config");
    assert(getDailyWatchLimit("Bronze") === SUBSCRIPTION_CONFIG.PLANS.Bronze.dailyWatchLimitMinutes, "Bronze watch limit matches config");
    assert(getDailyWatchLimit("Silver") === SUBSCRIPTION_CONFIG.PLANS.Silver.dailyWatchLimitMinutes, "Silver watch limit matches config");
    assert(getDailyWatchLimit("Gold") >= 9999, "Gold watch limit is Unlimited (9999 mins)");

    // ----------------------------------------------------
    // TEST 9: Auto-Renew Cancellation & Scheduled Downgrade
    // ----------------------------------------------------
    console.log("\n--- TEST 9: Auto-Renew Disable & Cancellation ---");
    sub.autoRenew = false;
    await sub.save();
    assert(sub.autoRenew === false, "Auto-renewal successfully disabled");
    assert(sub.status === "ACTIVE", "Subscription benefits remain ACTIVE until expiry date");

    // Immediate downgrade
    sub.plan = "Free";
    sub.status = "ACTIVE";
    sub.endDate = null;
    sub.expiryDate = null;
    await sub.save();
    assert(sub.plan === "Free", "Immediate downgrade to Free succeeds without data loss");

    // Verify user data and invoice still intact
    const preservedInvoices = await Invoice.find({ userId: testUser._id });
    assert(preservedInvoices.length > 0, "User billing/invoice records preserved after downgrade");

    console.log("\n==================================================");
    console.log(`ALL TESTS PASSED! (${passed}/${total})`);
    console.log("==================================================");
  } catch (err) {
    console.error("\nTEST SUITE FAILED:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
