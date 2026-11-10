import crypto from "crypto";
import jwt from "jsonwebtoken";
import Session from "../Modals/Session.js";

const JWT_SECRET = process.env.JWT_SECRET || "yourtube_jwt_super_secret_key_2026";
const SESSION_EXPIRY_DAYS = 30;

/**
 * Creates an active session for a user and returns a signed JWT containing session ID (jwtId).
 * @param {object} params
 * @param {object} params.user
 * @param {string} [params.deviceId]
 * @param {string} [params.trustedDeviceId]
 * @param {string} [params.deviceName]
 * @param {object} [params.browser]
 * @param {object} [params.os]
 * @param {string} [params.deviceType]
 * @param {string} [params.ip]
 * @param {object} [params.location]
 * @returns {Promise<{ session: object, token: string }>}
 */
export async function createSession({
  user,
  deviceId = "",
  trustedDeviceId = null,
  deviceName = "Web Browser",
  browser = { name: "Unknown", version: "" },
  os = { name: "Unknown", version: "" },
  deviceType = "Desktop",
  ip = "",
  location = { city: "Unknown", region: "Unknown", country: "Unknown" },
}) {
  const jwtId = "sess_" + crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const session = await Session.create({
    userId: user._id,
    jwtId,
    deviceId,
    trustedDeviceId,
    deviceName,
    browser,
    os,
    deviceType,
    ip,
    location,
    expiresAt,
    lastActivityAt: new Date(),
    revoked: false,
  });

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      sid: jwtId,
    },
    JWT_SECRET,
    { expiresIn: `${SESSION_EXPIRY_DAYS}d` }
  );

  return { session, token };
}

/**
 * Validates session by jwtId: ensures session exists, is not revoked, and is not expired.
 * Updates lastActivityAt.
 * @param {string} jwtId
 * @returns {Promise<object | null>}
 */
export async function validateSession(jwtId) {
  if (!jwtId) return null;

  const session = await Session.findOne({
    jwtId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (session) {
    // Throttled update of lastActivity (every 5 mins)
    const now = Date.now();
    if (now - new Date(session.lastActivityAt).getTime() > 5 * 60 * 1000) {
      session.lastActivityAt = new Date();
      await session.save();
    }
    return session;
  }

  return null;
}

/**
 * Revokes a session by jwtId or by session _id.
 * @param {string} userId
 * @param {string} identifier (can be jwtId or session _id)
 * @returns {Promise<boolean>}
 */
export async function revokeSession(userId, identifier) {
  const filter = {
    userId,
    revoked: false,
    $or: [{ jwtId: identifier }],
  };
  if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
    filter.$or.push({ _id: identifier });
  }

  const result = await Session.findOneAndUpdate(
    filter,
    { $set: { revoked: true, revokedAt: new Date() } },
    { new: true }
  );

  return !!result;
}

/**
 * Revokes all sessions for a user, or all other sessions except currentSessionId.
 * @param {string} userId
 * @param {string} [exceptJwtId]
 * @returns {Promise<number>}
 */
export async function revokeUserSessions(userId, exceptJwtId = null) {
  const query = { userId, revoked: false };
  if (exceptJwtId) {
    query.jwtId = { $ne: exceptJwtId };
  }

  const result = await Session.updateMany(query, {
    $set: { revoked: true, revokedAt: new Date() },
  });

  return result.modifiedCount;
}

/**
 * Lists all active (unrevoked, unexpired) sessions for a user.
 * @param {string} userId
 * @param {string} [currentJwtId]
 * @returns {Promise<Array>}
 */
export async function listUserSessions(userId, currentJwtId = null) {
  const now = new Date();
  const sessions = await Session.find({
    userId,
    revoked: false,
    expiresAt: { $gt: now },
  }).sort({ lastActivityAt: -1 });

  return sessions.map((sess) => ({
    _id: sess._id,
    jwtId: sess.jwtId,
    deviceName: sess.deviceName,
    browser: sess.browser,
    os: sess.os,
    deviceType: sess.deviceType,
    ip: sess.ip,
    location: sess.location,
    createdAt: sess.createdAt,
    lastActivityAt: sess.lastActivityAt,
    expiresAt: sess.expiresAt,
    isCurrent: currentJwtId ? sess.jwtId === currentJwtId : false,
  }));
}
