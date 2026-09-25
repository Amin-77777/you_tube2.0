"use client";

import React, { useRef, useState, useEffect } from "react";
import { getVideoSources, getThumbnailSrc } from "@/lib/videoUtils";
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    thumbnail?: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sources = getVideoSources(video?.filepath);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const activeSrc = sources[currentSourceIndex] || "";
  const posterSrc = getThumbnailSrc(video);

  useEffect(() => {
    setCurrentSourceIndex(0);
    setPlaybackError(null);

    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [video?.filepath, video?._id]);

  const handleVideoError = () => {
    // If another source is available (e.g. backend vs proxy), try it
    if (currentSourceIndex + 1 < sources.length) {
      console.warn(`Source ${activeSrc} failed. Switching to alternate: ${sources[currentSourceIndex + 1]}`);
      setCurrentSourceIndex((prev) => prev + 1);
      return;
    }

    const err = videoRef.current?.error;
    let msg = "Could not play this video.";
    if (err) {
      switch (err.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          msg = "Video playback was aborted.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          msg = "Network error loading video stream.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          msg = "Codec decode error in browser.";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          msg = "Video format or source not supported.";
          break;
      }
    }
    console.error("Playback error:", activeSrc, err);
    setPlaybackError(msg);
  };

  const handleRetry = () => {
    setPlaybackError(null);
    setCurrentSourceIndex(0);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(console.warn);
    }
  };

  if (!activeSrc) {
    return (
      <div className="aspect-video bg-gray-900 rounded-2xl flex flex-col items-center justify-center text-white p-6 shadow-inner">
        <AlertCircle className="w-12 h-12 text-gray-500 mb-2" />
        <p className="font-medium text-gray-300">No video source provided</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-lg group">
      <video
        key={activeSrc}
        ref={videoRef}
        src={activeSrc}
        poster={posterSrc}
        controls
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full object-contain bg-black"
        onPlaying={() => setPlaybackError(null)}
        onError={handleVideoError}
      >
        {sources.map((s, idx) => (
          <source key={idx} src={s} type="video/mp4" />
        ))}
        Your browser does not support the video tag.
      </video>

      {/* Non-blocking error banner at the bottom if an error occurs */}
      {playbackError && (
        <div className="absolute bottom-14 left-4 right-4 bg-red-950/90 border border-red-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-between gap-3 z-20 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-xs font-medium text-gray-200 truncate">
              {playbackError}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="text-white border-white/30 hover:bg-white/20 h-7 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
            <a
              href={activeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-300 hover:text-blue-100 flex items-center gap-1 px-2 py-1"
            >
              <ExternalLink className="w-3 h-3" />
              Direct
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
