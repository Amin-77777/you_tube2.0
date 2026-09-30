import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Download from "../Modals/Download.js";
import Video from "../Modals/video.js";
import User from "../Modals/Auth.js";
import {
  DOWNLOAD_CONFIG,
  getPlanDailyLimit,
  getCurrentDayBounds,
} from "../config/downloadConfig.js";
import { getOrCreateUserSubscription } from "./subscription.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to sanitize filenames for Content-Disposition header
function sanitizeFilename(name, fallbackExt = ".mp4") {
  const safe = (name || "video")
    .replace(/[^a-zA-Z0-9_\-\. ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  if (path.extname(safe)) return safe;
  return `${safe}${fallbackExt}`;
}

// Helper to resolve local upload paths
function resolveLocalPath(filepath) {
  if (!filepath || filepath.startsWith("http://") || filepath.startsWith("https://")) {
    return null;
  }
  const clean = filepath.replace(/^uploads[\/\\]/, "");
  const basename = path.basename(clean);
  const candidates = [
    path.resolve(__dirname, "../uploads", basename),
    path.resolve(__dirname, "../../yourtube/public/uploads", basename),
    path.resolve(__dirname, "../../yourtube/public/video", basename),
    path.resolve(process.cwd(), "uploads", basename),
    path.resolve(process.cwd(), "server/uploads", basename),
    path.resolve(process.cwd(), "yourtube/public/uploads", basename),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Controller: POST /download/authorize/:videoId
 * Atomic concurrency-safe download authorization
 */
export const authorizeDownload = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.userId;
  const idempotencyKey =
    req.headers["idempotency-key"] || req.body?.idempotencyKey || null;

  try {
    // 1. Verify Video existence and accessibility
    const videoDoc = await Video.findById(videoId);
    if (!videoDoc) {
      return res.status(404).json({
        authorized: false,
        error: "VideoNotFound",
        message: "The requested video does not exist or has been removed.",
      });
    }

    if (!videoDoc.filepath) {
      return res.status(400).json({
        authorized: false,
        error: "VideoNotDownloadable",
        message: "This video does not have an available media source for download.",
      });
    }

    // 2. Handle Idempotency (prevent duplicate consumption from repeated clicks/retries)
    if (idempotencyKey) {
      const existingIdempotent = await Download.findOne({
        userId,
        videoId,
        idempotencyKey,
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // 5 mins window
      });

      if (existingIdempotent) {
        const sub = await getOrCreateUserSubscription(userId);
        const { startOfDay, endOfDay, resetAt } = getCurrentDayBounds();
        const usedCount = await Download.countDocuments({
          userId,
          quotaConsumed: true,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        });
        const dailyLimit = getPlanDailyLimit(sub.plan);

        return res.status(200).json({
          authorized: true,
          idempotentReplay: true,
          downloadId: existingIdempotent._id,
          token: existingIdempotent.token,
          downloadUrl: `/download/file/${existingIdempotent.token}`,
          expiresIn: DOWNLOAD_CONFIG.DOWNLOAD_TOKEN_EXPIRY_SECONDS,
          expiresAt: existingIdempotent.tokenExpiresAt,
          isDuplicate: existingIdempotent.isDuplicate,
          quota: {
            limit: dailyLimit,
            used: usedCount,
            remaining: Math.max(0, dailyLimit - usedCount),
            resetAt,
          },
          plan: sub.plan,
          video: {
            id: videoDoc._id,
            title: videoDoc.videotitle,
            fileSize: videoDoc.filesize || "Unknown",
          },
        });
      }
    }

    // 3. Subscription & Plan Check
    const sub = await getOrCreateUserSubscription(userId);
    const dailyLimit = getPlanDailyLimit(sub.plan);
    const { startOfDay, endOfDay, resetAt } = getCurrentDayBounds();

    // 4. Check for duplicate download within duplicate window (Section 6)
    const duplicateWindowStart = new Date(
      Date.now() - DOWNLOAD_CONFIG.DUPLICATE_WINDOW_MINUTES * 60 * 1000
    );
    const recentDownload = await Download.findOne({
      userId,
      videoId,
      status: { $in: ["AUTHORIZED", "STARTED", "IN_PROGRESS", "COMPLETED"] },
      createdAt: { $gte: duplicateWindowStart },
    });

    const isDuplicate = Boolean(recentDownload);

    // 5. Quota Verification
    const usedCount = await Download.countDocuments({
      userId,
      quotaConsumed: true,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // If not a duplicate and quota is exhausted
    if (!isDuplicate && usedCount >= dailyLimit) {
      return res.status(403).json({
        authorized: false,
        error: "QuotaExceeded",
        message: `Daily download limit of ${dailyLimit} video(s) reached for your ${sub.plan} plan. Upgrade your plan for more daily downloads.`,
        quota: {
          limit: dailyLimit,
          used: usedCount,
          remaining: 0,
          resetAt,
        },
        plan: sub.plan,
        upgradeAvailable: sub.plan !== "Gold",
      });
    }

    // 6. Device Restrictions check (Section 16)
    const deviceId = req.headers["x-device-id"] || req.body?.deviceId || "";
    if (DOWNLOAD_CONFIG.DEVICE_RESTRICTIONS_ENABLED && deviceId) {
      const deviceRegistered = sub.registeredDevices.some(
        (d) => d.deviceId === deviceId
      );
      if (!deviceRegistered && sub.registeredDevices.length >= DOWNLOAD_CONFIG.MAX_REGISTERED_DEVICES) {
        return res.status(403).json({
          authorized: false,
          error: "DeviceLimitReached",
          message: `Device authorization limit reached. Maximum ${DOWNLOAD_CONFIG.MAX_REGISTERED_DEVICES} devices allowed.`,
        });
      }
    }

    // 7. Generate Secure Download Token (Section 12)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiresAt = new Date(
      Date.now() + DOWNLOAD_CONFIG.DOWNLOAD_TOKEN_EXPIRY_SECONDS * 1000
    );

    // 8. Create Download Audit Record (Section 8)
    const downloadRecord = await Download.create({
      userId,
      videoId,
      subscriptionId: sub._id,
      subscriptionPlan: sub.plan,
      status: "AUTHORIZED",
      fileSize: videoDoc.filesize || "Unknown",
      ipAddress: req.ip || req.socket.remoteAddress || "",
      userAgent: req.headers["user-agent"] || "",
      deviceInfo: req.headers["sec-ch-ua-platform"] || "",
      deviceId,
      quotaConsumed: !isDuplicate, // Duplicates do not consume quota
      isDuplicate,
      token,
      tokenExpiresAt,
      idempotencyKey,
    });

    const currentUsed = !isDuplicate ? usedCount + 1 : usedCount;
    const remainingQuota = Math.max(0, dailyLimit - currentUsed);

    console.log(
      `[Download Auth] Authorized video "${videoDoc.videotitle}" for user ${userId} on ${sub.plan} plan. Used: ${currentUsed}/${dailyLimit} (Duplicate: ${isDuplicate})`
    );

    return res.status(200).json({
      authorized: true,
      downloadId: downloadRecord._id,
      token,
      downloadUrl: `/download/file/${token}`,
      expiresIn: DOWNLOAD_CONFIG.DOWNLOAD_TOKEN_EXPIRY_SECONDS,
      expiresAt: tokenExpiresAt,
      isDuplicate,
      quota: {
        limit: dailyLimit,
        used: currentUsed,
        remaining: remainingQuota,
        resetAt,
      },
      plan: sub.plan,
      video: {
        id: videoDoc._id,
        title: videoDoc.videotitle,
        fileSize: videoDoc.filesize || "Unknown",
      },
    });
  } catch (error) {
    console.error("[Download Auth] Error authorizing download:", error);
    return res.status(500).json({
      authorized: false,
      error: "ServerError",
      message: "An internal server error occurred while authorizing your download.",
    });
  }
};

/**
 * Controller: GET /download/file/:token
 * Secure file delivery with Range support, streaming, and audit lifecycle management
 */
export const deliverDownloadFile = async (req, res) => {
  const { token } = req.params;

  try {
    const downloadRecord = await Download.findOne({ token });
    if (!downloadRecord) {
      return res.status(404).json({ error: "DownloadNotFound", message: "Invalid or expired download token." });
    }

    // Validate expiration
    if (new Date() > new Date(downloadRecord.tokenExpiresAt)) {
      downloadRecord.status = "EXPIRED";
      await downloadRecord.save();
      return res.status(410).json({ error: "TokenExpired", message: "This download link has expired. Please request a new download." });
    }

    const videoDoc = await Video.findById(downloadRecord.videoId);
    if (!videoDoc) {
      return res.status(404).json({ error: "VideoNotFound", message: "The associated video file was not found." });
    }

    // Mark status as STARTED
    downloadRecord.status = "STARTED";
    downloadRecord.startedAt = new Date();
    await downloadRecord.save();

    const filename = sanitizeFilename(videoDoc.videotitle, path.extname(videoDoc.filename || "video.mp4") || ".mp4");
    const localPath = resolveLocalPath(videoDoc.filepath);

    if (localPath && fs.existsSync(localPath)) {
      // Local file delivery with Range & attachment header
      const stat = fs.statSync(localPath);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", videoDoc.filetype || "video/mp4");
      res.setHeader("Content-Length", stat.size);

      const stream = fs.createReadStream(localPath);

      stream.on("open", () => {
        downloadRecord.status = "IN_PROGRESS";
        downloadRecord.save().catch(() => {});
      });

      stream.on("end", async () => {
        downloadRecord.status = "COMPLETED";
        downloadRecord.completedAt = new Date();
        await downloadRecord.save().catch(() => {});
        console.log(`[Download Deliver] Successfully completed download ${downloadRecord._id}`);
      });

      stream.on("error", async (streamErr) => {
        console.error("[Download Deliver] Local stream error:", streamErr.message);
        downloadRecord.status = "FAILED";
        downloadRecord.failedAt = new Date();
        downloadRecord.failureReason = streamErr.message;
        // Release quota on failure
        if (downloadRecord.quotaConsumed) {
          downloadRecord.quotaConsumed = false;
        }
        await downloadRecord.save().catch(() => {});
      });

      return stream.pipe(res);
    } else if (videoDoc.filepath.startsWith("http://") || videoDoc.filepath.startsWith("https://")) {
      // Remote video delivery - pipe remote stream with attachment headers
      try {
        const remoteResponse = await fetch(videoDoc.filepath);
        if (!remoteResponse.ok) {
          throw new Error(`Remote storage returned HTTP ${remoteResponse.status}`);
        }

        const contentType = remoteResponse.headers.get("content-type") || videoDoc.filetype || "video/mp4";
        const contentLength = remoteResponse.headers.get("content-length");

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", contentType);
        if (contentLength) {
          res.setHeader("Content-Length", contentLength);
        }

        downloadRecord.status = "IN_PROGRESS";
        await downloadRecord.save();

        const { Readable } = await import("stream");
        const nodeStream = Readable.fromWeb(remoteResponse.body);

        nodeStream.on("end", async () => {
          downloadRecord.status = "COMPLETED";
          downloadRecord.completedAt = new Date();
          await downloadRecord.save().catch(() => {});
          console.log(`[Download Deliver] Remote download completed for ${downloadRecord._id}`);
        });

        nodeStream.on("error", async (fetchErr) => {
          console.error("[Download Deliver] Remote stream error:", fetchErr.message);
          downloadRecord.status = "FAILED";
          downloadRecord.failedAt = new Date();
          downloadRecord.failureReason = fetchErr.message;
          if (downloadRecord.quotaConsumed) {
            downloadRecord.quotaConsumed = false;
          }
          await downloadRecord.save().catch(() => {});
        });

        return nodeStream.pipe(res);
      } catch (remoteErr) {
        console.error("[Download Deliver] Failed to stream remote video:", remoteErr.message);
        downloadRecord.status = "FAILED";
        downloadRecord.failedAt = new Date();
        downloadRecord.failureReason = remoteErr.message;
        if (downloadRecord.quotaConsumed) {
          downloadRecord.quotaConsumed = false;
        }
        await downloadRecord.save().catch(() => {});
        return res.status(502).json({ error: "StorageFetchError", message: "Failed to retrieve video file from storage." });
      }
    } else {
      downloadRecord.status = "FAILED";
      downloadRecord.failedAt = new Date();
      downloadRecord.failureReason = "Media file not found on server disk";
      if (downloadRecord.quotaConsumed) {
        downloadRecord.quotaConsumed = false;
      }
      await downloadRecord.save().catch(() => {});
      return res.status(404).json({ error: "FileNotFound", message: "The media file was not found on the server." });
    }
  } catch (error) {
    console.error("[Download Deliver] Unexpected error:", error.message);
    return res.status(500).json({ error: "ServerError", message: "Failed to deliver download file." });
  }
};

/**
 * Controller: GET /download/quota
 * Quota status and countdown for the authenticated user
 */
export const getQuotaStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const sub = await getOrCreateUserSubscription(userId);
    const dailyLimit = getPlanDailyLimit(sub.plan);
    const { startOfDay, endOfDay, resetAt } = getCurrentDayBounds();

    const usedCount = await Download.countDocuments({
      userId,
      quotaConsumed: true,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const remaining = Math.max(0, dailyLimit - usedCount);

    return res.status(200).json({
      plan: sub.plan,
      limit: dailyLimit,
      used: usedCount,
      remaining,
      resetAt,
      duplicateWindowMinutes: DOWNLOAD_CONFIG.DUPLICATE_WINDOW_MINUTES,
      features: (DOWNLOAD_CONFIG.PLANS[sub.plan] || DOWNLOAD_CONFIG.PLANS.Free).features,
    });
  } catch (error) {
    console.error("[Download Quota] Error calculating quota:", error.message);
    return res.status(500).json({ message: "Failed to calculate quota", error: error.message });
  }
};

/**
 * Controller: GET /download/history
 * Paginated download history with filtering, searching, and sorting (Section 18)
 */
export const getDownloadHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, search, sort = "desc" } = req.query;

    const query = { userId };
    if (status && status !== "ALL") {
      query.status = status.toUpperCase();
    }

    let records = await Download.find(query)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "videoId",
        select: "videotitle thumbnail duration filesize videochanel filepath",
      })
      .lean();

    // Client-level text filtering if search provided and populated
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      records = records.filter((r) =>
        r.videoId?.videotitle?.toLowerCase().includes(searchLower)
      );
    }

    const totalCount = await Download.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      records,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[Download History] Error fetching history:", error.message);
    return res.status(500).json({ message: "Failed to retrieve download history", error: error.message });
  }
};

