import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  MessageSquare,
  Hand,
  Smile,
  Circle,
  Shield,
  SwitchCamera,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InCallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  isHost: boolean;
  isCoHost: boolean;
  unreadCount: number;
  participantsCount: number;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleRaiseHand: () => void;
  onSendReaction: (emoji: string) => void;
  onToggleRecording: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onOpenSecurity: () => void;
  onLeaveCall: () => void;
  onEndCallForAll: () => void;
}

const EMOJIS = ["❤️", "👏", "👍", "🎉", "😂", "🔥", "🚀", "💡"];

export const InCallControls: React.FC<InCallControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isHandRaised,
  isRecording,
  isHost,
  isCoHost,
  unreadCount,
  participantsCount,
  isChatOpen,
  isParticipantsOpen,
  onToggleAudio,
  onToggleVideo,
  onSwitchCamera,
  onToggleScreenShare,
  onToggleRaiseHand,
  onSendReaction,
  onToggleRecording,
  onToggleChat,
  onToggleParticipants,
  onOpenSecurity,
  onLeaveCall,
  onEndCallForAll,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showEndCallConfirm, setShowEndCallConfirm] = useState(false);

  const canModerate = isHost || isCoHost;

  return (
    <div className="relative flex items-center justify-center gap-2 md:gap-3 py-3 px-4 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 text-white select-none">
      {/* Mic Toggle */}
      <div className="flex items-center">
        <Button
          type="button"
          size="icon"
          variant={isAudioEnabled ? "secondary" : "destructive"}
          className={`w-11 h-11 rounded-full transition-all shadow-md ${
            isAudioEnabled
              ? "bg-gray-800 hover:bg-gray-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-500/50"
          }`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? "Mute Microphone (m)" : "Unmute Microphone (m)"}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
      </div>

      {/* Video Toggle */}
      <div className="flex items-center">
        <Button
          type="button"
          size="icon"
          variant={isVideoEnabled ? "secondary" : "destructive"}
          className={`w-11 h-11 rounded-full transition-all shadow-md ${
            isVideoEnabled
              ? "bg-gray-800 hover:bg-gray-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-500/50"
          }`}
          onClick={onToggleVideo}
          title={isVideoEnabled ? "Turn Off Camera (v)" : "Turn On Camera (v)"}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
      </div>

      {/* Switch Camera (Mobile & Multi-camera) */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="w-11 h-11 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white hidden sm:flex"
        onClick={onSwitchCamera}
        title="Switch Camera"
      >
        <SwitchCamera className="w-5 h-5" />
      </Button>

      {/* Screen Share Toggle */}
      <Button
        type="button"
        size="icon"
        variant={isScreenSharing ? "secondary" : "ghost"}
        className={`w-11 h-11 rounded-full transition-all shadow-md ${
          isScreenSharing
            ? "bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-500/50"
            : "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
        }`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
      >
        {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
      </Button>

      {/* Raise Hand Toggle */}
      <Button
        type="button"
        size="icon"
        variant={isHandRaised ? "secondary" : "ghost"}
        className={`w-11 h-11 rounded-full transition-all shadow-md ${
          isHandRaised
            ? "bg-amber-500 hover:bg-amber-600 text-black ring-2 ring-amber-400/50 animate-bounce"
            : "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
        }`}
        onClick={onToggleRaiseHand}
        title={isHandRaised ? "Lower Hand" : "Raise Hand"}
      >
        <Hand className={`w-5 h-5 ${isHandRaised ? "fill-black" : ""}`} />
      </Button>

      {/* Reactions Menu */}
      <div className="relative">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-11 h-11 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
          onClick={() => setShowReactions(!showReactions)}
          title="Send Reaction"
        >
          <Smile className="w-5 h-5" />
        </Button>

        {showReactions && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 bg-gray-900/95 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-xl transition-transform hover:scale-125 active:scale-95"
                onClick={() => {
                  onSendReaction(emoji);
                  setShowReactions(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Call Recording (Host/CoHost) */}
      {canModerate && (
        <Button
          type="button"
          size="icon"
          variant={isRecording ? "destructive" : "ghost"}
          className={`w-11 h-11 rounded-full transition-all shadow-md ${
            isRecording
              ? "bg-red-600 text-white animate-pulse"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
          }`}
          onClick={onToggleRecording}
          title={isRecording ? "Stop Recording" : "Start Recording"}
        >
          <Circle className={`w-5 h-5 ${isRecording ? "fill-white" : "fill-red-500 text-red-500"}`} />
        </Button>
      )}

      {/* Participants Drawer Toggle */}
      <div className="relative">
        <Button
          type="button"
          size="icon"
          variant={isParticipantsOpen ? "secondary" : "ghost"}
          className={`w-11 h-11 rounded-full transition-all shadow-md ${
            isParticipantsOpen
              ? "bg-white text-black"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
          }`}
          onClick={onToggleParticipants}
          title="Participants"
        >
          <Users className="w-5 h-5" />
        </Button>
        {participantsCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gray-700 text-white rounded-full border border-gray-900 pointer-events-none">
            {participantsCount}
          </span>
        )}
      </div>

      {/* Chat Drawer Toggle */}
      <div className="relative">
        <Button
          type="button"
          size="icon"
          variant={isChatOpen ? "secondary" : "ghost"}
          className={`w-11 h-11 rounded-full transition-all shadow-md ${
            isChatOpen
              ? "bg-white text-black"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
          }`}
          onClick={onToggleChat}
          title="In-Call Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full border border-gray-900 animate-pulse pointer-events-none">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Security & Host Settings */}
      {canModerate && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-11 h-11 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
          onClick={onOpenSecurity}
          title="Host & Security Controls"
        >
          <Shield className="w-5 h-5 text-amber-400" />
        </Button>
      )}

      {/* Leave / End Call */}
      <div className="relative">
        {isHost ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                className="h-11 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg shadow-red-600/30 flex items-center gap-1.5"
              >
                <PhoneOff className="w-5 h-5" />
                <span className="hidden md:inline text-xs">Leave</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-800 text-white">
              <DropdownMenuItem
                onClick={onLeaveCall}
                className="text-xs hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              >
                Just Leave Meeting
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onEndCallForAll}
                className="text-xs text-red-400 hover:bg-red-950/40 focus:bg-red-950/40 hover:text-red-300 focus:text-red-300 cursor-pointer"
              >
                End Meeting for All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            type="button"
            variant="destructive"
            className="h-11 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg shadow-red-600/30 flex items-center gap-1.5"
            onClick={onLeaveCall}
            title="Leave Meeting"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden md:inline text-xs">Leave</span>
          </Button>
        )}
      </div>
    </div>
  );
};
