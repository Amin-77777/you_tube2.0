import express from "express";
import {
  getSecurityOverview,
  getLoginHistory,
  getLoginEventDetail,
  getActiveSessions,
  revokeActiveSession,
  revokeOtherSessions,
  getTrustedDevices,
  revokeTrustedDeviceEndpoint,
  revokeAllTrustedDevicesEndpoint,
} from "../controllers/security.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// All security routes require authenticated user
router.use(requireAuth);

// Overview
router.get("/overview", getSecurityOverview);

// Login History
router.get("/login-history", getLoginHistory);
router.get("/login-history/:id", getLoginEventDetail);

// Active Sessions
router.get("/sessions", getActiveSessions);
router.delete("/sessions/:id", revokeActiveSession);
router.post("/sessions/revoke-others", revokeOtherSessions);

// Trusted Devices
router.get("/trusted-devices", getTrustedDevices);
router.delete("/trusted-devices/:id", revokeTrustedDeviceEndpoint);
router.post("/trusted-devices/revoke-all", revokeAllTrustedDevicesEndpoint);

export default router;
