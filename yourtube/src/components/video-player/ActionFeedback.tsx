"use client";

import React, { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";

export type FeedbackType = "play" | "pause" | "seek-back" | "seek-forward" | null;

interface ActionFeedbackProps {
  type: FeedbackType;
  onClear: () => void;
}

export default function ActionFeedback({ type, onClear }: ActionFeedbackProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (type) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClear();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [type, onClear]);

  if (!visible || !type) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-25">
      <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-2xl animate-in zoom-in-50 fade-out-0 duration-500">
        {type === "play" && <Play className="w-8 h-8 fill-current ml-1" />}
        {type === "pause" && <Pause className="w-8 h-8 fill-current" />}
        {type === "seek-back" && (
          <div className="flex flex-col items-center">
            <RotateCcw className="w-6 h-6" />
            <span className="text-[10px] font-bold">-10s</span>
          </div>
        )}
        {type === "seek-forward" && (
          <div className="flex flex-col items-center">
            <RotateCw className="w-6 h-6" />
            <span className="text-[10px] font-bold">+10s</span>
          </div>
        )}
      </div>
    </div>
  );
}
