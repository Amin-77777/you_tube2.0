import express from "express";
import {
  authorizeDownload,
  deliverDownloadFile,
  getQuotaStatus,
  getDownloadHistory,
  updateDownloadStatus,
  retryDownload,
  getAdminAuditLogs,
} from "../controllers/download.js";
import { requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { DOWNLOAD_CONFIG } from "../config/downloadConfig.js";

const routes = express.Router();

// Apply rate limiter on download operations
const downloadLimiter = createRateLimiter({
  windowMs: DOWNLOAD_CONFIG.RATE_LIMIT.WINDOW_MS,
  max: DOWNLOAD_CONFIG.RATE_LIMIT.MAX_AUTH_REQUESTS,
  message: "Too many download requests. Please try again in a few minutes.",
});

// Download Authorization (Section 11)
routes.post("/authorize/:videoId", requireAuth, downloadLimiter, authorizeDownload);

// Secure Download Token file delivery (Section 12)
routes.get("/file/:token", downloadLimiter, deliverDownloadFile);

// Current user download quota status (Section 19)
routes.get("/quota", requireAuth, getQuotaStatus);

// User's download audit history (Section 18)
routes.get("/history", requireAuth, getDownloadHistory);

// Status notification from client (Section 9)
routes.post("/:downloadId/status", requireAuth, updateDownloadStatus);

// Retry interrupted or failed download without double-charging quota (Section 10)
routes.post("/retry/:downloadId", requireAuth, downloadLimiter, retryDownload);

// Admin audit logs inspection (Section 27)
routes.get("/admin/all", requireAuth, getAdminAuditLogs);

export default routes;
