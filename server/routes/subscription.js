import express from "express";
import {
  getCurrentSubscription,
  getSubscriptionPlans,
  upgradeSubscription,
  registerDevice,
} from "../controllers/subscription.js";
import {
  createOrder,
  verifyPayment,
  cancelSubscription,
  scheduleDowngrade,
  getBillingHistory,
  getInvoiceDetails,
  recordWatchTime,
  checkVideoAccess,
} from "../controllers/payment.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const routes = express.Router();

// Public: view available plans
routes.get("/plans", getSubscriptionPlans);

// Check video playback authorization (supports logged-in and guest users)
routes.get("/check-access/:videoId", optionalAuth, checkVideoAccess);

// Authenticated user subscription operations
routes.get("/current", requireAuth, getCurrentSubscription);
routes.post("/upgrade", requireAuth, upgradeSubscription);
routes.post("/device", requireAuth, registerDevice);

// Razorpay Test Payment Endpoints
routes.post("/create-order", requireAuth, createOrder);
routes.post("/verify-payment", requireAuth, verifyPayment);
routes.post("/cancel", requireAuth, cancelSubscription);
routes.post("/schedule-downgrade", requireAuth, scheduleDowngrade);
routes.get("/billing-history", requireAuth, getBillingHistory);
routes.get("/invoice/:invoiceNumber", requireAuth, getInvoiceDetails);
routes.post("/watch-time", requireAuth, recordWatchTime);

export default routes;
