import LoginEvent from "../Modals/LoginEvent.js";
import TrustedDevice from "../Modals/TrustedDevice.js";
import { validateDeviceToken } from "./trustedDeviceService.js";

/**
 * Evaluates the risk level for a login attempt.
 * Determines whether additional OTP verification is required based on device trust,
 * IP familiarity, browser consistency, and historical environment signals.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} [params.rawDeviceToken]
 * @param {string} [params.deviceId]
 * @param {object} params.browser
 * @param {object} params.os
 * @param {string} params.ip
 * @param {object} params.location
 * @returns {Promise<{ otpRequired: boolean, riskIndicators: string[], isTrusted: boolean, trustedDeviceDoc: object | null }>}
 */
export async function evaluateLoginRisk({
  userId,
  rawDeviceToken = null,
  deviceId = "",
  browser = { name: "Unknown", version: "", family: "Unknown" },
  os = { name: "Unknown", version: "" },
  ip = "",
  location = { city: "Unknown", region: "Unknown", country: "Unknown" },
}) {
  const riskIndicators = [];
  let isTrusted = false;
  let trustedDeviceDoc = null;

  // 1. Check if client provided a valid trusted device token
  if (rawDeviceToken) {
    trustedDeviceDoc = await validateDeviceToken(userId, rawDeviceToken);
    if (trustedDeviceDoc) {
      isTrusted = true;
    } else {
      riskIndicators.push("INVALID_OR_EXPIRED_DEVICE_TOKEN");
    }
  }

  // 2. Count active trusted devices for this user
  const activeTrustedDevicesCount = await TrustedDevice.countDocuments({
    userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  // 3. If account has NO active trusted devices -> Initial login or all revoked
  if (activeTrustedDevicesCount === 0) {
    riskIndicators.push("NO_TRUSTED_DEVICES");
    return {
      otpRequired: true,
      riskIndicators,
      isTrusted: false,
      trustedDeviceDoc: null,
    };
  }

  // 4. If device is already trusted with valid unexpired token
  if (isTrusted && trustedDeviceDoc) {
    // If the country has changed drastically compared to when device was trusted
    if (
      trustedDeviceDoc.location?.country &&
      trustedDeviceDoc.location.country !== "Unknown" &&
      location?.country &&
      location.country !== "Unknown" &&
      trustedDeviceDoc.location.country !== location.country
    ) {
      riskIndicators.push("COUNTRY_MISMATCH_ON_TRUSTED_DEVICE");
      return {
        otpRequired: true,
        riskIndicators,
        isTrusted: true,
        trustedDeviceDoc,
      };
    }

    // Valid trusted device on acceptable network -> Bypass OTP
    return {
      otpRequired: false,
      riskIndicators: [],
      isTrusted: true,
      trustedDeviceDoc,
    };
  }

  // 5. Untrusted device: inspect past login events
  riskIndicators.push("UNTRUSTED_DEVICE");

  const pastSuccessfulLogins = await LoginEvent.find({
    userId,
    status: "Success",
  })
    .sort({ createdAt: -1 })
    .limit(20);

  if (pastSuccessfulLogins.length === 0) {
    riskIndicators.push("NO_PRIOR_SUCCESSFUL_LOGINS");
    return {
      otpRequired: true,
      riskIndicators,
      isTrusted: false,
      trustedDeviceDoc: null,
    };
  }

  // Check browser familiarity
  const knownBrowser = pastSuccessfulLogins.some(
    (e) =>
      e.browser?.name &&
      browser.name &&
      e.browser.name.toLowerCase() === browser.name.toLowerCase()
  );
  if (!knownBrowser) {
    riskIndicators.push("NEW_BROWSER");
  }

  // Check IP familiarity
  const knownIp = pastSuccessfulLogins.some((e) => e.ip === ip);
  if (!knownIp) {
    riskIndicators.push("NEW_IP_ADDRESS");
  }

  // Check location familiarity
  if (location?.city && location.city !== "Unknown") {
    const knownCity = pastSuccessfulLogins.some(
      (e) =>
        e.location?.city &&
        e.location.city.toLowerCase() === location.city.toLowerCase()
    );
    if (!knownCity) {
      riskIndicators.push("NEW_LOCATION_CITY");
    }
  }

  // Any recognized risk on an untrusted device requires OTP verification
  const otpRequired = riskIndicators.length > 0;

  return {
    otpRequired,
    riskIndicators,
    isTrusted: false,
    trustedDeviceDoc: null,
  };
}
