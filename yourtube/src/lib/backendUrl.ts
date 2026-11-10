/**
 * Backend URL resolution helper.
 * Directs browser and server API requests to the production backend on Render,
 * or localhost:5000 when developing locally.
 */
export const getBackendUrl = (): string => {
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalhost) {
      const explicit = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (explicit && explicit.startsWith("http") && explicit.includes("localhost")) {
        return explicit.replace(/\/$/, "");
      }
      return "http://localhost:5000";
    }

    // Explicit environment variable if provided
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (envUrl && envUrl.includes(".")) {
      const formatted = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
      return formatted.replace(/\/$/, "");
    }

    // Always fallback to the active production Render backend
    return "https://youtube-backend-dc7c.onrender.com";
  }

  // Server-side
  const serverUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://youtube-backend-dc7c.onrender.com";

  if (serverUrl.startsWith("http")) {
    return serverUrl.replace(/\/$/, "");
  }

  return `https://${serverUrl}`.replace(/\/$/, "");
};
