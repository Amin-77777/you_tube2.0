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
      <div className="w-full pt-3 px-4 pb-12 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between pointer-events-auto">
        <h3 className="text-white font-medium text-sm sm:text-base drop-shadow-md line-clamp-1 max-w-[80%]">
          {videoTitle || ""}
        </h3>
      </div>

      {/* Center Clickable / Double-clickable Overlay for touch / click handling */}
      <div className="flex-1" />

      {/* Bottom Controls Bar Gradient */}
      <div className="w-full pb-2 px-3 pt-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-auto space-y-1">
        {/* Timeline Slider with Hover Preview */}
        <div className="px-1">
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
        <div className="flex items-center justify-between text-white select-none">
          {/* Left Controls: Play, Prev, Next, Seek 10s, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Previous Video (if available) */}
            {hasPreviousVideo && (
              <button
                type="button"
                onClick={onPreviousVideo}
                aria-label="Previous video"
                title="Previous video"
                className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>
            )}

            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? "Pause (k or Space)" : "Play (k or Space)"}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              className="w-10 h-10 flex items-center justify-center text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Video */}
            {hasNextVideo && (
              <button
                type="button"
                onClick={onNextVideo}
                aria-label="Next video (Shift+N or N)"
                title="Next video (N)"
                className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>
            )}

            {/* 10-second Seek Backward */}
            <button
              type="button"
              onClick={() => onSeekRelative(-10)}
              aria-label="Rewind 10 seconds (←)"
              title="Rewind 10 seconds (←)"
              className="w-9 h-9 hidden xs:flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* 10-second Seek Forward */}
            <button
              type="button"
              onClick={() => onSeekRelative(10)}
              aria-label="Fast forward 10 seconds (→)"
              title="Fast forward 10 seconds (→)"
              className="w-9 h-9 hidden xs:flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
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

            {/* Playback Time Display (Click to toggle remaining time) */}
            <button
              type="button"
              onClick={() => setShowRemainingTime((prev) => !prev)}
              aria-label="Toggle time format"
              title="Click to toggle remaining time"
              className="text-xs font-mono font-medium text-white/90 hover:text-white px-1.5 py-1 rounded hover:bg-white/10 transition-colors focus:outline-none"
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
          <div className="flex items-center gap-0.5 sm:gap-1.5">
            {/* Subtitles / Captions Toggle (shown only if subtitles track exists) */}
            {hasSubtitles && (
              <button
                type="button"
                onClick={onToggleCaptions}
                aria-label={captionsEnabled ? "Turn off captions (c)" : "Turn on captions (c)"}
                title={captionsEnabled ? "Subtitles on (c)" : "Subtitles off (c)"}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors focus:outline-none ${
                  captionsEnabled
                    ? "text-red-500 hover:text-red-400 bg-white/10"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Subtitles className="w-5 h-5" />
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

            {/* Picture-in-Picture Toggle */}
            <button
              type="button"
              onClick={onTogglePiP}
              aria-label={isPiP ? "Exit Picture-in-Picture (p)" : "Picture-in-Picture (p)"}
              title="Picture-in-Picture (p)"
              className={`w-9 h-9 hidden sm:flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors focus:outline-none ${
                isPiP ? "text-red-500" : "text-white/90 hover:text-white"
              }`}
            >
              <PictureInPicture2 className="w-5 h-5" />
            </button>

            {/* Theater Mode Toggle */}
            <button
              type="button"
              onClick={onToggleTheaterMode}
              aria-label={isTheaterMode ? "Exit Theater mode (t)" : "Theater mode (t)"}
              title={isTheaterMode ? "Exit Theater mode (t)" : "Theater mode (t)"}
              className={`w-9 h-9 hidden md:flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors focus:outline-none ${
                isTheaterMode ? "text-red-500 bg-white/10" : "text-white/90 hover:text-white"
              }`}
            >
              <Tv className="w-5 h-5" />
            </button>

            {/* Full-screen Toggle */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
              title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
              className="w-10 h-10 flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
