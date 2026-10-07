"use client";

import React from "react";
import { X, Keyboard } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "Space / k", action: "Play / Pause" },
    { key: "←", action: "Seek backward 10 seconds" },
    { key: "→", action: "Seek forward 10 seconds" },
    { key: "Shift + ←", action: "Seek backward 30 seconds" },
    { key: "Shift + →", action: "Seek forward 30 seconds" },
    { key: "↑", action: "Increase volume 10%" },
    { key: "↓", action: "Decrease volume 10%" },
    { key: "m", action: "Mute / Unmute" },
    { key: "f", action: "Toggle Full-screen" },
    { key: "t", action: "Toggle Theater mode" },
    { key: "p", action: "Toggle Picture-in-Picture" },
    { key: "c", action: "Toggle Subtitles / Captions" },
    { key: "n", action: "Play next video" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-white/20 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-base">Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs"
            >
              <span className="text-gray-300">{s.action}</span>
              <kbd className="bg-black/60 border border-white/20 rounded px-2 py-0.5 font-mono text-[11px] text-gray-200 shadow">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
