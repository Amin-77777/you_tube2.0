"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { getVideoSources, getThumbnailSrc } from "@/lib/videoUtils";
import {
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Lock,
  Crown,
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { videoPlaybackManager } from "@/lib/videoPlaybackManager";
import { PLAYER_CONFIG } from "./video-player/playerConfig";
import CustomControls from "./video-player/CustomControls";
import LoadingSpinner from "./video-player/LoadingSpinner";
import ActionFeedback, { FeedbackType } from "./video-player/ActionFeedback";
import AutoplayCountdownOverlay from "./video-player/AutoplayCountdownOverlay";
import KeyboardShortcutsModal from "./video-player/KeyboardShortcutsModal";
import { SubtitleTrack, VideoItem } from "./video-player/types";

interface VideoPlayerProps {
  video: VideoItem;
  nextVideo?: VideoItem;
  prevVideo?: VideoItem;
  onNextVideo?: () => void;
  onPreviousVideo?: () => void;
  onTheaterModeChange?: (isTheater: boolean) => void;
  autoPlay?: boolean;
}

const TIER_ORDER: Record<string, number> = {
  free: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
};

export default function VideoPlayer({
  video,
  nextVideo,
  prevVideo,
  onNextVideo,
  onPreviousVideo,
  onTheaterModeChange,
  autoPlay = false,
}: VideoPlayerProps) {
  const router = useRouter();
  const { user } = useUser();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const sources = getVideoSources(video?.filepath);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Subscription & Access Control State
  const [userPlan, setUserPlan] = useState<string>("Free");
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(true);
  const [requiredTier, setRequiredTier] = useState<string>("Free");
  const [watchLimitReached, setWatchLimitReached] = useState(false);
  const [watchLimitInfo, setWatchLimitInfo] = useState<any>(null);

  // Core Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Autoplay countdown state
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);

  // Watch position & progress flags
  const hasResumedPositionRef = useRef(false);
  const hasReportedCompletionRef = useRef(false);
  const lastProgressSaveTimeRef = useRef(0);
  const inactivityTimerRef = useRef<any>(null);
  const clickTimeoutRef = useRef<any>(null);

  const activeSrc = sources[currentSourceIndex] || "";
  const posterSrc = getThumbnailSrc(video);
  const videoAccess = (video?.accessLevel || "free").toLowerCase();

  const subtitles: SubtitleTrack[] = video?.subtitles || [
    {
      label: "English",
      srclang: "en",
      src: "/captions/sample-en.vtt",
      default: false,
    },
  ];

  // 1. Check access permissions
  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      const reqName =
        videoAccess === "gold"
          ? "Gold"
          : videoAccess === "silver"
          ? "Silver"
          : videoAccess === "bronze"
          ? "Bronze"
          : "Free";
      setRequiredTier(reqName);

      if (videoAccess === "free") {
        if (isMounted) {
          setIsAllowed(true);
          setAccessChecked(true);
        }
        return;
      }

      if (!user) {
        if (isMounted) {
          setIsAllowed(false);
          setAccessChecked(true);
        }
        return;
      }

      try {
        const res = await axiosInstance.get(`/subscription/check-access/${video?._id}`);
        if (isMounted) {
          setIsAllowed(Boolean(res.data.allowed));
          if (res.data.userPlan) {
            setUserPlan(res.data.userPlan);
          }
          setAccessChecked(true);
        }
      } catch (err: any) {
        if (isMounted) {
          const userRank = TIER_ORDER[userPlan.toLowerCase()] || 1;
          const reqRank = TIER_ORDER[videoAccess] || 1;
          setIsAllowed(userRank >= reqRank);
          setAccessChecked(true);
        }
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [video?._id, video?.accessLevel, user, userPlan]);

  // Fetch active user plan on mount
  useEffect(() => {
    if (!user) {
      setUserPlan("Free");
      return;
    }

    axiosInstance
      .get("/subscription/current")
      .then((res) => {
        if (res.data?.subscription?.plan) {
          setUserPlan(res.data.subscription.plan);
        }
      })
      .catch(() => {});
  }, [user]);

  // 2. Multi-video coordination handler
  const handleNativePlay = () => {
    if (videoRef.current) {
      videoPlaybackManager.notifyPlay(videoRef.current);
    }
    setIsBuffering(false);
    setIsPlaying(true);
    setPlaybackError(null);
  };

  // 3. Reset playback state on source or video change
  useEffect(() => {
    setCurrentSourceIndex(0);
    setPlaybackError(null);
    setWatchLimitReached(false);
    setShowAutoplayOverlay(false);
    hasResumedPositionRef.current = false;
    hasReportedCompletionRef.current = false;
    setCurrentTime(0);
    setDuration(0);

    if (videoRef.current && isAllowed) {
      videoRef.current.load();
    }
  }, [video?.filepath, video?._id, isAllowed]);

  // 4. Periodic Watch-Time Tracking (Subscription daily limit)
  useEffect(() => {
    if (!user || !isAllowed || watchLimitReached) return;

    const interval = setInterval(async () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        try {
          const res = await axiosInstance.post("/subscription/watch-time", { minutes: 1 });
          if (res.data.limitExceeded) {
            setWatchLimitReached(true);
            setWatchLimitInfo(res.data);
            if (videoRef.current) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        } catch (_) {}
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user, isAllowed, watchLimitReached]);

  // 5. Save Watch Progress function (Backend + LocalStorage)
  const saveProgress = useCallback(
    async (timeToSave?: number, forceCompleted?: boolean) => {
      if (!video?._id) return;
      const current = timeToSave !== undefined ? timeToSave : videoRef.current?.currentTime || 0;
      const total = duration || videoRef.current?.duration || 0;
      if (total <= 0) return;

      const percentage = Math.min(100, Math.max(0, (current / total) * 100));
      const completed =
        forceCompleted !== undefined
          ? forceCompleted
          : percentage >= PLAYER_CONFIG.completionThreshold;

      try {
        localStorage.setItem(
          `yt_watch_progress_${video._id}`,
          JSON.stringify({
            playbackPosition: current,
            duration: total,
            percentageWatched: percentage,
            isCompleted: completed,
            lastWatched: Date.now(),
          })
        );
      } catch (_) {}

      if (user?._id) {
        try {
          await axiosInstance.post(`/history/progress/${video._id}`, {
            userId: user._id,
            playbackPosition: current,
            duration: total,
            percentageWatched: percentage,
            isCompleted: completed,
          });
        } catch (_) {}
      }
    },
    [video?._id, duration, user?._id]
  );

  // 6. Resume Last Saved Watch Position
  const resumeWatchPosition = useCallback(async () => {
    if (hasResumedPositionRef.current || !video?._id || !videoRef.current) return;
    hasResumedPositionRef.current = true;

    let savedPos = 0;
    let savedCompleted = false;

    if (user?._id) {
      try {
        const res = await axiosInstance.get(`/history/progress/${video._id}`);
        if (res.data?.progress) {
          savedPos = Number(res.data.progress.playbackPosition) || 0;
          savedCompleted = Boolean(res.data.progress.isCompleted);
        }
      } catch (_) {}
    }

    if (savedPos <= 0) {
      try {
        const stored = localStorage.getItem(`yt_watch_progress_${video._id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          savedPos = Number(parsed.playbackPosition) || 0;
          savedCompleted = Boolean(parsed.isCompleted);
        }
      } catch (_) {}
    }

    const totalDur = videoRef.current.duration || duration;
    if (
      savedCompleted ||
      (totalDur > 0 && (savedPos / totalDur) * 100 >= PLAYER_CONFIG.completionThreshold) ||
      (totalDur > 0 && totalDur - savedPos < 5)
    ) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    } else if (savedPos > 0 && savedPos < totalDur) {
      videoRef.current.currentTime = savedPos;
      setCurrentTime(savedPos);
    }

    if (autoPlay) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [video?._id, user?._id, duration, autoPlay]);

  // Save progress on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime);
      }
    };
  }, [saveProgress]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
      );
      setIsFullscreen(active);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // PiP change detection
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);

    vid.addEventListener("enterpictureinpicture", handleEnterPiP);
    vid.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      vid.removeEventListener("enterpictureinpicture", handleEnterPiP);
      vid.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, []);

  // Controls auto-hide timer on mouse/touch inactivity
  const resetInactivityTimer = useCallback(() => {
    setShowControls(true);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (isPlaying) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, PLAYER_CONFIG.inactivityTimeout);
    }
  }, [isPlaying]);

  const handleMouseMove = () => {
    resetInactivityTimer();
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!videoRef.current || !isAllowed) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          handleTogglePlay();
          break;

        case "ArrowLeft":
          e.preventDefault();
          const seekBackInterval = e.shiftKey
            ? PLAYER_CONFIG.largeSeekInterval
            : PLAYER_CONFIG.normalSeekInterval;
          handleSeekRelative(-seekBackInterval);
          break;

        case "ArrowRight":
          e.preventDefault();
          const seekFwdInterval = e.shiftKey
            ? PLAYER_CONFIG.largeSeekInterval
            : PLAYER_CONFIG.normalSeekInterval;
          handleSeekRelative(seekFwdInterval);
          break;

        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + PLAYER_CONFIG.volumeStep));
          break;

        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - PLAYER_CONFIG.volumeStep));
          break;

        case "m":
        case "M":
          e.preventDefault();
          handleToggleMute();
          break;

        case "f":
        case "F":
          e.preventDefault();
          handleToggleFullscreen();
          break;

        case "t":
        case "T":
          e.preventDefault();
          handleToggleTheaterMode();
          break;

        case "p":
        case "P":
          e.preventDefault();
          handleTogglePiP();
          break;

        case "c":
        case "C":
          e.preventDefault();
          handleToggleCaptions();
          break;

        case "n":
        case "N":
          e.preventDefault();
          if (onNextVideo) {
            onNextVideo();
          }
          break;

        case "?":
          e.preventDefault();
          setShowShortcutsModal((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isAllowed,
    volume,
    isMuted,
    isPlaying,
    isFullscreen,
    isTheaterMode,
    isPiP,
    captionsEnabled,
    onNextVideo,
  ]);

  // Playback Control Actions
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setFeedbackType("play");
          if (videoRef.current) {
            videoPlaybackManager.notifyPlay(videoRef.current);
          }
        })
        .catch(console.warn);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setFeedbackType("pause");
      saveProgress(videoRef.current.currentTime);
    }
    resetInactivityTimer();
  };

  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(duration, newTime));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
    resetInactivityTimer();
  };

  const handleSeekRelative = (offsetSeconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + offsetSeconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setFeedbackType(offsetSeconds > 0 ? "seek-forward" : "seek-back");
    resetInactivityTimer();
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    videoRef.current.volume = clamped;
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (!videoRef.current) return;
    setPlaybackRate(rate);
    videoRef.current.playbackRate = rate;
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    if (Array.isArray(video?.sources) && video.sources.length > 0) {
      const match = video.sources.find((s) => s.quality === quality);
      if (match && match.src) {
        const curTime = videoRef.current?.currentTime || 0;
        const wasPlay = !videoRef.current?.paused;
        if (videoRef.current) {
          videoRef.current.src = match.src;
          videoRef.current.currentTime = curTime;
          if (wasPlay) {
            videoRef.current.play().catch(console.warn);
          }
        }
      }
    }
  };

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  const handleToggleTheaterMode = () => {
    const nextMode = !isTheaterMode;
    setIsTheaterMode(nextMode);
    onTheaterModeChange?.(nextMode);
  };

  const handleTogglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (document.pictureInPictureEnabled && videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (err) {
      console.warn("Picture-in-picture failed:", err);
    }
  };

  const handleToggleCaptions = () => {
    if (!videoRef.current) return;
    const tracks = videoRef.current.textTracks;
    if (!tracks || tracks.length === 0) return;

    const nextState = !captionsEnabled;
    setCaptionsEnabled(nextState);

    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = nextState ? "showing" : "hidden";
    }
  };

  const handleSelectSubtitleTrack = (srclang: string | null) => {
    if (!videoRef.current) return;
    const tracks = videoRef.current.textTracks;
    setCurrentSubtitleTrack(srclang);

    if (!srclang) {
      setCaptionsEnabled(false);
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = "hidden";
      }
      return;
    }

    setCaptionsEnabled(true);
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].language === srclang) {
        tracks[i].mode = "showing";
      } else {
        tracks[i].mode = "hidden";
      }
    }
  };

  // Video Container Click Handling
  const handleContainerClick = (e: React.MouseEvent) => {
    // If click happened on control buttons, ignore container tap
    if ((e.target as HTMLElement).closest("button, [role='slider'], input, a")) {
      return;
    }

    // On mobile / desktop: if controls were hidden, tapping reveals them first
    if (!showControls && isPlaying) {
      resetInactivityTimer();
      return;
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      handleToggleFullscreen();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        handleTogglePlay();
      }, 250);
    }
  };

  // Video Error and Retry handling
  const handleVideoError = () => {
    if (currentSourceIndex + 1 < sources.length) {
      console.warn(
        `Source ${activeSrc} failed. Switching to alternate: ${sources[currentSourceIndex + 1]}`
      );
      setCurrentSourceIndex((prev) => prev + 1);
      return;
    }

    const err = videoRef.current?.error;
    let msg = "Could not play this video.";
    if (err) {
      switch (err.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          msg = "Video playback was aborted.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          msg = "Network error loading video stream.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          msg = "Codec decode error in browser.";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          msg = "Video format or source not supported.";
          break;
      }
    }
    console.error("Playback error:", activeSrc, err);
    setPlaybackError(msg);
  };

  const handleRetry = () => {
    setPlaybackError(null);
    setCurrentSourceIndex(0);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(console.warn);
    }
  };

  // HTML5 Media Event Handlers
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (!isNaN(dur) && dur > 0) {
      setDuration(dur);
    }
    resumeWatchPosition();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration;
    setCurrentTime(cur);

    if (dur > 0 && !hasReportedCompletionRef.current) {
      const percentage = (cur / dur) * 100;
      if (percentage >= PLAYER_CONFIG.completionThreshold) {
        hasReportedCompletionRef.current = true;
        saveProgress(cur, true);
      }
    }

    const now = Date.now();
    if (now - lastProgressSaveTimeRef.current >= PLAYER_CONFIG.progressSaveInterval) {
      lastProgressSaveTimeRef.current = now;
      saveProgress(cur);
    }
  };

  const handleProgress = () => {
    if (!videoRef.current) return;
    const buffered = videoRef.current.buffered;
    if (buffered.length > 0) {
      const cur = videoRef.current.currentTime;
      for (let i = 0; i < buffered.length; i++) {
        if (buffered.start(i) <= cur && cur <= buffered.end(i)) {
          setBufferedTime(buffered.end(i));
          return;
        }
      }
      setBufferedTime(buffered.end(buffered.length - 1));
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    saveProgress(duration, true);

    if (nextVideo && onNextVideo) {
      setShowAutoplayOverlay(true);
    }
  };

  // LOCKED SCREEN OVERLAY (Subscription tier required)
  const isGold = requiredTier === "Gold";
  const isSilver = requiredTier === "Silver";
  const TierIcon = isGold ? Crown : isSilver ? Shield : Zap;
  const themeGlow = isGold
    ? "from-amber-500/30 via-yellow-500/10 to-transparent border-yellow-500/40 text-yellow-400"
    : isSilver
    ? "from-slate-400/30 via-slate-600/10 to-transparent border-slate-400/40 text-slate-300"
    : "from-amber-600/30 via-amber-700/10 to-transparent border-amber-600/40 text-amber-400";

  const buttonGradient = isGold
    ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-extrabold shadow-lg shadow-yellow-500/20"
    : isSilver
    ? "bg-gradient-to-r from-slate-200 to-slate-400 hover:from-slate-300 hover:to-slate-500 text-slate-900 font-extrabold shadow-lg shadow-slate-400/20"
    : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold shadow-lg shadow-amber-600/20";

  if (!isAllowed && accessChecked) {
    return (
      <div className="relative aspect-video rounded-none sm:rounded-2xl overflow-hidden shadow-2xl bg-slate-950 flex items-center justify-center border border-white/10 group">
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-md scale-105 opacity-25"
          style={{ backgroundImage: `url(${posterSrc})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

        <div className="relative z-10 max-w-lg mx-4 p-4 sm:p-8 text-center flex flex-col items-center space-y-3 sm:space-y-4">
          <div
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center bg-gradient-to-b border shadow-xl ${themeGlow}`}
          >
            <Lock className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest bg-white/10 text-white border border-white/10 backdrop-blur-md">
              <TierIcon className="w-3 h-3" />
              <span>{requiredTier} Exclusive Content</span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Unlock Full Video with {requiredTier}
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
              This video requires an active <strong>{requiredTier}</strong> subscription or higher.
              {user
                ? ` Your current plan is ${userPlan}. Upgrade to watch instantly.`
                : " Sign in or choose a subscription plan to start streaming."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-left w-full max-w-sm bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 text-[10px] sm:text-[11px] text-gray-300 backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {isGold ? "4K Ultra HD" : isSilver ? "1080p Full HD" : "720p HD"} Quality
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{isGold ? "Unlimited" : isSilver ? "6 Hours" : "2 Hours"} Daily Watch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{isGold ? "25" : isSilver ? "10" : "5"} Downloads / Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{isGold ? "100% Ad-Free" : "Limited Ads"}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-sm pt-1">
            {!user ? (
              <Button
                onClick={() => router.push(`/signin?redirect=/watch/${video?._id}`)}
                className={`w-full py-4 sm:py-5 rounded-xl text-xs ${buttonGradient} flex items-center justify-center gap-2`}
              >
                <span>Sign In to Unlock</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() =>
                  router.push(`/subscriptions?plan=${requiredTier}&required=${requiredTier}`)
                }
                className={`w-full py-4 sm:py-5 rounded-xl text-xs ${buttonGradient} flex items-center justify-center gap-2`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Upgrade to {requiredTier} Plan</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => router.push("/subscriptions")}
              className="w-full sm:w-auto py-4 sm:py-5 rounded-xl text-xs font-semibold text-white border-white/20 bg-white/10 hover:bg-white/20 hover:text-white"
            >
              Explore Plans
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // WATCH TIME LIMIT EXCEEDED OVERLAY
  if (watchLimitReached) {
    return (
      <div className="relative aspect-video rounded-none sm:rounded-2xl overflow-hidden shadow-2xl bg-slate-950 flex items-center justify-center border border-red-500/30">
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-md scale-105 opacity-20"
          style={{ backgroundImage: `url(${posterSrc})` }}
        />
        <div className="absolute inset-0 bg-black/80" />

        <div className="relative z-10 max-w-md mx-4 p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shadow-lg">
            <Clock className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-white">Daily Watch Limit Reached</h2>
            <p className="text-xs text-gray-300">
              You have used your daily watch allowance ({watchLimitInfo?.limitMinutes || 30} mins)
              for the <strong>{userPlan}</strong> plan today.
            </p>
          </div>

          <p className="text-[10px] sm:text-[11px] text-gray-400 bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3">
            Watch time limits automatically reset at midnight UTC every day. To continue watching now
            with unlimited watch time, upgrade to Gold VIP.
          </p>

          <div className="flex items-center justify-center gap-2.5 pt-1">
            <Button
              onClick={() => router.push("/subscriptions?plan=Gold")}
              className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs px-4 sm:px-5 shadow-lg shadow-yellow-500/20"
            >
              <Crown className="w-3.5 h-3.5 mr-1" />
              Upgrade to Gold
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="rounded-full text-xs text-white border-white/20 hover:bg-white/10"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // NO SOURCE AVAILABLE
  if (!activeSrc) {
    return (
      <div className="aspect-video bg-gray-900 rounded-none sm:rounded-2xl flex flex-col items-center justify-center text-white p-6 shadow-inner">
        <AlertCircle className="w-12 h-12 text-gray-500 mb-2" />
        <p className="font-medium text-gray-300">No video source provided</p>
      </div>
    );
  }

  // FULLY CUSTOMIZED MODERN HTML5 VIDEO PLAYER
  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full aspect-video bg-black rounded-none sm:rounded-2xl overflow-hidden shadow-2xl select-none group focus:outline-none ${
        isFullscreen ? "rounded-none w-screen h-screen aspect-auto" : ""
      } ${!showControls && isPlaying ? "cursor-none" : ""}`}
    >
      {/* HTML5 Native Video Element */}
      <video
        key={activeSrc}
        ref={videoRef}
        src={activeSrc}
        poster={posterSrc}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full object-contain bg-black"
        onLoadStart={() => setIsBuffering(true)}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlay={handleNativePlay}
        onPlaying={handleNativePlay}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onSeeking={() => setIsBuffering(true)}
        onSeeked={() => setIsBuffering(false)}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
      >
        {sources.map((s, idx) => (
          <source key={idx} src={s} type="video/mp4" />
        ))}

        {subtitles.map((track, idx) => (
          <track
            key={idx}
            kind={track.kind || "subtitles"}
            label={track.label}
            src={track.src}
            srcLang={track.srclang}
            default={track.default || false}
          />
        ))}

        Your browser does not support the video tag.
      </video>

      {/* Buffering Spinner */}
      <LoadingSpinner isBuffering={isBuffering} />

      {/* Center Action Feedback Ripple */}
      <ActionFeedback type={feedbackType} onClear={() => setFeedbackType(null)} />

      {/* Autoplay Next Video Countdown Overlay */}
      {showAutoplayOverlay && nextVideo && onNextVideo && (
        <AutoplayCountdownOverlay
          nextVideo={nextVideo}
          countdownSeconds={PLAYER_CONFIG.autoplayCountdownSeconds}
          onPlayNext={() => {
            setShowAutoplayOverlay(false);
            onNextVideo();
          }}
          onCancel={() => setShowAutoplayOverlay(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Custom Control Bar & Overlays */}
      <CustomControls
        isPlaying={isPlaying}
        isMuted={isMuted}
        volume={volume}
        currentTime={currentTime}
        duration={duration}
        bufferedTime={bufferedTime}
        playbackRate={playbackRate}
        isFullscreen={isFullscreen}
        isTheaterMode={isTheaterMode}
        isPiP={isPiP}
        showControls={showControls}
        isBuffering={isBuffering}
        isSeeking={isSeeking}
        captionsEnabled={captionsEnabled}
        selectedQuality={selectedQuality}
        availableQualities={[...PLAYER_CONFIG.videoQualities]}
        subtitles={subtitles}
        currentSubtitleTrack={currentSubtitleTrack}
        videoTitle={video.videotitle}
        onPlayPause={handleTogglePlay}
        onSeek={handleSeek}
        onSeekRelative={handleSeekRelative}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onPlaybackRateChange={handlePlaybackRateChange}
        onQualityChange={handleQualityChange}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleTheaterMode={handleToggleTheaterMode}
        onTogglePiP={handleTogglePiP}
        onToggleCaptions={handleToggleCaptions}
        onSelectSubtitleTrack={handleSelectSubtitleTrack}
        onPreviousVideo={onPreviousVideo}
        onNextVideo={onNextVideo}
        hasPreviousVideo={Boolean(prevVideo && onPreviousVideo)}
        hasNextVideo={Boolean(nextVideo && onNextVideo)}
        posterSrc={posterSrc}
        videoSrc={activeSrc}
      />

      {/* Non-blocking error banner */}
      {playbackError && (
        <div className="absolute bottom-14 sm:bottom-16 left-3 right-3 sm:left-4 sm:right-4 bg-red-950/90 border border-red-700 text-white p-2.5 sm:p-3 rounded-xl shadow-xl flex items-center justify-between gap-2.5 z-50 backdrop-blur-sm pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
            <p className="text-[11px] sm:text-xs font-medium text-gray-200 truncate">{playbackError}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="text-white border-white/30 hover:bg-white/20 h-7 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
            <a
              href={activeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-300 hover:text-blue-100 flex items-center gap-1 px-2 py-1"
            >
              <ExternalLink className="w-3 h-3" />
              Direct
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
