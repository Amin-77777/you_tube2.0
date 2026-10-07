/**
 * Configurable parameters and constants for the HTML5 Video Player
 */

export const PLAYER_CONFIG = {
  // Seeking intervals (in seconds)
  normalSeekInterval: 10,
  largeSeekInterval: 30,

  // Completion threshold (percentage: 0 - 100)
  completionThreshold: 90,

  // Interval for periodic backend watch progress sync (in milliseconds)
  progressSaveInterval: 5000,

  // Autoplay countdown timer (in seconds)
  autoplayCountdownSeconds: 5,

  // Controls auto-hide delay when cursor is inactive during playback (in milliseconds)
  inactivityTimeout: 2500,

  // Volume increment / decrement step via keyboard
  volumeStep: 0.1,

  // Supported playback rate multipliers
  playbackRates: [0.5, 1, 1.25, 1.5, 2] as const,

  // Supported video quality options
  videoQualities: ["Auto", "1080p", "720p", "480p", "360p"] as const,
};

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number, forceHours = false): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";

  const totalSecs = Math.floor(seconds);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const remainingSecs = totalSecs % 60;

  const paddedSecs = remainingSecs < 10 ? `0${remainingSecs}` : `${remainingSecs}`;

  if (hours > 0 || forceHours) {
    const paddedMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }

  return `${minutes}:${paddedSecs}`;
}

/**
 * Formats remaining time into -MM:SS or -HH:MM:SS
 */
export function formatRemainingTime(current: number, total: number): string {
  const remaining = Math.max(0, (total || 0) - (current || 0));
  return `-${formatTime(remaining, (total || 0) >= 3600)}`;
}
