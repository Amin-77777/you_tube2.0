import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notification.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(optionalAuth);

router.get("/", getNotifications);
router.put("/read-all", markAllNotificationsRead);
router.post("/read-all", markAllNotificationsRead);
router.put("/:notificationId/read", markNotificationRead);
router.post("/:notificationId/read", markNotificationRead);

export default router;
