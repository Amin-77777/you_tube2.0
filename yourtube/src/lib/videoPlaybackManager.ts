/**
 * Global Video Playback Manager
 * Ensures that only ONE active video element plays across the application at any given time.
 * Automatically pauses any other playing video when a new video starts.
 */

type PlaybackListener = (activePlayerId: string) => void;

class VideoPlaybackManager {
  private activePlayerId: string | null = null;
  private activeVideoElement: HTMLVideoElement | null = null;
  private listeners: Set<PlaybackListener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      // Global fallback listener: if any native video on the page emits 'play', pause others
      window.addEventListener(
        "play",
        (event) => {
          const target = event.target as HTMLVideoElement;
          if (target && target.tagName === "VIDEO") {
            this.handleNativePlay(target);
          }
        },
        true // Capture phase
      );
    }
  }

  private handleNativePlay(targetVideo: HTMLVideoElement) {
    if (typeof document === "undefined") return;
    const allVideos = document.querySelectorAll<HTMLVideoElement>("video");
    allVideos.forEach((v) => {
      if (v !== targetVideo && !v.paused && !v.ended) {
        try {
          v.pause();
        } catch (_) {}
      }
    });
  }

  /**
   * Registers a player instance. Returns an unregister cleanup function.
   */
  public register(playerId: string, onPauseCallback: () => void): () => void {
    const listener: PlaybackListener = (activeId) => {
      if (activeId !== playerId) {
        onPauseCallback();
      }
    };
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
      if (this.activePlayerId === playerId) {
        this.activePlayerId = null;
        this.activeVideoElement = null;
      }
    };
  }

  /**
   * Called whenever a video begins playback.
   * Pauses all other videos and notifies registered listeners.
   */
  public notifyPlay(playerId: string, videoElement?: HTMLVideoElement | null) {
    this.activePlayerId = playerId;
    this.activeVideoElement = videoElement || null;

    if (videoElement) {
      this.handleNativePlay(videoElement);
    }

    this.listeners.forEach((listener) => {
      try {
        listener(playerId);
      } catch (err) {
        console.warn("[VideoPlaybackManager] Error in listener:", err);
      }
    });
  }

  /**
   * Gets the ID of the currently playing video player.
   */
  public getActivePlayerId(): string | null {
    return this.activePlayerId;
  }
}

export const videoPlaybackManager = new VideoPlaybackManager();
