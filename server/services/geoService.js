/**
 * Geolocation & IP resolution service
 * Resolves IP, detects IP family (IPv4 / IPv6), and obtains approximate location.
 */

// Simple in-memory cache for IP lookups to avoid external rate limits
const geoCache = new Map();

/**
 * Checks if an IP is a local / private / loopback IP.
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateOrLocalIP(ip) {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, "").trim();
  if (
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp === "localhost" ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp) ||
    cleanIp.startsWith("fc00:") ||
    cleanIp.startsWith("fe80:")
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts the real client IP address from request, taking proxy headers into account safely.
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  if (!req) return "127.0.0.1";

  // Check X-Forwarded-For header (first address is the original client)
  const xForwardedFor = req.headers?.["x-forwarded-for"];
  if (xForwardedFor) {
    const rawHeader = Array.isArray(xForwardedFor)
      ? xForwardedFor.join(",")
      : String(xForwardedFor);
    const clientIp = rawHeader.split(",")[0].trim();
    if (clientIp) {
      return clientIp.replace(/^::ffff:/, "");
    }
  }

  // Check standard proxy headers
  const cfConnectingIp = req.headers?.["cf-connecting-ip"];
  if (cfConnectingIp) {
    return String(cfConnectingIp).trim().replace(/^::ffff:/, "");
  }

  const xRealIp = req.headers?.["x-real-ip"];
  if (xRealIp) {
    return String(xRealIp).trim().replace(/^::ffff:/, "");
  }

  const rawIp = req.ip || req.socket?.remoteAddress || "127.0.0.1";
  return String(rawIp).replace(/^::ffff:/, "");
}

/**
 * Classifies an IP address as IPv4, IPv6, or Unknown.
 * @param {string} ip
 * @returns {'IPv4' | 'IPv6' | 'Unknown'}
 */
export function classifyIp(ip = "") {
  if (!ip) return "Unknown";
  if (ip.includes(":")) return "IPv6";
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return "IPv4";
  return "Unknown";
}

/**
 * Resolves approximate location for an IP address.
 * Uses safe in-memory cache and non-blocking fetch with fallback.
 * @param {string} ip
 * @returns {Promise<{ city: string, region: string, country: string, timezone: string, approximate: boolean }>}
 */
export async function resolveLocation(ip) {
  const cleanIp = (ip || "").replace(/^::ffff:/, "").trim();

  // If local / private IP
  if (isPrivateOrLocalIP(cleanIp)) {
    return {
      city: "Localhost",
      region: "Development",
      country: "Local Network",
      timezone: "Asia/Kolkata",
      approximate: true,
    };
  }

  // Check cache
  if (geoCache.has(cleanIp)) {
    return geoCache.get(cleanIp);
  }

  // If custom API key or provider is configured
  const apiKey = process.env.IP_GEOLOCATION_API_KEY;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const url = apiKey
      ? `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${cleanIp}`
      : `http://ip-api.com/json/${cleanIp}?fields=status,city,regionName,country,timezone`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" || data.country_name || data.country) {
        const result = {
          city: data.city || "Unknown",
          region: data.regionName || data.state_prov || "Unknown",
          country: data.country || data.country_name || "Unknown",
          timezone: data.timezone || "Asia/Kolkata",
          approximate: true,
        };
        geoCache.set(cleanIp, result);
        return result;
      }
    }
  } catch (err) {
    // Geolocation lookup failure must fail gracefully to Unknown without blocking authentication
  }

  const fallback = {
    city: "Unknown",
    region: "Unknown",
    country: "Unknown",
    timezone: "Asia/Kolkata",
    approximate: true,
  };
  geoCache.set(cleanIp, fallback);
  return fallback;
}
