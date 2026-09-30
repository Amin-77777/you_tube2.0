import dotenv from "dotenv";
dotenv.config();

export const DOWNLOAD_CONFIG = {
  // Configurable download limits per plan (per day)
  PLANS: {
    Free: {
      name: "Free",
      dailyLimit: parseInt(process.env.FREE_DOWNLOAD_LIMIT, 10) || 1,
      price: 0,
      description: "Basic access with 1 video download per day",
      features: ["1 video download per day", "Standard streaming", "Community access"],
    },
    Bronze: {
      name: "Bronze",
      dailyLimit: parseInt(process.env.BRONZE_DOWNLOAD_LIMIT, 10) || 5,
      price: 4.99,
      description: "Great for regular viewers who want offline videos",
      features: ["5 video downloads per day", "HD streaming", "Priority download speeds"],
    },
    Silver: {
      name: "Silver",
      dailyLimit: parseInt(process.env.SILVER_DOWNLOAD_LIMIT, 10) || 10,
      price: 9.99,
      description: "Best for enthusiastic content consumers",
      features: ["10 video downloads per day", "Full HD streaming", "High priority downloads"],
    },
    Gold: {
      name: "Gold",
      dailyLimit: parseInt(process.env.GOLD_DOWNLOAD_LIMIT, 10) || 25,
      price: 19.99,
      description: "Ultimate access with maximum daily downloads",
      features: ["25 video downloads per day", "4K streaming", "Instant download access", "Premium badge"],
    },
  },

  // Time window in minutes where downloading the same video does not consume extra quota
  DUPLICATE_WINDOW_MINUTES: parseInt(process.env.DUPLICATE_WINDOW_MINUTES, 10) || 60,

  // Duration in seconds before a generated secure download token expires (default 15 mins)
  DOWNLOAD_TOKEN_EXPIRY_SECONDS: parseInt(process.env.DOWNLOAD_TOKEN_EXPIRY_SECONDS, 10) || 900,

  // Rate limiting settings for download APIs
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.DOWNLOAD_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    MAX_AUTH_REQUESTS: parseInt(process.env.DOWNLOAD_RATE_LIMIT_MAX, 10) || 30,
  },

  // Device restrictions
  DEVICE_RESTRICTIONS_ENABLED: process.env.DEVICE_RESTRICTIONS_ENABLED === "true",
  MAX_REGISTERED_DEVICES: parseInt(process.env.MAX_REGISTERED_DEVICES, 10) || 3,

  // Timezone for daily quota calculation (UTC by default, configurable)
  TIMEZONE: process.env.QUOTA_TIMEZONE || "UTC",
};

/**
 * Returns the daily download limit for a given plan name.
 * Defaults to Free limit if plan is not recognized.
 */
export function getPlanDailyLimit(planName) {
  const plan = DOWNLOAD_CONFIG.PLANS[planName] || DOWNLOAD_CONFIG.PLANS.Free;
  return plan.dailyLimit;
}

/**
 * Computes the UTC start and end bounds of the current day for quota calculation.
 */
export function getCurrentDayBounds() {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const resetAt = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  return { startOfDay, endOfDay, resetAt };
}
