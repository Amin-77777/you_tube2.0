import crypto from "crypto";
import TrustedDevice from "../Modals/TrustedDevice.js";

const DEFAULT_TRUST_DURATION_DAYS = parseInt(
  process.env.TRUSTED_DEVICE_DURATION_DAYS || "30",
  10
);

/**
 * Creates SHA-256 hash of device token.
 * @param {string} token
 * @returns {string}
 */
export function hashDeviceToken(token) {
  return crypto.createHash("sha256").update(String(token).trim()).digest("hex");
}

/**
 * Registers a new trusted device for a user.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} [params.deviceId]
 * @param {string} [params.deviceName]
 * @param {object} [params.browser]
 * @param {object} [params.os]
 * @param {string} [params.deviceType]
 * @param {object} [params.location]
 * @param {string} [params.ip]
 * @param {number} [params.durationDays]
 * @returns {Promise<{ rawToken: string, deviceDoc: object }>}
 */
export async function registerTrustedDevice({
  userId,
  deviceId = "",
  deviceName = "Trusted Device",
  browser = { name: "Unknown", version: "" },
  os = { name: "Unknown", version: "" },
  deviceType = "Desktop",
  location = { city: "Unknown", region: "Unknown", country: "Unknown" },
  ip = "",
  durationDays = DEFAULT_TRUST_DURATION_DAYS,
}) {
  const rawToken = "devtok_" + crypto.randomBytes(32).toString("hex");
  const tokenHash = hashDeviceToken(rawToken);

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const deviceDoc = await TrustedDevice.create({
    userId,
    tokenHash,
    deviceId,
    deviceName,
    browser,
    os,
    deviceType,
    location,
    lastIp: ip,
    expiresAt,
    lastUsedAt: new Date(),
    revoked: false,
  });

  return { rawToken, deviceDoc };
}

/**
 * Validates a submitted device token for a user.
 * @param {string} userId
 * @param {string} rawToken
 * @returns {Promise<object | null>} returns device doc if valid, unrevoked, unexpired; else null
 */
export async function validateDeviceToken(userId, rawToken) {
  if (!userId || !rawToken) return null;

  const tokenHash = hashDeviceToken(rawToken);
  const now = new Date();

  const device = await TrustedDevice.findOne({
    userId,
    tokenHash,
    revoked: false,
    expiresAt: { $gt: now },
  });

  if (device) {
    device.lastUsedAt = now;
    await device.save();
    return device;
  }

  return null;
}

/**
 * Revokes a specific trusted device by ID for a user.
 * @param {string} userId
 * @param {string} deviceRecordId
 * @returns {Promise<boolean>}
 */
export async function revokeTrustedDevice(userId, deviceRecordId) {
  const result = await TrustedDevice.findOneAndUpdate(
    { _id: deviceRecordId, userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } },
    { new: true }
  );
  return !!result;
}

/**
 * Revokes all trusted devices for a user.
 * @param {string} userId
 * @returns {Promise<number>} number of revoked devices
 */
export async function revokeAllTrustedDevices(userId) {
  const result = await TrustedDevice.updateMany(
    { userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } }
  );
  return result.modifiedCount;
}

/**
 * Lists all active (unrevoked and non-expired) trusted devices for a user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function listUserTrustedDevices(userId) {
  const now = new Date();
  return await TrustedDevice.find({
    userId,
    revoked: false,
    expiresAt: { $gt: now },
  }).sort({ lastUsedAt: -1 });
}