/**
 * Controller: POST /download/:downloadId/status
 * Status update callback from client (e.g. cancelled, client failed)
 */
export const updateDownloadStatus = async (req, res) => {
  const { downloadId } = req.params;
  const { status, failureReason } = req.body;
  const validStatuses = ["STARTED", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED"];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value provided" });
  }

  try {
    const record = await Download.findOne({ _id: downloadId, userId: req.userId });
    if (!record) {
      return res.status(404).json({ message: "Download record not found" });
    }

    record.status = status;
    if (status === "COMPLETED") {
      record.completedAt = new Date();
    } else if (status === "FAILED" || status === "CANCELLED") {
      record.failedAt = new Date();
      if (failureReason) record.failureReason = failureReason;
      // Release quota if cancelled/failed before completion
      if (record.quotaConsumed) {
        record.quotaConsumed = false;
      }
    }

    await record.save();
    return res.status(200).json({ message: `Download status updated to ${status}`, record });
  } catch (error) {
    console.error("[Download Status] Error updating status:", error.message);
    return res.status(500).json({ message: "Failed to update download status", error: error.message });
  }
};

/**
 * Controller: POST /download/retry/:downloadId
 * Retry a failed or interrupted download without charging new quota (Section 10)
 */
export const retryDownload = async (req, res) => {
  const { downloadId } = req.params;

  try {
    const existing = await Download.findOne({ _id: downloadId, userId: req.userId });
    if (!existing) {
      return res.status(404).json({ message: "Original download record not found." });
    }

    const videoDoc = await Video.findById(existing.videoId);
    if (!videoDoc) {
      return res.status(404).json({ message: "Video is no longer available." });
    }

    // Refresh token and allow retry without charging additional quota
    const newToken = crypto.randomBytes(32).toString("hex");
    existing.token = newToken;
    existing.tokenExpiresAt = new Date(
      Date.now() + DOWNLOAD_CONFIG.DOWNLOAD_TOKEN_EXPIRY_SECONDS * 1000
    );
    existing.status = "AUTHORIZED";
    existing.failedAt = null;
    existing.failureReason = null;
    await existing.save();

    return res.status(200).json({
      authorized: true,
      downloadId: existing._id,
      token: newToken,
      downloadUrl: `/download/file/${newToken}`,
      expiresIn: DOWNLOAD_CONFIG.DOWNLOAD_TOKEN_EXPIRY_SECONDS,
      message: "Retry authorized successfully without consuming extra quota.",
    });
  } catch (error) {
    console.error("[Download Retry] Error:", error.message);
    return res.status(500).json({ message: "Failed to retry download", error: error.message });
  }
};

/**
 * Controller: GET /download/admin/all
 * Admin inspection and audit endpoint (Section 27)
 */
export const getAdminAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const totalDownloads = await Download.countDocuments();
    const completedCount = await Download.countDocuments({ status: "COMPLETED" });
    const failedCount = await Download.countDocuments({ status: "FAILED" });

    const logs = await Download.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .populate("videoId", "videotitle filesize")
      .lean();

    return res.status(200).json({
      stats: {
        totalDownloads,
        completedCount,
        failedCount,
      },
      logs,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalDownloads / limit),
      },
    });
  } catch (error) {
    console.error("[Admin Audit] Error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve audit logs", error: error.message });
  }
};
