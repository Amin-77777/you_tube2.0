"use client";

import React, { useState, useRef, useEffect } from "react";
import { Settings, Check, ChevronRight, ChevronLeft, Gauge, Sliders } from "lucide-react";
import { PLAYER_CONFIG } from "./playerConfig";

interface SettingsMenuProps {
  playbackRate: number;
  selectedQuality: string;
  availableQualities: string[];
  onPlaybackRateChange: (rate: number) => void;
  onQualityChange: (quality: string) => void;
}

type MenuView = "main" | "speed" | "quality";

export default function SettingsMenu({
  playbackRate,
  selectedQuality,
  availableQualities,
  onPlaybackRateChange,
  onQualityChange,
}: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<MenuView>("main");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCurrentView("main");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setCurrentView("main");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    setCurrentView("main");
  };

  const getSpeedLabel = (rate: number) => {
    return rate === 1 ? "Normal" : `${rate}×`;
  };

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      {/* Settings Button */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Settings"
        title="Settings"
        aria-expanded={isOpen}
        className={`w-9 h-9 flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none ${
          isOpen ? "text-white rotate-45 transition-transform duration-200" : ""
        }`}
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-10 sm:bottom-11 right-0 w-52 sm:w-60 bg-black/95 text-white backdrop-blur-md rounded-xl border border-white/15 shadow-2xl p-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* MAIN VIEW */}
          {currentView === "main" && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => setCurrentView("speed")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-gray-400" />
                  <span>Playback speed</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span>{getSpeedLabel(playbackRate)}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView("quality")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-gray-400" />
                  <span>Quality</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span>{selectedQuality}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          )}

          {/* PLAYBACK SPEED SUBMENU */}
          {currentView === "speed" && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => setCurrentView("main")}
                className="w-full flex items-center gap-2 px-3 py-1.5 border-b border-white/10 text-xs font-semibold hover:bg-white/10 transition-colors mb-1 rounded-t-lg"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Playback speed</span>
              </button>

              {PLAYER_CONFIG.playbackRates.map((rate) => {
                const isSelected = playbackRate === rate;
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      onPlaybackRateChange(rate);
                      setIsOpen(false);
                      setCurrentView("main");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                      isSelected ? "bg-white/15 font-semibold text-red-400" : "hover:bg-white/10"
                    }`}
                  >
                    <span>{rate === 1 ? "Normal" : `${rate}×`}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-red-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* QUALITY SUBMENU */}
          {currentView === "quality" && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => setCurrentView("main")}
                className="w-full flex items-center gap-2 px-3 py-1.5 border-b border-white/10 text-xs font-semibold hover:bg-white/10 transition-colors mb-1 rounded-t-lg"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quality</span>
              </button>

              {availableQualities.map((qual) => {
                const isSelected = selectedQuality === qual;
                return (
                  <button
                    key={qual}
                    type="button"
                    onClick={() => {
                      onQualityChange(qual);
                      setIsOpen(false);
                      setCurrentView("main");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                      isSelected ? "bg-white/15 font-semibold text-red-400" : "hover:bg-white/10"
                    }`}
                  >
                    <span>{qual}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-red-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
