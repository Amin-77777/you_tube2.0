/**
 * In-memory sliding-window rate limiter middleware.
 * Zero external dependencies, concurrency-safe per Node process.
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 30, // Limit each IP / user to 30 requests per window
  message = "Too many download requests from this client. Please slow down.",
}) {
  const hits = new Map();

  // Periodic cleanup of stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const identifier = req.userId ? `user_${req.userId}` : `ip_${req.ip || req.socket.remoteAddress}`;
    const now = Date.now();

    const clientHits = hits.get(identifier) || [];
    const validHits = clientHits.filter((t) => now - t < windowMs);

    if (validHits.length >= max) {
      const oldestHit = validHits[0];
      const retryAfterSeconds = Math.ceil((oldestHit + windowMs - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        error: "RateLimitExceeded",
        message,
        retryAfterSeconds,
      });
    }

    validHits.push(now);
    hits.set(identifier, validHits);
    next();
  };
}
