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
} from "../controllers/auth.js";
import { requireAuth } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOtp);
routes.post("/resend-otp", resendOtp);
routes.post("/cancel-otp", cancelOtp);

routes.get("/preferences", requireAuth, getPreferences);
routes.patch("/preferences", requireAuth, updatePreferences);

routes.post("/logout", requireAuth, logout);
routes.post("/logout-all", requireAuth, logoutAll);

routes.patch("/update/:id", updateprofile);

export default routes;
