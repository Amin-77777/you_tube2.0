"use client";

import React, { useRef, useState, useEffect } from "react";
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

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    thumbnail?: string;
    accessLevel?: string;
  };
}

const TIER_ORDER: Record<string, number> = {
  free: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
};

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const router = useRouter();
  const { user } = useUser();
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

  const activeSrc = sources[currentSourceIndex] || "";
  const posterSrc = getThumbnailSrc(video);
  const videoAccess = (video?.accessLevel || "free").toLowerCase();

  // 1. Check access permissions
  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      // Determine required plan
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

      // If user is not logged in and video is not free, lock immediately
      if (!user) {
        if (isMounted) {
          setIsAllowed(false);
          setAccessChecked(true);
        }
        return;
      }

      try {
        // Query backend for accurate verification
        const res = await axiosInstance.get(`/subscription/check-access/${video?._id}`);
        if (isMounted) {
          setIsAllowed(Boolean(res.data.allowed));
          if (res.data.userPlan) {
            setUserPlan(res.data.userPlan);
          }
          setAccessChecked(true);
        }
      } catch (err: any) {
        // Fallback to local tier rank calculation
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

  // 2. Reset playback on source or video change
  useEffect(() => {
    setCurrentSourceIndex(0);
    setPlaybackError(null);
    setWatchLimitReached(false);

    if (videoRef.current && isAllowed) {
      videoRef.current.load();
    }
  }, [video?.filepath, video?._id, isAllowed]);

  // 3. Periodic Watch-Time Tracking (Enforces daily watch time limit)
  useEffect(() => {
    if (!user || !isAllowed || watchLimitReached) return;

    const interval = setInterval(async () => {
      // Only track if video is actually actively playing
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        try {
          const res = await axiosInstance.post("/subscription/watch-time", { minutes: 1 });
          if (res.data.limitExceeded) {
            setWatchLimitReached(true);
            setWatchLimitInfo(res.data);
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        } catch (_) {}
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [user, isAllowed, watchLimitReached]);

  const handleVideoError = () => {
    if (currentSourceIndex + 1 < sources.length) {
      console.warn(`Source ${activeSrc} failed. Switching to alternate: ${sources[currentSourceIndex + 1]}`);
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

  // Plan styling details for the locked screen
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

  // LOCKED SCREEN OVERLAY
  if (!isAllowed && accessChecked) {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-slate-950 flex items-center justify-center border border-white/10 group">
        {/* Blurred video thumbnail backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-md scale-105 opacity-25"
          style={{ backgroundImage: `url(${posterSrc})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

        {/* Center Card Content */}
        <div className="relative z-10 max-w-lg mx-4 p-6 sm:p-8 text-center flex flex-col items-center space-y-4">
          {/* Glowing Tier Badge */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-b border shadow-xl ${themeGlow}`}
          >
            <Lock className="w-8 h-8 drop-shadow-md" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-white/10 text-white border border-white/10 backdrop-blur-md">
              <TierIcon className="w-3.5 h-3.5" />
              <span>{requiredTier} Exclusive Content</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Unlock Full Video with {requiredTier}
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
              This video requires an active <strong>{requiredTier}</strong> subscription or higher.
              {user
                ? ` Your current plan is ${userPlan}. Upgrade to watch instantly.`
                : " Sign in or choose a subscription plan to start streaming."}
            </p>
          </div>

          {/* Tier Feature Highlights */}
          <div className="grid grid-cols-2 gap-2 text-left w-full max-w-sm bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-gray-300 backdrop-blur-sm">
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

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm pt-1">
            {!user ? (
              <Button
                onClick={() => router.push(`/signin?redirect=/watch/${video?._id}`)}
                className={`w-full py-5 rounded-xl text-xs ${buttonGradient} flex items-center justify-center gap-2`}
              >
                <span>Sign In to Unlock</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push(`/subscriptions?plan=${requiredTier}&required=${requiredTier}`)}
                className={`w-full py-5 rounded-xl text-xs ${buttonGradient} flex items-center justify-center gap-2`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Upgrade to {requiredTier} Plan</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => router.push("/subscriptions")}
              className="w-full sm:w-auto py-5 rounded-xl text-xs font-semibold text-white border-white/20 bg-white/10 hover:bg-white/20 hover:text-white"
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
      <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-slate-950 flex items-center justify-center border border-red-500/30">
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-md scale-105 opacity-20"
          style={{ backgroundImage: `url(${posterSrc})` }}
        />
        <div className="absolute inset-0 bg-black/80" />

        <div className="relative z-10 max-w-md mx-4 p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shadow-lg">
            <Clock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Daily Watch Limit Reached</h2>
            <p className="text-xs text-gray-300">
              You have used your daily watch allowance ({watchLimitInfo?.limitMinutes || 30} mins) for the{" "}
              <strong>{userPlan}</strong> plan today.
            </p>
          </div>

          <p className="text-[11px] text-gray-400 bg-white/5 border border-white/10 rounded-xl p-3">
            Watch time limits automatically reset at midnight UTC every day. To continue watching now with unlimited watch time, upgrade to Gold VIP.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => router.push("/subscriptions?plan=Gold")}
              className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs px-5 shadow-lg shadow-yellow-500/20"
            >
              <Crown className="w-3.5 h-3.5 mr-1" />
              Upgrade to Gold (Unlimited)
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

  // STANDARD ACTIVE PLAYER
  if (!activeSrc) {
    return (
      <div className="aspect-video bg-gray-900 rounded-2xl flex flex-col items-center justify-center text-white p-6 shadow-inner">
        <AlertCircle className="w-12 h-12 text-gray-500 mb-2" />
        <p className="font-medium text-gray-300">No video source provided</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-lg group">
      <video
        key={activeSrc}
        ref={videoRef}
        src={activeSrc}
        poster={posterSrc}
        controls
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full object-contain bg-black"
        onPlaying={() => setPlaybackError(null)}
        onError={handleVideoError}
      >
        {sources.map((s, idx) => (
          <source key={idx} src={s} type="video/mp4" />
        ))}
        Your browser does not support the video tag.
      </video>

      {/* Non-blocking error banner */}
      {playbackError && (
        <div className="absolute bottom-14 left-4 right-4 bg-red-950/90 border border-red-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-between gap-3 z-20 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-xs font-medium text-gray-200 truncate">{playbackError}</p>
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
