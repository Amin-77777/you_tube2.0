"use client";

import React from "react";

interface LoadingSpinnerProps {
  isBuffering: boolean;
}

export default function LoadingSpinner({ isBuffering }: LoadingSpinnerProps) {
  if (!isBuffering) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* YouTube-style smooth rotating ring */}
        <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-red-600 animate-spin" />
      </div>
    </div>
  );
}
