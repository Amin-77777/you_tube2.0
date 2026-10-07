"use client";

import React, { useRef, useState } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";

interface VolumeControlProps {
  volume: number; // 0 to 1
  isMuted: boolean;
  onVolumeChange: (newVolume: number) => void;
  onToggleMute: () => void;
}

export default function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const effectiveVolume = isMuted ? 0 : volume;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    updateVolumeFromPointer(e.clientX);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateVolumeFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      updateVolumeFromPointer(e.clientX);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const updateVolumeFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const newVol = clampedX / rect.width;
    onVolumeChange(Math.round(newVol * 100) / 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onVolumeChange(Math.min(1, volume + 0.1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onVolumeChange(Math.max(0, volume - 0.1));
    } else if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      onToggleMute();
    }
  };

  return (
    <div className="flex items-center group/volume relative">
      {/* Mute/Unmute Toggle Button */}
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute (m)" : "Mute (m)"}
        title={isMuted ? "Unmute (m)" : "Mute (m)"}
        className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
      >
        {isMuted || effectiveVolume === 0 ? (
          <VolumeX className="w-5 h-5 text-red-400" />
        ) : effectiveVolume < 0.5 ? (
          <Volume1 className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      {/* Draggable Slider Container */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Volume slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(effectiveVolume * 100)}
        aria-valuetext={`${Math.round(effectiveVolume * 100)}%`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="w-0 opacity-0 group-hover/volume:w-16 group-hover/volume:opacity-100 group-hover/volume:ml-1.5 focus:w-16 focus:opacity-100 focus:ml-1.5 transition-all duration-200 h-6 flex items-center cursor-pointer select-none touch-none focus:outline-none"
      >
        <div className="relative w-full h-1 bg-white/30 rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-white rounded-full transition-none"
            style={{ width: `${effectiveVolume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
