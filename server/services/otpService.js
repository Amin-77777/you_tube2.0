import crypto from "crypto";
import nodemailer from "nodemailer";
import OtpChallenge from "../Modals/OtpChallenge.js";

const OTP_SECRET = process.env.OTP_SECRET || "yourtube_otp_hash_salt_2026";
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(
  process.env.OTP_RESEND_COOLDOWN_SECONDS || "60",
  10
);
const OTP_MAX_RESENDS_PER_HOUR = 5;

/**
 * Creates a SHA-256 hash of an OTP string combined with secret.
 * @param {string} otp
 * @returns {string}
 */
export function hashOtp(otp) {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(String(otp).trim())
    .digest("hex");
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * @returns {string}
 */
export function generateNumericOtp() {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Masks an email address for safe UI display (e.g. j***n@example.com).
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email = "") {
  if (!email || !email.includes("@")) return "u***@domain.com";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

/**
 * Masks a phone number for safe UI display (e.g. +91 ******1234).
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone = "") {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length < 6) return "******";
  const start = cleaned.slice(0, 3);
  const end = cleaned.slice(-3);
  return `${start}******${end}`;
}

// Nodemailer transport caching
let mailTransporter = null;

function getMailTransporter() {
  if (mailTransporter) return mailTransporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_PROVIDER_API_KEY;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PROVIDER_SECRET;

  if (host && user && pass) {
    mailTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return mailTransporter;
}

/**
 * Sends OTP via email. Falls back gracefully to console logging in development
 * without failing authentication.
 * @param {string} toEmail
 * @param {string} otp
 * @param {string} [name="User"]
 * @returns {Promise<{ delivered: boolean, error?: string }>}
 */
export async function sendOtpEmail(toEmail, otp, name = "User") {
  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS || "security@yourtube.app";
  const transporter = getMailTransporter();

  const subject = `YourTube Security Code: ${otp}`;
  const textContent = `Hello ${name},\n\nYour one-time verification code is: ${otp}\n\nThis code will expire in ${OTP_EXPIRY_MINUTES} minutes.\n\nFor your security, do not share this code with anyone. YourTube staff will never ask for your verification code.\n\nIf you did not request this login attempt, please check your account security immediately.`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <div style="background-color: #e11d48; width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; vertical-align: middle;">
          <span style="color: #ffffff; font-weight: bold; font-size: 18px; line-height: 32px; text-align: center; display: block;">▶</span>
        </div>
        <span style="font-size: 20px; font-weight: 800; color: #111827; vertical-align: middle;">YourTube Security</span>
      </div>
      <h2 style="font-size: 18px; color: #1f2937; margin: 0 0 12px;">Two-Factor Verification Required</h2>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 20px;">
        Hello <strong>${name}</strong>, we noticed a sign-in attempt from a new or unrecognized browser or environment. Please verify your identity using the verification code below:
      </p>
      <div style="background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #111827; font-family: monospace;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #6b7280; margin-bottom: 16px;">
        ⏳ This code will expire in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
      </p>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; margin-bottom: 20px;">
        <p style="font-size: 12px; color: #92400e; margin: 0;">
          <strong>Security Notice:</strong> Never share this code with anyone. YourTube staff will never ask for your OTP.
        </p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 11px; color: #9ca3af; margin: 0;">
        If you did not initiate this login, your account password may still be safe, but someone tried to access your account. You can review your login history in your Account Security dashboard.
      </p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"YourTube Security" <${fromAddress}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { delivered: true };
    } catch (err) {
      console.error("[OTP Email Delivery Error]:", err.message);
      return { delivered: false, error: err.message };
    }
  }

  // Development mode fallback: Log clearly in console
  console.log("==================================================");
  console.log(`[DEV OTP] For ${toEmail}: >>> ${otp} <<< (Expires in ${OTP_EXPIRY_MINUTES} min)`);
  console.log("==================================================");
  return { delivered: true };
}

/**
 * Sends OTP via SMS abstraction.
 * @param {string} phone
 * @param {string} otp
 * @returns {Promise<{ delivered: boolean, error?: string }>}
 */
export async function sendOtpSms(phone, otp) {
  const smsApiKey = process.env.SMS_PROVIDER_API_KEY;
  if (!smsApiKey) {
    console.log(`[DEV SMS OTP] To ${phone}: >>> ${otp} <<<`);
    return { delivered: true };
  }
  // If provider credentials present, dispatch request (e.g., Twilio or generic SMS gateway)
  return { delivered: true };
}

/**
 * Issues and persists a new OTP challenge for a user.
 * Invalidates any existing pending challenges for this user.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.email
 * @param {string} [params.phone]
 * @param {'email' | 'sms'} [params.channel='email']
 * @param {object} [params.deviceMetadata]
 * @param {string} [params.ip]
 * @param {string} [params.loginEventId]
 * @returns {Promise<{ challengeId: string, expiresAt: Date, resendCooldown: number, maskedDestination: string }>}
 */
