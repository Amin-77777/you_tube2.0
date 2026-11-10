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

    // If an explicit absolute public URL is provided for production
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (envUrl && envUrl.startsWith("https://") && envUrl.includes(".")) {
      return envUrl.replace(/\/$/, "");
    }

    // In production web environment (e.g. on Render), use same-origin relative URLs.
    // Next.js rewrites proxy all /user, /security, /video, etc. routes directly to the backend.
    return "";
  }

  // Server-side (running inside Next.js Node.js server)
  let url =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:5000";

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
  }

  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `http://${url}`;
  }

  return url.replace(/\/$/, "");
};
