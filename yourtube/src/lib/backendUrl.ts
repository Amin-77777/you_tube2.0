export const getBackendUrl = (): string => {
  // Client-side (running in the browser)
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

    // In production web environment (e.g. on Render)
    let envUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    if (envUrl) {
      if (!envUrl.startsWith("http://") && !envUrl.startsWith("https://")) {
        envUrl = `https://${envUrl}`;
      }
      return envUrl.replace(/\/$/, "");
    }

    // Default to the known production Render backend URL
    return "https://youtube-backend-dc7c.onrender.com";
  }

  // Server-side (running inside Next.js Node.js server)
  let url =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://youtube-backend-dc7c.onrender.com";

  // Handle Render private service hostname (e.g. 'youtube-backend' -> 'http://youtube-backend:5000')
  if (
    url &&
    !url.includes(".") &&
    !url.includes("localhost") &&
    !url.startsWith("http")
  ) {
    if (!url.includes(":")) {
      url = `${url}:5000`;
    }
    url = `http://${url}`;
  } else if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url.replace(/\/$/, "");
};
