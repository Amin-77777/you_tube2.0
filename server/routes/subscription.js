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
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  verifyEmailConfiguration,
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

// Email & In-App Notification Endpoints
routes.get("/notifications", requireAuth, getUserNotifications);
routes.post("/notifications/mark-all-read", requireAuth, markAllNotificationsRead);
routes.post("/notifications/:id/read", requireAuth, markNotificationRead);
routes.post("/verify-email-config", requireAuth, verifyEmailConfiguration);

export default routes;
