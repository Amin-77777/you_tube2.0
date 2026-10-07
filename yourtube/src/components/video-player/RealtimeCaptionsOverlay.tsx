"use client";

import React, { useMemo } from "react";
import { getCaptionCueAtTime } from "./captionData";

interface RealtimeCaptionsOverlayProps {
  captionsEnabled: boolean;
  currentTime: number;
  videoTitle: string;
  language?: string;
  nativeCueText?: string | null;
}

export default function RealtimeCaptionsOverlay({
  captionsEnabled,
  currentTime,
  videoTitle,
  language = "en",
  nativeCueText,
}: RealtimeCaptionsOverlayProps) {
  // Determine current active caption text in real time
  const currentText = useMemo(() => {
    if (!captionsEnabled) return null;
    if (nativeCueText && nativeCueText.trim().length > 0) {
      return nativeCueText;
    }
    return getCaptionCueAtTime(videoTitle, currentTime, language);
  }, [captionsEnabled, currentTime, videoTitle, language, nativeCueText]);

  if (!captionsEnabled || !currentText) {
    return null;
  }

  return (
    <div className="absolute bottom-12 sm:bottom-16 left-4 right-4 pointer-events-none flex justify-center z-25 animate-in fade-in duration-100">
      <div className="bg-black/85 text-white font-medium text-xs sm:text-base px-3 py-1 rounded-md shadow-2xl text-center max-w-2xl border border-white/10 tracking-wide select-none leading-relaxed backdrop-blur-xs">
        {currentText}
      </div>
    </div>
  );
}
