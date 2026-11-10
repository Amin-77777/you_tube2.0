import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import LoginEvent from "../Modals/LoginEvent.js";
import OtpChallenge from "../Modals/OtpChallenge.js";
import { generateToken } from "../middleware/auth.js";
import { parseUserAgent } from "../services/deviceParserService.js";
import { getClientIp, classifyIp, resolveLocation } from "../services/geoService.js";
import { evaluateLoginRisk } from "../services/riskService.js";
import {
  createOtpChallenge,
  verifyOtpChallenge,
  resendChallengeOtp,
} from "../services/otpService.js";
import { registerTrustedDevice } from "../services/trustedDeviceService.js";
import {
  createSession,
  revokeSession,
  revokeUserSessions,
} from "../services/sessionService.js";
import { getEffectiveTheme, getISTTimeParts } from "../services/themeService.js";

/**
 * Handles user login / sign-in.
 * Evaluates risk and requires OTP verification for unrecognized environments or new accounts.
 */
export const login = async (req, res) => {
  try {
    const { email, name, image, deviceId, deviceName } = req.body || {};
    const rawDeviceToken =
      req.headers["x-device-token"] || req.body?.deviceToken;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email address is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ip = getClientIp(req);
    const ipClassification = classifyIp(ip);
    const ua = parseUserAgent(req.headers["user-agent"]);

    const location = await resolveLocation(ip);

    let existingUser = await users.findOne({ email: normalizedEmail });
    if (!existingUser) {
      existingUser = await users.create({
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        image:
          image ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            normalizedEmail
          )}`,
        themePreference: "auto",
        registeredEmailVerified: true,
      });
    }

    // Evaluate risk
    const riskResult = await evaluateLoginRisk({
      userId: existingUser._id,
      rawDeviceToken,
      deviceId: deviceId || req.headers["x-device-id"] || "",
      browser: ua.browser,
      os: ua.os,
      ip,
      location,
    });

    // If OTP required
    if (riskResult.otpRequired) {
      const loginEvent = await LoginEvent.create({
        userId: existingUser._id,
        email: normalizedEmail,
        authMethod: "email",
        status: "OTP Required",
        ip,
        ipClassification,
        location,
        browser: ua.browser,
        os: ua.os,
        device: {
          type: ua.device.type,
          model: ua.device.model,
          name: deviceName || ua.device.name,
          deviceId: deviceId || req.headers["x-device-id"] || "",
          isTrusted: riskResult.isTrusted,
          environmentChanged: true,
        },
        userAgent: req.headers["user-agent"] || "",
        riskIndicators: riskResult.riskIndicators,
        otpRequired: true,
        otpRequestedAt: new Date(),
      });

      const challenge = await createOtpChallenge({
        userId: existingUser._id,
        email: normalizedEmail,
        phone: existingUser.registeredPhone,
        channel: "email",
        deviceMetadata: {
          userName: existingUser.name,
          browser: ua.browser.name,
          os: ua.os.name,
          ip,
          location: `${location.city}, ${location.country}`,
          deviceId: deviceId || req.headers["x-device-id"] || "",
        },
        ip,
        loginEventId: loginEvent._id,
      });

      return res.status(200).json({
        otpRequired: true,
        challengeId: challenge.challengeId,
        channel: challenge.channel,
        maskedDestination: challenge.maskedDestination,
        resendCooldown: challenge.resendCooldown,
        expiresAt: challenge.expiresAt,
        devOtp: challenge.devOtp,
        message:
          "Additional verification required. We've sent a 6-digit code to your email.",
      });
    }

    // Risk passed (e.g. recognized trusted device with valid token)
    const { session, token } = await createSession({
      user: existingUser,
      deviceId: deviceId || req.headers["x-device-id"] || "",
      trustedDeviceId: riskResult.trustedDeviceDoc?._id || null,
      deviceName: deviceName || ua.device.name,
      browser: ua.browser,
      os: ua.os,
      deviceType: ua.device.type,
      ip,
      location,
    });

    const effectiveTheme = getEffectiveTheme(
      existingUser.themePreference || "auto"
    );

    existingUser.lastLoginAt = new Date();
    existingUser.lastLoginIp = ip;
    existingUser.lastLoginLocation = `${location.city}, ${location.country}`;
    await existingUser.save();

    await LoginEvent.create({
      userId: existingUser._id,
      email: normalizedEmail,
      authMethod: "email",
      status: "Success",
      ip,
      ipClassification,
      location,
      browser: ua.browser,
      os: ua.os,
      device: {
        type: ua.device.type,
        model: ua.device.model,
        name: deviceName || ua.device.name,
        deviceId: deviceId || req.headers["x-device-id"] || "",
        isTrusted: true,
        environmentChanged: false,
      },
      userAgent: req.headers["user-agent"] || "",
      sessionId: session._id,
      trustedDeviceId: riskResult.trustedDeviceDoc?._id || null,
      authenticatedAt: new Date(),
    });

    return res.status(200).json({
      otpRequired: false,
      result: existingUser,
      token,
      effectiveTheme,
      session: {
        _id: session._id,
        jwtId: session.jwtId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Authentication service error. Please try again." });
  }
};

/**
 * Verifies submitted OTP against a pending challenge.
 */
export const verifyOtp = async (req, res) => {
  try {
    const { challengeId, otp, trustDevice, deviceName } = req.body || {};

    if (!challengeId || !otp) {
      return res.status(400).json({ message: "Challenge ID and verification code are required" });
    }

    const ip = getClientIp(req);
    const ua = parseUserAgent(req.headers["user-agent"]);
    const verification = await verifyOtpChallenge(challengeId, otp);
    if (!verification.valid) {
      const challenge = await OtpChallenge.findOne({ challengeId });
      if (challenge?.loginEventId) {
        await LoginEvent.findByIdAndUpdate(challenge.loginEventId, {
          $set: { status: "OTP Failed", failureReason: verification.reason },
        });
      }
      return res.status(400).json({
        message:
          verification.reason === "OTP_EXPIRED"
            ? "Verification code has expired. Please request a new one."
            : verification.reason === "MAX_ATTEMPTS_EXCEEDED"
            ? "Maximum verification attempts exceeded. Please request a new code."
            : "Invalid verification code. Please check and try again.",
        reason: verification.reason,
        attemptsRemaining: verification.attemptsRemaining,
      });
    }

    const challenge = verification.challenge;
    const userDoc = await users.findById(challenge.userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User account not found" });
    }

    const location = await resolveLocation(ip);
    let trustedDeviceDoc = null;
    let rawDeviceToken = null;

    if (trustDevice) {
      const regResult = await registerTrustedDevice({
        userId: userDoc._id,
        deviceId:
          req.headers["x-device-id"] ||
          challenge.deviceMetadata?.deviceId ||
          "",
        deviceName: deviceName || ua.device.name,
        browser: ua.browser,
        os: ua.os,
        deviceType: ua.device.type,
        location,
        ip,
      });
      trustedDeviceDoc = regResult.deviceDoc;
      rawDeviceToken = regResult.rawToken;
    }

    const { session, token } = await createSession({
      user: userDoc,
      deviceId: req.headers["x-device-id"] || "",
      trustedDeviceId: trustedDeviceDoc?._id || null,
      deviceName: deviceName || ua.device.name,
      browser: ua.browser,
      os: ua.os,
      deviceType: ua.device.type,
      ip,
      location,
    });

    const effectiveTheme = getEffectiveTheme(userDoc.themePreference || "auto");

    userDoc.lastLoginAt = new Date();
    userDoc.lastLoginIp = ip;
    userDoc.lastLoginLocation = `${location.city}, ${location.country}`;
    await userDoc.save();

    // Update login event to success
    if (challenge.loginEventId) {
      await LoginEvent.findByIdAndUpdate(challenge.loginEventId, {
        $set: {
          status: "Success",
          otpSucceeded: true,
          otpVerifiedAt: new Date(),
          authenticatedAt: new Date(),
          sessionId: session._id,
          trustedDeviceId: trustedDeviceDoc?._id || null,
          "device.isTrusted": !!trustedDeviceDoc,
        },
      });
    }

    return res.status(200).json({
      result: userDoc,
      token,
      deviceToken: rawDeviceToken,
      effectiveTheme,
      session: {
        _id: session._id,
        jwtId: session.jwtId,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Verification failed. Please try again." });
  }
};

/**
 * Resends OTP for a pending challenge.
 */
export const resendOtp = async (req, res) => {
  try {
    const { challengeId, channel } = req.body || {};
    if (!challengeId) {
      return res.status(400).json({ message: "Challenge ID is required" });
    }
    const result = await resendChallengeOtp(challengeId, channel);
    if (!result.success) {
      return res.status(429).json({ message: result.message, cooldown: result.cooldown });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ message: "Could not resend OTP. Please try again." });
  }
};

/**
 * Cancels a pending OTP verification challenge.
 */
export const cancelOtp = async (req, res) => {
  try {
    const { challengeId } = req.body || {};
    if (!challengeId) {
      return res.status(400).json({ message: "Challenge ID is required" });
    }
    const challenge = await OtpChallenge.findOneAndUpdate(
      { challengeId, status: "PENDING" },
      { $set: { status: "CANCELLED" } },
      { new: true }
    );
    if (challenge?.loginEventId) {
      await LoginEvent.findByIdAndUpdate(challenge.loginEventId, {
        $set: { status: "Failed", failureReason: "USER_CANCELLED" },
      });
    }
    return res.status(200).json({ message: "Login attempt cancelled" });
  } catch (error) {
    return res.status(500).json({ message: "Error cancelling attempt" });
  }
};

/**
 * Retrieves theme preference and effective theme calculated for IST.
 */
export const getPreferences = async (req, res) => {
  try {
    const userDoc = await users.findById(req.userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }
    const preference = userDoc.themePreference || "auto";
    const effectiveTheme = getEffectiveTheme(preference);
    const istInfo = getISTTimeParts();

    return res.status(200).json({
      themePreference: preference,
      effectiveTheme,
      istInfo,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch preferences" });
  }
};

/**
 * Updates theme preference ('auto', 'light', or 'dark').
 */
export const updatePreferences = async (req, res) => {
  const { themePreference } = req.body;
  if (!["auto", "light", "dark"].includes(themePreference)) {
    return res.status(400).json({
      message: "Invalid theme preference. Must be auto, light, or dark.",
    });
  }

  try {
    const userDoc = await users.findByIdAndUpdate(
      req.userId,
      { $set: { themePreference } },
      { new: true }
    );
    const effectiveTheme = getEffectiveTheme(themePreference);

    return res.status(200).json({
      message: "Preferences updated successfully",
      themePreference: userDoc.themePreference,
      effectiveTheme,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update preferences" });
  }
};

/**
 * Logout current session.
 */
export const logout = async (req, res) => {
  try {
    if (req.currentJwtId) {
      await revokeSession(req.userId, req.currentJwtId);
    }
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Logout error" });
  }
};

/**
 * Logout all sessions for user.
 */
export const logoutAll = async (req, res) => {
  try {
    const revokedCount = await revokeUserSessions(req.userId);
    return res.status(200).json({ message: "All sessions logged out", count: revokedCount });
  } catch (error) {
    return res.status(500).json({ message: "Error logging out all sessions" });
  }
};

/**
 * Updates channel name / description.
 */
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
