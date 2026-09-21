import React, { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Pin,
  PinOff,
  MoreVertical,
  Crown,
  Shield,
  Hand,
  Monitor,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
} from "lucide-react";
import { Participant } from "./types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isLocal?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  canModerate?: boolean;
  onForceMute?: (socketId: string) => void;
  onKick?: (socketId: string) => void;
  onToggleCoHost?: (socketId: string, currentStatus: boolean) => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  participant,
  stream,
  isLocal = false,
  isPinned = false,
  onTogglePin,
  canModerate = false,
  onForceMute,
  onKick,
  onToggleCoHost,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch((err) => {
        console.warn("[VideoTile] Video AutoPlay error:", err);
      });
    }
  }, [stream]);

  // Dedicated audio playback for remote peers to ensure audio continues even when video is off
  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl && stream && !isLocal) {
      audioEl.srcObject = stream;
      audioEl.play().catch((err) => {
        console.warn("[VideoTile] Audio AutoPlay error:", err);
      });
    }
  }, [stream, isLocal]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = isLocal;
      videoEl.defaultMuted = isLocal;
    }
  }, [isLocal]);

  // Handle browser autoplay policy on document interaction
  useEffect(() => {
    const handleGesture = () => {
      if (audioRef.current && audioRef.current.paused && stream && !isLocal) {
        audioRef.current.play().catch(() => {});
      }
      if (videoRef.current && videoRef.current.paused && stream) {
        videoRef.current.play().catch(() => {});
      }
    };
    window.addEventListener("click", handleGesture);
    window.addEventListener("keydown", handleGesture);
    window.addEventListener("touchstart", handleGesture);
    return () => {
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
    };
  }, [stream, isLocal]);

  // Connection quality icon
  const renderQualityIcon = () => {
    const q = participant.connectionQuality || "good";
    if (q === "good") {
      return (
        <span title="Connection: Good" className="flex items-center text-emerald-400">
          <SignalHigh className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (q === "fair") {
      return (
        <span title="Connection: Fair" className="flex items-center text-amber-400">
          <SignalMedium className="w-3.5 h-3.5" />
        </span>
      );
    }
    return (
      <span title="Connection: Poor" className="flex items-center text-rose-500">
        <SignalLow className="w-3.5 h-3.5" />
      </span>
    );
  };

  const hasVideoTrack = Boolean(stream?.getVideoTracks()?.length);
  const isVideoOff = !participant.videoEnabled || !hasVideoTrack;
  const isAudioMuted = !participant.audioEnabled;

  return (
    <div
      className={`relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden shadow-lg border transition-all duration-200 select-none group ${
        participant.isSpeaking
          ? "border-emerald-500 ring-2 ring-emerald-500/50"
          : "border-gray-800 hover:border-gray-700"
      }`}
    >
      {/* Dedicated Remote Audio Playback Element */}
      {!isLocal && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
        />
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local audio to prevent feedback loop
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLocal ? "transform -scale-x-100" : ""
        } ${isVideoOff ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"}`}
      />

      {/* Avatar Placeholder when video is off */}
      {isVideoOff && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl transition-all ${
              participant.isSpeaking
                ? "bg-emerald-600 ring-4 ring-emerald-500/40 animate-pulse"
                : "bg-gray-800"
            }`}
          >
            {participant.userName ? participant.userName[0].toUpperCase() : "U"}
          </div>
          <p className="mt-3 text-sm text-gray-400 font-medium">{participant.userName}</p>
        </div>
      )}

      {/* Hand Raised Floating Badge */}
      {participant.isHandRaised && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-amber-500/90 text-black px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm animate-bounce">
          <Hand className="w-3.5 h-3.5 fill-black" />
          <span>Raised hand</span>
        </div>
      )}

      {/* Top-Right Action Badges & Pin */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
              isPinned
                ? "bg-red-600 text-white"
                : "bg-black/50 text-gray-300 hover:bg-black/75 hover:text-white"
            }`}
            title={isPinned ? "Unpin video" : "Pin video"}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Host Moderation Menu */}
        {canModerate && !isLocal && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full bg-black/50 text-gray-300 hover:bg-black/75 hover:text-white"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => onForceMute && onForceMute(participant.socketId)}
                className="text-xs flex items-center gap-2"
              >
                <MicOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Mute Participant</span>
              </DropdownMenuItem>

              {onToggleCoHost && (
                <DropdownMenuItem
                  onClick={() => onToggleCoHost(participant.socketId, participant.isCoHost)}
                  className="text-xs flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  <span>{participant.isCoHost ? "Revoke Co-Host" : "Make Co-Host"}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onKick && onKick(participant.socketId)}
                className="text-xs flex items-center gap-2 text-red-600 focus:text-red-600"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Remove from Call</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Bottom Information Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Name & Roles */}
        <div className="flex items-center gap-2 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white shadow-md max-w-[80%] truncate">
          {participant.isHost && (
            <span title="Host" className="text-amber-400">
              <Crown className="w-3.5 h-3.5 fill-amber-400" />
            </span>
          )}
          {participant.isCoHost && !participant.isHost && (
            <span title="Co-Host" className="text-blue-400">
              <Shield className="w-3.5 h-3.5 fill-blue-400" />
            </span>
          )}

          <span className="font-medium truncate">
            {participant.userName} {isLocal && "(You)"}
          </span>

          {participant.isSpeaking && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          )}
        </div>

        {/* Audio / Quality Status */}
        <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2 py-1.5 rounded-xl border border-white/10 shadow-md">
          {renderQualityIcon()}

          {isAudioMuted ? (
            <span title="Muted" className="text-rose-400">
              <MicOff className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span title="Mic Active" className="text-emerald-400">
              <Mic className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
