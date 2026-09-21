export const getBackendUrl = (): string => {
  let url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  // Remove trailing slash if present
  return url.replace(/\/$/, "");
};
