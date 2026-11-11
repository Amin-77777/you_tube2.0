import express from "express";
import {
  login,
  verifyOtp,
  resendOtp,
  cancelOtp,
  getPreferences,
  updatePreferences,
  logout,
  logoutAll,
  updateprofile,
  getChannelProfile,
  toggleChannelSubscription,
  getChannelSubscriptions,
} from "../controllers/auth.js";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../controllers/userPreferences.js";
import { requireAuth } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOtp);
routes.post("/resend-otp", resendOtp);
routes.post("/cancel-otp", cancelOtp);

routes.get("/preferences", requireAuth, getPreferences);
routes.patch("/preferences", requireAuth, updatePreferences);

routes.get("/comment-preferences", requireAuth, getUserPreferences);
routes.put("/comment-preferences", requireAuth, updateUserPreferences);
routes.patch("/comment-preferences", requireAuth, updateUserPreferences);

routes.post("/logout", requireAuth, logout);
routes.post("/logout-all", requireAuth, logoutAll);

routes.get("/channel/:id", getChannelProfile);
routes.get("/profile/:id", getChannelProfile);

routes.patch("/update/:id", updateprofile);
routes.put("/update/:id", updateprofile);
routes.post("/update/:id", updateprofile);

routes.post("/subscribe/:channelId", toggleChannelSubscription);
routes.get("/subscriptions/channels", getChannelSubscriptions);

export default routes;
