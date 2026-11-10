/**
 * Theme Service for Indian Standard Time (IST, Asia/Kolkata) automatic theme selection.
 * Rules:
 *  - 05:00:00 IST to 11:59:59 IST: 'light'
 *  - 12:00:00 IST to 04:59:59 IST: 'dark'
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Extracts the hour and minute in Asia/Kolkata timezone from a given Date object.
 * @param {Date} [date=new Date()]
 * @returns {{ hour: number, minute: number, second: number, istString: string }}
 */
export function getISTTimeParts(date = new Date()) {
  const targetDate = date instanceof Date ? date : new Date(date);
  
  // Format into parts using the explicit Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(targetDate);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  // Handle midnight 24 vs 0
  const hour = (parseInt(partMap.hour, 10) || 0) % 24;
  const minute = parseInt(partMap.minute, 10) || 0;
  const second = parseInt(partMap.second, 10) || 0;

  const displayFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return {
    hour,
    minute,
    second,
    istString: displayFormatter.format(targetDate),
  };
}

/**
 * Calculates the theme for a given Date according to IST rules.
 * @param {Date} [date=new Date()]
 * @returns {'light' | 'dark'}
 */
export function calculateThemeForIST(date = new Date()) {
  const { hour } = getISTTimeParts(date);
  // From 5:00 AM IST through 11:59 AM IST -> Light
  // From 12:00 PM IST through 4:59 AM IST -> Dark
  if (hour >= 5 && hour < 12) {
    return "light";
  }
  return "dark";
}

/**
 * Determines effective theme based on user's saved preference and current/given time.
 * @param {'auto' | 'light' | 'dark' | string} preference
 * @param {Date} [date=new Date()]
 * @returns {'light' | 'dark'}
 */
export function getEffectiveTheme(preference = "auto", date = new Date()) {
  if (preference === "light") {
    return "light";
  }
  if (preference === "dark") {
    return "dark";
  }
  // Default or 'auto': calculate according to IST
  return calculateThemeForIST(date);
}

/**
 * Format any UTC timestamp into an IST display string with timezone indicator.
 * @param {Date | string | number} timestamp
 * @returns {string}
 */
export function formatToIST(timestamp) {
  if (!timestamp) return "N/A";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "N/A";
    return (
      new Intl.DateTimeFormat("en-IN", {
        timeZone: IST_TIMEZONE,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
      }).format(d) + " IST"
    );
  } catch (_) {
    return "N/A";
  }
}
