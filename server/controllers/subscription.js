import Subscription from "../Modals/Subscription.js";
import { DOWNLOAD_CONFIG, getPlanDailyLimit } from "../config/downloadConfig.js";
import { SUBSCRIPTION_CONFIG } from "../config/subscriptionPlans.js";

/**
 * Get or initialize user's current subscription.
 */
export async function getOrCreateUserSubscription(userId) {
  let sub = await Subscription.findOne({ userId });
  const now = new Date();

  if (!sub) {
    sub = await Subscription.create({
      userId,
      plan: "Free",
      duration: "monthly",
      status: "ACTIVE",
      startDate: now,
      endDate: null,
      expiryDate: null,
      renewalDate: null,
      autoRenew: true,
      history: [
        {
          plan: "Free",
          action: "created",
          timestamp: now,
          details: "Default Free tier assigned",
        },
      ],
    });
  } else {
    const expiry = sub.expiryDate || sub.endDate;
    if (expiry && new Date(expiry) < now && sub.plan !== "Free") {
      // Check if a downgrade was scheduled
      const targetPlan = sub.scheduledDowngrade?.targetPlan || "Free";
      const prevPlan = sub.plan;

      sub.plan = targetPlan;
      sub.status = targetPlan === "Free" ? "ACTIVE" : "ACTIVE";
      sub.endDate = null;
      sub.expiryDate = null;
      sub.scheduledDowngrade = null;

      sub.history.push({
        plan: targetPlan,
        action: "expired",
        timestamp: now,
        details: `Subscription for ${prevPlan} expired; transitioned to ${targetPlan}`,
      });
      await sub.save();
    }
  }
  return sub;
}

/**
 * Controller: GET /subscription/current
 */
export const getCurrentSubscription = async (req, res) => {
  try {
    const sub = await getOrCreateUserSubscription(req.userId);
    const planConfig = SUBSCRIPTION_CONFIG.PLANS[sub.plan] || SUBSCRIPTION_CONFIG.PLANS.Free;
    const downloadLimit = getPlanDailyLimit(sub.plan);

    return res.status(200).json({
      subscription: {
        id: sub._id,
        plan: sub.plan,
        duration: sub.duration || "monthly",
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate || sub.expiryDate,
        expiryDate: sub.expiryDate || sub.endDate,
        renewalDate: sub.renewalDate,
        autoRenew: sub.autoRenew ?? true,
        dailyDownloadLimit: downloadLimit,
        dailyWatchLimitMinutes: planConfig.dailyWatchLimitMinutes,
        dailyWatchTimeUsed: sub.dailyWatchTimeMinutesUsed || 0,
        maxStreamingQuality: planConfig.maxStreamingQuality,
        features: planConfig.features,
        description: planConfig.description,
        isActive: sub.isActive(),
        scheduledDowngrade: sub.scheduledDowngrade,
        lastPaymentId: sub.lastPaymentId,
        invoiceNumber: sub.invoiceNumber,
      },
    });
  } catch (error) {
    console.error("[Subscription] Error getting subscription:", error.message);
    return res.status(500).json({ message: "Failed to retrieve subscription", error: error.message });
  }
};

/**
 * Controller: GET /subscription/plans
 */
export const getSubscriptionPlans = (req, res) => {
  return res.status(200).json({
    plans: SUBSCRIPTION_CONFIG.PLANS,
    durations: SUBSCRIPTION_CONFIG.DURATIONS,
    currency: SUBSCRIPTION_CONFIG.CURRENCY,
    currencySymbol: SUBSCRIPTION_CONFIG.CURRENCY_SYMBOL,
    duplicateWindowMinutes: DOWNLOAD_CONFIG.DUPLICATE_WINDOW_MINUTES,
  });
};

/**
 * Controller: POST /subscription/upgrade
 * Supports instant test tier switching or legacy upgrade
 */
export const upgradeSubscription = async (req, res) => {
  const { plan, duration = "monthly" } = req.body;
  const validPlans = Object.keys(SUBSCRIPTION_CONFIG.PLANS);

  if (!plan || !validPlans.includes(plan)) {
    return res.status(400).json({
      message: `Invalid plan specified. Allowed plans are: ${validPlans.join(", ")}`,
    });
  }

  try {
    const sub = await getOrCreateUserSubscription(req.userId);
    const previousPlan = sub.plan;
    const durationConfig = SUBSCRIPTION_CONFIG.DURATIONS[duration] || SUBSCRIPTION_CONFIG.DURATIONS.monthly;
    const durationDays = durationConfig.days || 30;

    sub.plan = plan;
    sub.duration = duration;
    sub.status = "ACTIVE";
    sub.startDate = new Date();
    sub.endDate = plan === "Free" ? null : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    sub.expiryDate = sub.endDate;
    sub.renewalDate = sub.endDate;
    sub.autoRenew = true;
    sub.scheduledDowngrade = null;

    const action = previousPlan === plan ? "renewed" : "upgraded";
    sub.history.push({
      plan,
      action: action === "renewed" ? "renewed" : "upgraded",
      timestamp: new Date(),
      details: `Plan switched from ${previousPlan} to ${plan} (${duration})`,
    });

    await sub.save();

    const planConfig = SUBSCRIPTION_CONFIG.PLANS[plan];
    return res.status(200).json({
      message: `Successfully updated plan to ${plan}`,
      subscription: {
        id: sub._id,
        plan: sub.plan,
        duration: sub.duration,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        expiryDate: sub.expiryDate,
        dailyDownloadLimit: planConfig.downloadLimit,
        features: planConfig.features,
      },
    });
  } catch (error) {
    console.error("[Subscription] Upgrade error:", error.message);
    return res.status(500).json({ message: "Failed to update subscription", error: error.message });
  }
};

/**
 * Controller: POST /subscription/device
 */
export const registerDevice = async (req, res) => {
  const { deviceId, deviceName } = req.body;
  if (!deviceId) {
    return res.status(400).json({ message: "Device ID is required" });
  }

  try {
    const sub = await getOrCreateUserSubscription(req.userId);
    const existing = sub.registeredDevices.find((d) => d.deviceId === deviceId);

    if (existing) {
      existing.lastUsedAt = new Date();
      if (deviceName) existing.deviceName = deviceName;
      await sub.save();
      return res.status(200).json({ message: "Device verified", registeredDevices: sub.registeredDevices });
    }

    if (
      DOWNLOAD_CONFIG.DEVICE_RESTRICTIONS_ENABLED &&
      sub.registeredDevices.length >= DOWNLOAD_CONFIG.MAX_REGISTERED_DEVICES
    ) {
      return res.status(403).json({
        message: `Maximum registered devices limit reached (${DOWNLOAD_CONFIG.MAX_REGISTERED_DEVICES}). Please remove a device first.`,
      });
    }

    sub.registeredDevices.push({
      deviceId,
      deviceName: deviceName || "Browser Session",
      registeredAt: new Date(),
      lastUsedAt: new Date(),
    });

    await sub.save();
    return res.status(201).json({ message: "Device registered successfully", registeredDevices: sub.registeredDevices });
  } catch (error) {
    console.error("[Subscription] Device registration error:", error.message);
    return res.status(500).json({ message: "Device registration failed", error: error.message });
  }
};
