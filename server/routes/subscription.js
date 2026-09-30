import express from "express";
import {
  getCurrentSubscription,
  getSubscriptionPlans,
  upgradeSubscription,
  registerDevice,
} from "../controllers/subscription.js";
import { requireAuth } from "../middleware/auth.js";

const routes = express.Router();

// Public: view available plans
routes.get("/plans", getSubscriptionPlans);

// Authenticated user subscription operations
routes.get("/current", requireAuth, getCurrentSubscription);
routes.post("/upgrade", requireAuth, upgradeSubscription);
routes.post("/device", requireAuth, registerDevice);

export default routes;
