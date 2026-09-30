import { SUBSCRIPTION_CONFIG, hasRequiredAccess } from "../config/subscriptionPlans.js";
import { getOrCreateUserSubscription } from "../controllers/subscription.js";
import Video from "../Modals/video.js";

/**
 * Checks whether a user can watch a specific video based on subscription tier
 */
export async function canWatchVideo(userId, video) {
  const videoAccess = video.accessLevel || "free";
  if (videoAccess === "free") {
    return { allowed: true, requiredPlan: "Free" };
  }

  if (!userId) {
    return {
      allowed: false,
      reason: "AuthenticationRequired",
      requiredPlan: videoAccess.charAt(0).toUpperCase() + videoAccess.slice(1),
      message: `Sign in and subscribe to the ${videoAccess.toUpperCase()} plan to watch this exclusive video.`,
    };
  }

  const sub = await getOrCreateUserSubscription(userId);
  const allowed = hasRequiredAccess(sub.plan, videoAccess);

  return {
    allowed,
    userPlan: sub.plan,
    requiredPlan: videoAccess.charAt(0).toUpperCase() + videoAccess.slice(1),
    reason: allowed ? null : "TierUpgradeRequired",
    message: allowed
      ? "Access granted"
      : `This video requires an active ${videoAccess.toUpperCase()} subscription. Your current plan is ${sub.plan}.`,
  };
}

/**
 * Returns supported streaming quality for a user plan
 */
export function getStreamingQuality(userPlanName) {
  const plan = SUBSCRIPTION_CONFIG.PLANS[userPlanName] || SUBSCRIPTION_CONFIG.PLANS.Free;
  return plan.maxStreamingQuality;
}

/**
 * Returns daily watch-time limit in minutes
 */
export function getDailyWatchLimit(userPlanName) {
  const plan = SUBSCRIPTION_CONFIG.PLANS[userPlanName] || SUBSCRIPTION_CONFIG.PLANS.Free;
  return plan.dailyWatchLimitMinutes;
}

/**
 * Middleware: Verify video playback access before streaming or loading video
 */
export const checkVideoPlaybackAccess = async (req, res, next) => {
  const videoId = req.params.videoId || req.params.id;
  if (!videoId) return next();

  try {
    const videoDoc = await Video.findById(videoId);
    if (!videoDoc) {
      return res.status(404).json({ message: "Video not found" });
    }

    const check = await canWatchVideo(req.userId, videoDoc);
    if (!check.allowed) {
      return res.status(403).json({
        error: "PremiumAccessRestricted",
        requiredPlan: check.requiredPlan,
        userPlan: check.userPlan || "Free",
        message: check.message,
        upgradeUrl: `/subscriptions?required=${check.requiredPlan}`,
      });
    }

    req.video = videoDoc;
    next();
  } catch (err) {
    console.error("[AccessControl] Verification error:", err.message);
    next();
  }
};
