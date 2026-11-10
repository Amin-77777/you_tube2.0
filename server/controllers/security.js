import mongoose from "mongoose";
import LoginEvent from "../Modals/LoginEvent.js";
import TrustedDevice from "../Modals/TrustedDevice.js";
import Session from "../Modals/Session.js";
import User from "../Modals/Auth.js";
import { formatToIST, getEffectiveTheme } from "../services/themeService.js";
import {
  listUserSessions,
  revokeSession,
  revokeUserSessions,
} from "../services/sessionService.js";
import {
  listUserTrustedDevices,
  revokeTrustedDevice,
  revokeAllTrustedDevices,
} from "../services/trustedDeviceService.js";

/**
 * Provides an aggregated security overview for the authenticated user.
 */
export const getSecurityOverview = async (req, res) => {
  try {
    const userId = req.userId;
    const userDoc = req.user;

    const [activeSessions, trustedDevices, recentFailedEvents, recentAlerts] =
      await Promise.all([
        Session.countDocuments({
          userId,
          revoked: false,
          expiresAt: { $gt: new Date() },
        }),
        TrustedDevice.countDocuments({
          userId,
          revoked: false,
          expiresAt: { $gt: new Date() },
        }),
        LoginEvent.countDocuments({
          userId,
          status: { $in: ["Failed", "OTP Failed", "Blocked"] },
          createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
        LoginEvent.find({
          userId,
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    const themePref = userDoc.themePreference || "auto";
    const effectiveTheme = getEffectiveTheme(themePref);

    const alerts = recentAlerts.map((e) => {
      let title = "Login attempt";
      let severity = "info";
      if (e.status === "Success") {
        title = e.device?.isTrusted
          ? "Successful sign-in from trusted device"
          : "Successful sign-in from new environment";
        severity = "success";
      } else if (e.status === "OTP Required") {
        title = "Sign-in required two-factor authentication";
        severity = "warning";
      } else if (e.status === "OTP Failed" || e.status === "Failed") {
        title = "Failed sign-in attempt detected";
        severity = "error";
      } else if (e.status === "Blocked") {
        title = "Blocked suspicious sign-in attempt";
        severity = "error";
      }

      return {
        _id: e._id,
        title,
        status: e.status,
        severity,
        ip: e.ip,
        location: e.location?.city
          ? `${e.location.city}, ${e.location.country}`
          : "Unknown location",
        device: e.device?.name || e.browser?.name || "Unknown device",
        timeIST: formatToIST(e.createdAt),
        createdAt: e.createdAt,
      };
    });

    const isSecure = recentFailedEvents === 0 && trustedDevices > 0;

    return res.status(200).json({
      status: isSecure ? "Secure" : "Attention Needed",
      accountEmail: userDoc.email,
      themePreference: themePref,
      effectiveTheme,
      lastLoginAt: userDoc.lastLoginAt,
      lastLoginAtIST: formatToIST(userDoc.lastLoginAt),
      lastLoginIp: userDoc.lastLoginIp || "N/A",
      lastLoginLocation: userDoc.lastLoginLocation || "Unknown",
      activeSessionsCount: activeSessions,
      trustedDevicesCount: trustedDevices,
      recentFailedAttemptsCount: recentFailedEvents,
      alerts,
    });
  } catch (error) {
    console.error("Error in getSecurityOverview:", error);
    return res.status(500).json({ message: "Failed to load security overview" });
  }
};

/**
 * Returns paginated, filterable login history for the authenticated user.
 */
export const getLoginHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (req.query.status && req.query.status !== "All") {
      filter.status = req.query.status;
    }
    if (req.query.deviceType && req.query.deviceType !== "All") {
      filter["device.type"] = req.query.deviceType;
    }
    if (req.query.ip) {
      filter.ip = { $regex: req.query.ip.trim(), $options: "i" };
    }

    const [total, events] = await Promise.all([
      LoginEvent.countDocuments(filter),
      LoginEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formattedEvents = events.map((item) => ({
      _id: item._id,
      timestampUTC: item.createdAt,
      displayTimeIST: formatToIST(item.createdAt),
      browser: item.browser,
      os: item.os,
      device: item.device,
      ip: item.ip,
      ipClassification: item.ipClassification,
      location: item.location,
      status: item.status,
      verificationMethod: item.verificationMethod,
      isTrusted: item.device?.isTrusted || false,
      failureReason: item.failureReason,
      riskIndicators: item.riskIndicators || [],
      otpRequired: item.otpRequired,
      otpSucceeded: item.otpSucceeded,
    }));

    return res.status(200).json({
      events: formattedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Error in getLoginHistory:", error);
    return res.status(500).json({ message: "Failed to load login history" });
  }
};

/**
 * Returns single login event details, enforcing ownership check.
 */
export const getLoginEventDetail = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const event = await LoginEvent.findOne({ _id: id, userId: req.userId }).lean();
    if (!event) {
      return res.status(404).json({ message: "Login record not found" });
    }

    return res.status(200).json({
      ...event,
      displayTimeIST: formatToIST(event.createdAt),
      otpRequestedAtIST: formatToIST(event.otpRequestedAt),
      otpVerifiedAtIST: formatToIST(event.otpVerifiedAt),
      authenticatedAtIST: formatToIST(event.authenticatedAt),
      logoutAtIST: formatToIST(event.logoutAt),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch login record" });
  }
};

/**
 * Returns list of active sessions for the user.
 */
export const getActiveSessions = async (req, res) => {
  try {
    const sessions = await listUserSessions(req.userId, req.currentJwtId);
    const formatted = sessions.map((s) => ({
      ...s,
      createdAtIST: formatToIST(s.createdAt),
      lastActivityAtIST: formatToIST(s.lastActivityAt),
      expiresAtIST: formatToIST(s.expiresAt),
    }));
    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error in getActiveSessions:", error);
    return res.status(500).json({ message: "Failed to load active sessions" });
  }
};

/**
 * Revokes a single session belonging to the user.
 */
export const revokeActiveSession = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: "Session ID required" });
  }

  try {
    const success = await revokeSession(req.userId, id);
    if (!success) {
      return res.status(404).json({ message: "Session not found or already revoked" });
    }
    return res.status(200).json({ message: "Session revoked successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to revoke session" });
  }
};

/**
 * Revokes all other sessions except current.
 */
export const revokeOtherSessions = async (req, res) => {
  try {
    const count = await revokeUserSessions(req.userId, req.currentJwtId);
    return res.status(200).json({
      message: `Successfully revoked ${count} other active session(s)`,
      revokedCount: count,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to revoke other sessions" });
  }
};

/**
 * Returns list of trusted devices for the user.
 */
export const getTrustedDevices = async (req, res) => {
  try {
    const devices = await listUserTrustedDevices(req.userId);
    const formatted = devices.map((d) => ({
      _id: d._id,
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      browser: d.browser,
      os: d.os,
      deviceType: d.deviceType,
      location: d.location,
      lastIp: d.lastIp,
      createdAt: d.createdAt,
      createdAtIST: formatToIST(d.createdAt),
      lastUsedAt: d.lastUsedAt,
      lastUsedAtIST: formatToIST(d.lastUsedAt),
      expiresAt: d.expiresAt,
      expiresAtIST: formatToIST(d.expiresAt),
    }));
    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error in getTrustedDevices:", error);
    return res.status(500).json({ message: "Failed to load trusted devices" });
  }
};

/**
 * Revokes a single trusted device.
 */
export const revokeTrustedDeviceEndpoint = async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Valid device record ID required" });
  }

  try {
    const success = await revokeTrustedDevice(req.userId, id);
    if (!success) {
      return res.status(404).json({ message: "Trusted device not found or already revoked" });
    }
    return res.status(200).json({ message: "Trusted device removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to revoke trusted device" });
  }
};

/**
 * Revokes all trusted devices for the user.
 */
export const revokeAllTrustedDevicesEndpoint = async (req, res) => {
  try {
    const count = await revokeAllTrustedDevices(req.userId);
    return res.status(200).json({
      message: `All ${count} trusted device(s) have been revoked`,
      revokedCount: count,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to revoke trusted devices" });
  }
};
