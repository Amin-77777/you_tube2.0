import Subscription from "../Modals/Subscription.js";
import { DOWNLOAD_CONFIG, getPlanDailyLimit } from "../config/downloadConfig.js";

/**
 * Get or initialize user's current subscription.
 */
export async function getOrCreateUserSubscription(userId) {
  let sub = await Subscription.findOne({ userId });
  if (!sub) {
    sub = await Subscription.create({
      userId,
      plan: "Free",
      status: "active",
      startDate: new Date(),
      endDate: null,
      history: [
        {
          plan: "Free",
          action: "created",
          timestamp: new Date(),
          details: "Default Free tier assigned",
        },
      ],
    });
  } else if (sub.endDate && new Date(sub.endDate) < new Date() && sub.plan !== "Free") {
    // If paid plan expired, downgrade to Free automatically
    sub.plan = "Free";
    sub.status = "active";
    sub.endDate = null;
    sub.history.push({
      plan: "Free",
      action: "expired",
      timestamp: new Date(),
      details: "Previous subscription expired, reverted to Free plan",
    });
    await sub.save();
  }
  return sub;
}

/**
 * Controller: GET /subscription/current
 */
export const getCurrentSubscription = async (req, res) => {
  try {
    const sub = await getOrCreateUserSubscription(req.userId);
    const planConfig = DOWNLOAD_CONFIG.PLANS[sub.plan] || DOWNLOAD_CONFIG.PLANS.Free;

    return res.status(200).json({
      subscription: {
        id: sub._id,
        plan: sub.plan,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        dailyDownloadLimit: planConfig.dailyLimit,
        features: planConfig.features,
        description: planConfig.description,
        isActive: sub.isActive(),
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
    plans: DOWNLOAD_CONFIG.PLANS,
    duplicateWindowMinutes: DOWNLOAD_CONFIG.DUPLICATE_WINDOW_MINUTES,
  });
};

/**
 * Controller: POST /subscription/upgrade
 */
export const upgradeSubscription = async (req, res) => {
  const { plan } = req.body;
  const validPlans = Object.keys(DOWNLOAD_CONFIG.PLANS);

  if (!plan || !validPlans.includes(plan)) {
    return res.status(400).json({
      message: `Invalid plan specified. Allowed plans are: ${validPlans.join(", ")}`,
    });
  }

  try {
    const sub = await getOrCreateUserSubscription(req.userId);
    const previousPlan = sub.plan;

    sub.plan = plan;
    sub.status = "active";
    sub.startDate = new Date();
    // 30 days validity for paid tiers, null for perpetual Free
    sub.endDate = plan === "Free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const action = previousPlan === plan ? "renewed" : "upgraded";
    sub.history.push({
      plan,
      action: action === "renewed" ? "created" : "upgraded",
      timestamp: new Date(),
      details: `Plan changed from ${previousPlan} to ${plan}`,
    });

    await sub.save();

    const planConfig = DOWNLOAD_CONFIG.PLANS[plan];
    return res.status(200).json({
      message: `Successfully changed plan to ${plan}`,
      subscription: {
        id: sub._id,
        plan: sub.plan,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        dailyDownloadLimit: planConfig.dailyLimit,
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
 * Support for device registration restriction (Section 16)
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
