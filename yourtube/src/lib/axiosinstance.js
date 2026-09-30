import axios from "axios";
import { getBackendUrl } from "./backendUrl";

const axiosInstance = axios.create({
  baseURL: getBackendUrl(),
});

// Helper to get or generate persistent device ID
export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "server-session";
  let deviceId = localStorage.getItem("yt_device_id");
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
    localStorage.setItem("yt_device_id", deviceId);
  }
  return deviceId;
}

// Request interceptor to attach JWT token, user ID, and device ID
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const uid = parsed?._id || parsed?.id;
        if (uid) {
          config.headers["x-user-id"] = uid;
        }
      }
    } catch (_) {}

    config.headers["x-device-id"] = getOrCreateDeviceId();
  }
  return config;
});

export default axiosInstance;