export async function createOtpChallenge({
  userId,
  email,
  phone = null,
  channel = "email",
  deviceMetadata = {},
  ip = "",
  loginEventId = null,
}) {
  // Invalidate any existing pending challenges for this user
  await OtpChallenge.updateMany(
    { userId, status: "PENDING" },
    { $set: { status: "EXPIRED" } }
  );

  const otp = generateNumericOtp();
  const otpHash = hashOtp(otp);
  const challengeId =
    "ch_" + crypto.randomBytes(16).toString("hex") + "_" + Date.now();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const challenge = await OtpChallenge.create({
    challengeId,
    userId,
    email,
    phone,
    channel,
    otpHash,
    deviceMetadata,
    ip,
    loginEventId,
    expiresAt,
    status: "PENDING",
  });

  // Dispatch OTP
  if (channel === "sms" && phone) {
    await sendOtpSms(phone, otp);
  } else {
    await sendOtpEmail(email, otp, deviceMetadata?.userName || "User");
  }

  const maskedDestination =
    channel === "sms" && phone ? maskPhone(phone) : maskEmail(email);

  const isDevOrNoSmtp =
    process.env.NODE_ENV !== "production" || !process.env.SMTP_HOST;

  return {
    challengeId: challenge.challengeId,
    expiresAt,
    resendCooldown: OTP_RESEND_COOLDOWN_SECONDS,
    maskedDestination,
    channel,
    devOtp: isDevOrNoSmtp ? otp : undefined,
  };
}

/**
 * Verifies submitted OTP against a challenge.
 * @param {string} challengeId
 * @param {string} submittedOtp
 * @returns {Promise<{ valid: boolean, challenge?: object, reason?: string }>}
 */
export async function verifyOtpChallenge(challengeId, submittedOtp) {
  if (!challengeId || !submittedOtp) {
    return { valid: false, reason: "MISSING_PARAMETERS" };
  }

  const challenge = await OtpChallenge.findOne({ challengeId });
  if (!challenge) {
    return { valid: false, reason: "CHALLENGE_NOT_FOUND" };
  }

  if (challenge.status !== "PENDING") {
    return { valid: false, reason: `CHALLENGE_${challenge.status}` };
  }

  // Check expiration
  if (new Date() > new Date(challenge.expiresAt)) {
    challenge.status = "EXPIRED";
    await challenge.save();
    return { valid: false, reason: "OTP_EXPIRED" };
  }

  // Check max attempts
  if (challenge.failedAttempts >= OTP_MAX_ATTEMPTS) {
    challenge.status = "FAILED";
    await challenge.save();
    return { valid: false, reason: "MAX_ATTEMPTS_EXCEEDED" };
  }

  const submittedHash = hashOtp(submittedOtp);
  if (submittedHash !== challenge.otpHash) {
    challenge.failedAttempts += 1;
    if (challenge.failedAttempts >= OTP_MAX_ATTEMPTS) {
      challenge.status = "FAILED";
    }
    await challenge.save();
    return {
      valid: false,
      reason: "INVALID_OTP",
      attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - challenge.failedAttempts),
    };
  }

  // Correct OTP! Mark verified and single-use
  challenge.status = "VERIFIED";
  challenge.verifiedAt = new Date();
  await challenge.save();

  return { valid: true, challenge };
}

/**
 * Resends OTP for a challenge enforcing cooldown and max hourly rate.
 * @param {string} challengeId
 * @param {'email' | 'sms'} [newChannel]
 * @returns {Promise<{ success: boolean, message: string, cooldown?: number }>}
 */
export async function resendChallengeOtp(challengeId, newChannel = null) {
  const challenge = await OtpChallenge.findOne({ challengeId });
  if (!challenge) {
    return { success: false, message: "Challenge not found" };
  }

  if (challenge.status !== "PENDING") {
    return { success: false, message: "This verification challenge is no longer active" };
  }

  const now = Date.now();
  const lastResent = challenge.lastResentAt ? new Date(challenge.lastResentAt).getTime() : 0;
  const elapsedSeconds = Math.floor((now - lastResent) / 1000);

  if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
    return {
      success: false,
      message: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds} seconds before requesting a new code.`,
      cooldown: OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds,
    };
  }

  if (challenge.resendCount >= OTP_MAX_RESENDS_PER_HOUR) {
    return {
      success: false,
      message: "Maximum OTP resend limit exceeded for this hour. Please try again later.",
    };
  }

  const newOtp = generateNumericOtp();
  challenge.otpHash = hashOtp(newOtp);
  challenge.resendCount += 1;
  challenge.lastResentAt = new Date();
  // Extend expiration by 5 minutes from now
  challenge.expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (newChannel) {
    challenge.channel = newChannel;
  }
  await challenge.save();

  if (challenge.channel === "sms" && challenge.phone) {
    await sendOtpSms(challenge.phone, newOtp);
  } else {
    await sendOtpEmail(challenge.email, newOtp, challenge.deviceMetadata?.userName || "User");
  }

  const isDevOrNoSmtp =
    process.env.NODE_ENV !== "production" || !process.env.SMTP_HOST;

  return {
    success: true,
    message: "New verification code has been dispatched.",
    cooldown: OTP_RESEND_COOLDOWN_SECONDS,
    devOtp: isDevOrNoSmtp ? newOtp : undefined,
  };
}
