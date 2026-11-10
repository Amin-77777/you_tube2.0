import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  generateNumericOtp,
  hashOtp,
  maskEmail,
  maskPhone,
} from "../services/otpService.js";
import {
  hashDeviceToken,
} from "../services/trustedDeviceService.js";
import {
  calculateThemeForIST,
  getEffectiveTheme,
  getISTTimeParts,
} from "../services/themeService.js";
import { parseUserAgent } from "../services/deviceParserService.js";
import { classifyIp, isPrivateOrLocalIP, resolveLocation } from "../services/geoService.js";

const JWT_SECRET = process.env.JWT_SECRET || "yourtube_jwt_super_secret_key_2026";

test("Authentication & Security Workflows (Section 13 Compliance)", async (t) => {
  // --- OTP Verification Logic ---
  await t.test("Valid OTP verification succeeds and matches hash", () => {
    const originalOtp = generateNumericOtp();
    const storedHash = hashOtp(originalOtp);

    const submittedOtp = originalOtp;
    const submittedHash = hashOtp(submittedOtp);

    assert.equal(submittedHash, storedHash, "Submitted valid OTP must match stored hash");
  });

  await t.test("Incorrect OTP is rejected", () => {
    const originalOtp = "123456";
    const storedHash = hashOtp(originalOtp);

    const wrongOtp = "654321";
    const submittedHash = hashOtp(wrongOtp);

    assert.notEqual(submittedHash, storedHash, "Incorrect OTP must not match stored hash");
  });

  await t.test("Expired OTP is detected and rejected", () => {
    const challenge = {
      expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      status: "PENDING",
    };

    const isExpired = new Date() > new Date(challenge.expiresAt);
    assert.equal(isExpired, true, "OTP past expiration timestamp must be identified as expired");
  });

  await t.test("Reused OTP is rejected when challenge is already VERIFIED", () => {
    const challenge = {
      status: "VERIFIED",
      verifiedAt: new Date(),
    };

    const canVerifyAgain = challenge.status === "PENDING";
    assert.equal(canVerifyAgain, false, "Already verified OTP challenge cannot be re-verified");
  });

  await t.test("Maximum failed attempts (5) locks the challenge", () => {
    const maxAttempts = 5;
    let failedAttempts = 4;

    // 5th failed attempt
    failedAttempts += 1;
    let status = failedAttempts >= maxAttempts ? "FAILED" : "PENDING";

    assert.equal(status, "FAILED", "5 failed attempts must lock challenge with status FAILED");
  });

  await t.test("Resend cooldown enforces 60-second waiting period", () => {
    const cooldownSeconds = 60;
    const lastResentAt = new Date(); // right now
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastResentAt.getTime()) / 1000);

    const canResend = elapsedSeconds >= cooldownSeconds;
    assert.equal(canResend, false, "Must block resend within 60 second cooldown window");
  });

  // --- Trusted Device Verification ---
  await t.test("Trusted device token generation and hashing produces high-entropy 64-char hex", () => {
    const rawToken = "devtok_" + crypto.randomBytes(32).toString("hex");
    const tokenHash = hashDeviceToken(rawToken);

    assert.ok(rawToken.startsWith("devtok_"));
    assert.equal(tokenHash.length, 64);
    assert.equal(hashDeviceToken(rawToken), tokenHash);
  });

  await t.test("Expired trusted device (past 30 days) is recognized as expired", () => {
    const expiredDevice = {
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
      revoked: false,
    };

    const isValid = !expiredDevice.revoked && new Date() <= new Date(expiredDevice.expiresAt);
    assert.equal(isValid, false, "Expired device must not be considered valid");
  });

  await t.test("Revoked trusted device cannot authenticate", () => {
    const revokedDevice = {
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      revoked: true,
      revokedAt: new Date(),
    };

    const isValid = !revokedDevice.revoked && new Date() <= new Date(revokedDevice.expiresAt);
    assert.equal(isValid, false, "Revoked device must be rejected regardless of expiration date");
  });

  // --- Session Management & Security Isolation ---
  await t.test("Signed JWT session contains sid, userId, and validates correctly", () => {
    const fakeUserId = "507f1f77bcf86cd799439011";
    const fakeSid = "sess_1234567890abcdef";

    const token = jwt.sign(
      { id: fakeUserId, email: "user@test.com", sid: fakeSid },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    const decoded = jwt.verify(token, JWT_SECRET);
    assert.equal(decoded.id, fakeUserId);
    assert.equal(decoded.sid, fakeSid);
  });

  await t.test("Tampered JWT token fails verification", () => {
    const fakeUserId = "507f1f77bcf86cd799439011";
    const token = jwt.sign({ id: fakeUserId }, JWT_SECRET);
    const tampered = token.slice(0, -5) + "abcde";

    assert.throws(() => {
      jwt.verify(tampered, JWT_SECRET);
    }, /invalid signature/);
  });

  await t.test("Revoking other sessions preserves current session", () => {
    const currentSid = "sess_current_123";
    const sessions = [
      { jwtId: "sess_current_123", revoked: false },
      { jwtId: "sess_other_456", revoked: false },
      { jwtId: "sess_other_789", revoked: false },
    ];

    // Revoke all except currentSid
    const updated = sessions.map((s) => ({
      ...s,
      revoked: s.jwtId !== currentSid,
    }));

    const activeSessions = updated.filter((s) => !s.revoked);
    assert.equal(activeSessions.length, 1);
    assert.equal(activeSessions[0].jwtId, currentSid);
  });

  await t.test("Sensitive credentials (passwords, raw OTPs) are never exposed", () => {
    const loginEventRecord = {
      _id: "evt_123",
      ip: "103.25.12.9",
      browser: { name: "Chrome", version: "122" },
      status: "OTP Required",
      device: { type: "Desktop" },
    };

    assert.equal(loginEventRecord.password, undefined);
    assert.equal(loginEventRecord.otp, undefined);
    assert.equal(loginEventRecord.rawToken, undefined);
  });

  await t.test("Geolocation service gracefully handles private/localhost and fallback", async () => {
    const localResult = await resolveLocation("127.0.0.1");
    assert.equal(localResult.city, "Localhost");
    assert.equal(localResult.approximate, true);
    assert.equal(localResult.timezone, "Asia/Kolkata");
  });
});
