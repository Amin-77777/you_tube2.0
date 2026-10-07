"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { formatTime } from "./playerConfig";

interface TimelineSliderProps {
  currentTime: number;
  duration: number;
  bufferedTime: number;
  videoSrc?: string;
  posterSrc?: string;
  onSeek: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: (finalTime: number) => void;
}

export default function TimelineSlider({
  currentTime,
  duration,
  bufferedTime,
  videoSrc,
  posterSrc,
  onSeek,
  onScrubStart,
  onScrubEnd,
}: TimelineSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPercent, setHoverPercent] = useState(0);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const lastPreviewSeekRef = useRef<number>(0);
  const previewSeekTimeoutRef = useRef<any>(null);

  // Time to display on the progress bar
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, Math.max(0, (bufferedTime / duration) * 100)) : 0;

  // Calculate time from client pointer position
  const calculateTimeFromEvent = useCallback(
    (clientX: number): { time: number; percent: number } => {
      if (!containerRef.current || duration <= 0) return { time: 0, percent: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percent = (clickX / rect.width) * 100;
      const targetTime = (percent / 100) * duration;
      return { time: Math.max(0, Math.min(duration, targetTime)), percent };
    },
    [duration]
  );

  // Throttled seeking for preview frame video to avoid performance degradation
  const updatePreviewVideoTime = useCallback(
    (targetTime: number) => {
      if (!previewVideoRef.current || isNaN(targetTime) || targetTime < 0) return;

      const now = Date.now();
      // Only seek if >= 100ms has elapsed since last seek
      if (now - lastPreviewSeekRef.current > 100) {
        lastPreviewSeekRef.current = now;
        try {
          previewVideoRef.current.currentTime = targetTime;
        } catch (_) {}
      } else {
        if (previewSeekTimeoutRef.current) {
          clearTimeout(previewSeekTimeoutRef.current);
        }
        previewSeekTimeoutRef.current = setTimeout(() => {
          if (previewVideoRef.current) {
            try {
              previewVideoRef.current.currentTime = targetTime;
            } catch (_) {}
          }
        }, 120);
      }
    },
    []
  );

  // Handle pointer down (click / drag start)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();

    const { time, percent } = calculateTimeFromEvent(e.clientX);
    setIsScrubbing(true);
    setScrubTime(time);
    setHoverPercent(percent);
    setHoverTime(time);

    onScrubStart?.();
    onSeek(time);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Handle pointer move (scrubbing or hovering)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { time, percent } = calculateTimeFromEvent(e.clientX);

    setHoverPercent(percent);
    setHoverTime(time);
    setIsHovering(true);

    if (isScrubbing) {
      setScrubTime(time);
      onSeek(time);
    }

    updatePreviewVideoTime(time);
  };

  // Handle pointer up (scrub release)
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      const { time } = calculateTimeFromEvent(e.clientX);
      setIsScrubbing(false);
      onSeek(time);
      onScrubEnd?.(time);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerLeave = () => {
    if (!isScrubbing) {
      setIsHovering(false);
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    let handled = false;
    let target = currentTime;

    const step = e.shiftKey ? 30 : 10;

    if (e.key === "ArrowLeft") {
      target = Math.max(0, currentTime - step);
      handled = true;
    } else if (e.key === "ArrowRight") {
      target = Math.min(duration, currentTime + step);
      handled = true;
    } else if (e.key === "Home") {
      target = 0;
      handled = true;
    } else if (e.key === "End") {
      target = duration;
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      onSeek(target);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (previewSeekTimeoutRef.current) {
        clearTimeout(previewSeekTimeoutRef.current);
      }
    };
  }, []);

  // Clamped hover percentage for preview bubble so it never overflows timeline bounds
  const clampedPreviewPercent = Math.max(8, Math.min(92, hoverPercent));

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Seek timeline"
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration)}
      aria-valuenow={Math.floor(displayTime)}
      aria-valuetext={`${formatTime(displayTime)} of ${formatTime(duration)}`}
      tabIndex={0}
      className="relative w-full h-5 flex items-center cursor-pointer select-none group touch-none focus:outline-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
    >
      {/* Timeline Hover Preview (Popup Thumbnail + Timestamp) */}
      {isHovering && duration > 0 && (
        <div
          className="absolute bottom-6 pointer-events-none z-30 flex flex-col items-center transition-transform duration-75"
          style={{ left: `${clampedPreviewPercent}%`, transform: "translateX(-50%)" }}
        >
          {/* Preview frame container */}
          <div className="w-36 sm:w-44 aspect-video rounded-md overflow-hidden bg-black border border-white/20 shadow-2xl relative">
            {videoSrc && (
              <video
                ref={previewVideoRef}
                src={videoSrc}
                preload="metadata"
                muted
                playsInline
                data-preview="true"
                crossOrigin="anonymous"
                onLoadedData={() => setPreviewLoaded(true)}
                className={`w-full h-full object-cover ${previewLoaded ? "opacity-100" : "opacity-0"}`}
              />
            )}

            {/* Poster fallback if preview video not loaded or unavailable */}
            {(!previewLoaded || !videoSrc) && posterSrc && (
              <img
                src={posterSrc}
                alt="Preview frame"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            )}

            {/* Timestamp overlay at bottom of preview thumbnail */}
            <div className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[10px] px-1.5 py-0.5 rounded shadow">
              {formatTime(hoverTime, duration >= 3600)}
            </div>
          </div>

          {/* Timestamp text badge underneath thumbnail */}
          <div className="mt-1 bg-black/90 text-white font-mono text-xs font-semibold px-2 py-0.5 rounded shadow border border-white/10">
            {formatTime(hoverTime, duration >= 3600)}
          </div>
        </div>
      )}

      {/* Progress Bar Track */}
      <div className="relative w-full h-1 group-hover:h-2 transition-all duration-150 rounded-full bg-white/25 overflow-hidden">
        {/* Buffering Progress (gray) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-white/40 transition-[width] duration-200"
          style={{ width: `${bufferedPercent}%` }}
        />

        {/* Hover ghost bar (semi-transparent white) */}
        {isHovering && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/20 pointer-events-none"
            style={{ width: `${hoverPercent}%` }}
          />
        )}

        {/* Current Playback Progress (red) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-red-600 transition-none"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Scrubber Knob / Handle */}
      <div
        className={`absolute w-3.5 h-3.5 bg-red-600 rounded-full shadow-md pointer-events-none transition-transform duration-100 ${
          isScrubbing || isHovering ? "scale-100" : "scale-0"
        }`}
        style={{
          left: `${progressPercent}%`,
          transform: "translate(-50%, 0)",
        }}
      />
    </div>
  );
}
