/**
 * Global Video Playback Manager
 * Ensures that only ONE active video element plays across the application at any given time.
 * Automatically pauses any other playing video when a new video starts.
 */

class VideoPlaybackManager {
  private activeVideo: HTMLVideoElement | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Global listener: when any video begins playback, pause other videos
      window.addEventListener(
        "play",
        (event) => {
          const target = event.target as HTMLVideoElement;
          if (target && target.tagName === "VIDEO") {
            // Ignore small timeline preview frame videos
            if (target.getAttribute("data-preview") === "true") {
              return;
            }
            this.handlePlay(target);
          }
        },
        true // Capture phase
      );
    }
  }

  public handlePlay(targetVideo: HTMLVideoElement) {
    if (!targetVideo) return;
    this.activeVideo = targetVideo;

    if (typeof document === "undefined") return;

    try {
      const allVideos = document.querySelectorAll<HTMLVideoElement>("video:not([data-preview='true'])");
      allVideos.forEach((v) => {
        if (v !== targetVideo && !v.paused) {
          try {
            v.pause();
          } catch (_) {}
        }
      });
    } catch (_) {}
  }

  public notifyPlay(targetVideo: HTMLVideoElement) {
    this.handlePlay(targetVideo);
  }

  public getActiveVideo(): HTMLVideoElement | null {
    return this.activeVideo;
  }
}

export const videoPlaybackManager = new VideoPlaybackManager();
