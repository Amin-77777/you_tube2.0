import dotenv from "dotenv";
dotenv.config();

/**
 * Centralized Subscription Plans Configuration
 * Configurable via environment variables with fallback defaults.
 */
export const SUBSCRIPTION_CONFIG = {
  CURRENCY: process.env.SUBSCRIPTION_CURRENCY || "INR",
  CURRENCY_SYMBOL: process.env.SUBSCRIPTION_CURRENCY_SYMBOL || "₹",

  DURATIONS: {
    monthly: {
      id: "monthly",
      name: "Monthly",
      days: 30,
      discountMultiplier: 1.0,
      label: "/ month",
    },
    quarterly: {
      id: "quarterly",
      name: "Quarterly (3 Months)",
      days: 90,
      discountMultiplier: 0.9, // 10% discount
      label: "/ 3 months",
    },
    yearly: {
      id: "yearly",
      name: "Yearly (12 Months)",
      days: 365,
      discountMultiplier: 0.8, // 20% discount (best value)
      label: "/ year",
    },
  },

  PLANS: {
    Free: {
      id: "Free",
      name: "Free",
      tier: 0,
      baseMonthlyPrice: 0,
      monthlyPrice: 0,
      description: "Basic platform access with standard features",
      downloadLimit: parseInt(process.env.FREE_DOWNLOAD_LIMIT, 10) || 1,
      dailyDownloadLimit: parseInt(process.env.FREE_DOWNLOAD_LIMIT, 10) || 1,
      dailyWatchLimitMinutes: 60, // 60 mins/day
      maxStreamingQuality: "720p HD",
      accessLevel: "free",
      adStatus: "Standard Ads",
      maxDevices: 1,
      features: [
        "1 video download per day",
        "Standard 720p HD streaming",
        "Access to free community videos",
        "60 minutes daily watch time",
        "Standard playback speed",
      ],
    },
    Bronze: {
      id: "Bronze",
      name: "Bronze",
      tier: 1,
      baseMonthlyPrice: parseInt(process.env.BRONZE_MONTHLY_PRICE, 10) || 199,
      monthlyPrice: parseInt(process.env.BRONZE_MONTHLY_PRICE, 10) || 199,
      description: "Great for regular viewers who want more offline downloads",
      downloadLimit: parseInt(process.env.BRONZE_DOWNLOAD_LIMIT, 10) || 5,
      dailyDownloadLimit: parseInt(process.env.BRONZE_DOWNLOAD_LIMIT, 10) || 5,
      dailyWatchLimitMinutes: 180, // 3 hours/day
      maxStreamingQuality: "1080p Full HD",
      accessLevel: "bronze",
      adStatus: "Reduced Ads",
      maxDevices: 2,
      features: [
        "5 video downloads per day",
        "Full 1080p HD streaming",
        "Access to Bronze & Free videos",
        "180 minutes daily watch time",
        "Priority download speeds",
        "Reduced advertisements",
      ],
    },
    Silver: {
      id: "Silver",
      name: "Silver",
      tier: 2,
      baseMonthlyPrice: parseInt(process.env.SILVER_MONTHLY_PRICE, 10) || 499,
      monthlyPrice: parseInt(process.env.SILVER_MONTHLY_PRICE, 10) || 499,
      description: "Enhanced multimedia experience for active enthusiasts",
      downloadLimit: parseInt(process.env.SILVER_DOWNLOAD_LIMIT, 10) || 10,
      dailyDownloadLimit: parseInt(process.env.SILVER_DOWNLOAD_LIMIT, 10) || 10,
      dailyWatchLimitMinutes: 480, // 8 hours/day
      maxStreamingQuality: "1440p 2K Quad HD",
      accessLevel: "silver",
      adStatus: "Minimal Ads",
      maxDevices: 3,
      features: [
        "10 video downloads per day",
        "2K Quad HD streaming",
        "Access to Silver, Bronze & Free videos",
        "480 minutes daily watch time",
        "Ultra high-speed downloads",
        "Priority customer support",
      ],
    },
    Gold: {
      id: "Gold",
      name: "Gold VIP",
      tier: 3,
      baseMonthlyPrice: parseInt(process.env.GOLD_MONTHLY_PRICE, 10) || 999,
      monthlyPrice: parseInt(process.env.GOLD_MONTHLY_PRICE, 10) || 999,
      description: "Ultimate VIP access with all premium videos and maximum quota",
      downloadLimit: parseInt(process.env.GOLD_DOWNLOAD_LIMIT, 10) || 25,
      dailyDownloadLimit: parseInt(process.env.GOLD_DOWNLOAD_LIMIT, 10) || 25,
      dailyWatchLimitMinutes: 9999, // Unlimited
      maxStreamingQuality: "4K Ultra HD",
      accessLevel: "gold",
      adStatus: "100% Ad-Free",
      maxDevices: 5,
      features: [
        "25 video downloads per day",
        "Cinema-grade 4K Ultra HD",
        "All premium videos & masterclasses",
        "Unlimited daily watch time",
        "100% Ad-free uninterrupted playback",
        "Instant maximum-bandwidth downloads",
        "VIP Creator badge",
      ],
    },
  },
};

/**
 * Calculates exact price in base units (paise or cents) server-side
 */
export function calculatePlanPrice(planId, durationId = "monthly") {
  const plan = SUBSCRIPTION_CONFIG.PLANS[planId];
  if (!plan) throw new Error(`Invalid plan: ${planId}`);
  if (plan.baseMonthlyPrice === 0) return { amount: 0, amountInPaise: 0, duration: SUBSCRIPTION_CONFIG.DURATIONS.monthly };

  const duration = SUBSCRIPTION_CONFIG.DURATIONS[durationId] || SUBSCRIPTION_CONFIG.DURATIONS.monthly;
  let monthsCount = 1;
  if (durationId === "quarterly") monthsCount = 3;
  if (durationId === "yearly") monthsCount = 12;

  const rawAmount = plan.baseMonthlyPrice * monthsCount * duration.discountMultiplier;
  const roundedAmount = Math.round(rawAmount);
  const amountInPaise = roundedAmount * 100; // Razorpay expects amount in smallest currency subunit (paise)

  return {
    plan,
    duration,
    amount: roundedAmount,
    amountInPaise,
    amountPaise: amountInPaise,
    currency: SUBSCRIPTION_CONFIG.CURRENCY,
  };
}

/**
 * Access tier comparison helper
 */
export function hasRequiredAccess(userPlanName, requiredLevel) {
  const levels = { free: 0, bronze: 1, silver: 2, gold: 3 };
  const userPlan = SUBSCRIPTION_CONFIG.PLANS[userPlanName] || SUBSCRIPTION_CONFIG.PLANS.Free;
  const userTier = userPlan.tier;
  const reqTier = levels[requiredLevel?.toLowerCase()] ?? 0;
  return userTier >= reqTier;
}
