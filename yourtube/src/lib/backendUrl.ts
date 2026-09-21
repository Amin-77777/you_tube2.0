export const getBackendUrl = (): string => {
  let url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  // If Render internal service name was passed (e.g. 'youtube-backend-dc7c' without domain)
  if (url && !url.includes(".") && !url.includes("localhost")) {
    url = `${url}.onrender.com`;
  }

  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Remove trailing slash if present
  return url.replace(/\/$/, "");
};
