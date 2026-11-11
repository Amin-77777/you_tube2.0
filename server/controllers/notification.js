import mongoose from "mongoose";
import Notification from "../Modals/Notification.js";

/**
 * GET /api/notifications
 * Fetch user notifications and unread count
 */
export const getNotifications = async (req, res) => {
  try {
    const authUser = req.user;
    const userId = authUser?._id || authUser?.id || req.headers["x-user-id"];

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required to view notifications." });
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({ userId, read: false }),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("[getNotifications] Error:", error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

/**
 * PUT /api/notifications/:notificationId/read
 * Mark single notification as read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const authUser = req.user;
    const userId = authUser?._id || authUser?.id || req.headers["x-user-id"];

    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Valid notification ID is required." });
    }

    await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { read: true } }
    );

    return res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error("[markNotificationRead] Error:", error);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const authUser = req.user;
    const userId = authUser?._id || authUser?.id || req.headers["x-user-id"];

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });

    return res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("[markAllNotificationsRead] Error:", error);
    return res.status(500).json({ message: "Failed to mark all as read" });
  }
};
