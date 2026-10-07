"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  PictureInPicture2,
  Subtitles,
  Tv,
} from "lucide-react";
import TimelineSlider from "./TimelineSlider";
import VolumeControl from "./VolumeControl";
import SettingsMenu from "./SettingsMenu";
import { formatTime, formatRemainingTime } from "./playerConfig";
import { PlayerCustomControlsProps } from "./types";

interface CustomControlsComponentProps extends PlayerCustomControlsProps {
  videoTitle?: string;
}

export default function CustomControls(props: CustomControlsComponentProps) {
  const {
    isPlaying,
    isMuted,
    volume,
    currentTime,
    duration,
    bufferedTime,
    playbackRate,
    isFullscreen,
    isTheaterMode,
    isPiP,
    showControls,
    isBuffering,
    captionsEnabled,
    selectedQuality,
    availableQualities,
    subtitles,
    videoTitle,

    onPlayPause,
    onSeek,
    onSeekRelative,
    onVolumeChange,
    onToggleMute,
    onPlaybackRateChange,
    onQualityChange,
    onToggleFullscreen,
    onToggleTheaterMode,
    onTogglePiP,
    onToggleCaptions,

    onPreviousVideo,
    onNextVideo,
    hasPreviousVideo,
    hasNextVideo,

    posterSrc,
    videoSrc,
  } = props;

  const [showRemainingTime, setShowRemainingTime] = useState(false);

  // Time display formatting
  const formattedCurrent = formatTime(currentTime, duration >= 3600);
  const formattedDuration = formatTime(duration, duration >= 3600);
  const formattedRemaining = formatRemainingTime(currentTime, duration);

  const hasSubtitles = Array.isArray(subtitles) && subtitles.length > 0;

  return (
    <div
      className={`absolute inset-0 pointer-events-none flex flex-col justify-between transition-opacity duration-300 z-30 ${
        showControls || !isPlaying ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Top Title Bar Gradient */}
      <div className="w-full pt-2 sm:pt-3 px-3 sm:px-4 pb-6 sm:pb-12 bg-gradient-to-b from-black/85 via-black/30 to-transparent flex items-center justify-between pointer-events-none select-none">
        <h3 className="text-white font-medium text-xs sm:text-base drop-shadow-md line-clamp-1 max-w-[85%]">
          {videoTitle || ""}
        </h3>
      </div>

      {/* Center Touch Controls (YouTube Mobile Style) */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {/* On mobile / tablets or when paused, show center touch controls */}
        {(showControls || !isPlaying) && !isBuffering && (
          <div className="flex items-center gap-6 sm:gap-10 pointer-events-auto">
            {/* 10s Rewind Touch Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeekRelative(-10);
              }}
              aria-label="Rewind 10 seconds"
              title="Rewind 10 seconds"
              className="w-10 h-10 sm:w-12 sm:h-12 flex sm:hidden items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white/90 active:scale-95 transition-all shadow-lg"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Big Center Play / Pause Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white active:scale-95 transition-all shadow-2xl border border-white/20"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              ) : (
                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-1" />
              )}
            </button>

            {/* 10s Fast Forward Touch Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeekRelative(10);
              }}
              aria-label="Fast forward 10 seconds"
              title="Fast forward 10 seconds"
              className="w-10 h-10 sm:w-12 sm:h-12 flex sm:hidden items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white/90 active:scale-95 transition-all shadow-lg"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar Gradient */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full pb-1.5 sm:pb-2 px-2 sm:px-3 pt-6 sm:pt-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-auto space-y-0.5 sm:space-y-1"
      >
        {/* Timeline Slider with Hover Preview */}
        <div className="px-0.5 sm:px-1">
          <TimelineSlider
            currentTime={currentTime}
            duration={duration}
            bufferedTime={bufferedTime}
            videoSrc={videoSrc}
            posterSrc={posterSrc}
            onSeek={onSeek}
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-white select-none min-w-0 flex-nowrap gap-1">
          {/* Left Controls: Play, Prev, Next, Seek 10s, Volume, Time */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 min-w-0 flex-shrink">
            {/* Previous Video (Desktop only) */}
            {hasPreviousVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviousVideo?.();
                }}
                aria-label="Previous video"
                title="Previous video"
                className="w-8 h-8 sm:w-9 sm:h-9 hidden sm:flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>
            )}

            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              aria-label={isPlaying ? "Pause (k or Space)" : "Play (k or Space)"}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-6 sm:h-6 fill-current" />
              ) : (
                <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Video */}
            {hasNextVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNextVideo?.();
                }}
                aria-label="Next video (Shift+N or N)"
                title="Next video (N)"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>
            )}

            {/* 10-second Seek Backward (Tablet/Desktop) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeekRelative(-10);
              }}
              aria-label="Rewind 10 seconds (←)"
              title="Rewind 10 seconds (←)"
              className="w-9 h-9 hidden md:flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* 10-second Seek Forward (Tablet/Desktop) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeekRelative(10);
              }}
              aria-label="Fast forward 10 seconds (→)"
              title="Fast forward 10 seconds (→)"
              className="w-9 h-9 hidden md:flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0"
            >
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Volume Control */}
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={onVolumeChange}
              onToggleMute={onToggleMute}
            />

            {/* Playback Time Display */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRemainingTime((prev) => !prev);
              }}
              aria-label="Toggle time format"
              title="Click to toggle remaining time"
              className="text-[11px] sm:text-xs font-mono font-medium text-white/90 hover:text-white px-1 sm:px-1.5 py-0.5 sm:py-1 rounded hover:bg-white/10 transition-colors focus:outline-none whitespace-nowrap flex-shrink-0"
            >
              {showRemainingTime ? (
                <span>{formattedRemaining}</span>
              ) : (
                <span>
                  {formattedCurrent} / {formattedDuration}
                </span>
              )}
            </button>
          </div>

          {/* Right Controls: Captions, Settings, PiP, Theater, Fullscreen */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
            {/* Subtitles / Captions Toggle */}
            {hasSubtitles && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCaptions();
                }}
                aria-label={captionsEnabled ? "Turn off captions (c)" : "Turn on captions (c)"}
                title={captionsEnabled ? "Subtitles on (c)" : "Subtitles off (c)"}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-colors focus:outline-none ${
                  captionsEnabled
                    ? "text-red-500 hover:text-red-400 bg-white/10"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Subtitles className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Settings Menu (Speed, Quality) */}
            <SettingsMenu
              playbackRate={playbackRate}
              selectedQuality={selectedQuality}
              availableQualities={availableQualities}
              onPlaybackRateChange={onPlaybackRateChange}
              onQualityChange={onQualityChange}
            />

            {/* Picture-in-Picture Toggle (Desktop/Tablet) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePiP();
              }}
              aria-label={isPiP ? "Exit Picture-in-Picture (p)" : "Picture-in-Picture (p)"}
              title="Picture-in-Picture (p)"
              className={`w-8 h-8 sm:w-9 sm:h-9 hidden sm:flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors focus:outline-none ${
                isPiP ? "text-red-500" : "text-white/90 hover:text-white"
              }`}
            >
              <PictureInPicture2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Theater Mode Toggle (Desktop) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleTheaterMode();
              }}
              aria-label={isTheaterMode ? "Exit Theater mode (t)" : "Theater mode (t)"}
              title={isTheaterMode ? "Exit Theater mode (t)" : "Theater mode (t)"}
              className={`w-8 h-8 sm:w-9 sm:h-9 hidden md:flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors focus:outline-none ${
                isTheaterMode ? "text-red-500 bg-white/10" : "text-white/90 hover:text-white"
              }`}
            >
              <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Full-screen Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              aria-label={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
              title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
