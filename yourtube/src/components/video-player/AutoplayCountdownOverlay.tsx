"use client";

import React, { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { getThumbnailSrc } from "@/lib/videoUtils";

interface AutoplayCountdownOverlayProps {
  nextVideo: {
    _id: string;
    videotitle: string;
    thumbnail?: string;
    videochanel?: string;
    duration?: string;
  };
  countdownSeconds: number;
  onPlayNext: () => void;
  onCancel: () => void;
}

export default function AutoplayCountdownOverlay({
  nextVideo,
  countdownSeconds,
  onPlayNext,
  onCancel,
}: AutoplayCountdownOverlayProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);

  useEffect(() => {
    setSecondsRemaining(countdownSeconds);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPlayNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownSeconds, onPlayNext]);

  const thumbSrc = getThumbnailSrc(nextVideo);
  const strokeDashoffset = (1 - secondsRemaining / countdownSeconds) * 100;

  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative max-w-sm w-full bg-slate-900/95 border border-white/15 rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center space-y-4">
        {/* Cancel X top-right */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel autoplay"
          title="Cancel autoplay"
          className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Circular Countdown Progress Badge */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-white/20"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-red-600 transition-all duration-1000"
              strokeDasharray="100, 100"
              strokeDashoffset={strokeDashoffset}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute font-bold text-lg text-white font-mono">
            {secondsRemaining}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Up Next in {secondsRemaining}s
          </p>
          <h4 className="text-sm font-bold text-white line-clamp-1">
            {nextVideo.videotitle || "Next Video"}
          </h4>
          <p className="text-xs text-gray-400">
            {nextVideo.videochanel || "Channel"}
          </p>
        </div>

        {/* Next Video Mini Thumbnail Card */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-inner group">
          <img
            src={thumbSrc}
            alt={nextVideo.videotitle}
            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
          />
          {nextVideo.duration && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white font-mono text-[10px] px-1.5 py-0.5 rounded">
              {nextVideo.duration}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 w-full pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-3 rounded-xl border border-white/20 text-xs font-medium text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPlayNext}
            className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-red-600/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
