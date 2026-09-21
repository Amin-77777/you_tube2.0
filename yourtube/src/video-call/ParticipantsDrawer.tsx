import React, { useState } from "react";
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Crown,
  Shield,
  Hand,
  MoreVertical,
  Check,
  Ban,
  Search,
  VolumeX,
} from "lucide-react";
import { Participant, WaitingUser } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  waitingList: WaitingUser[];
  currentUserId: string;
  isHost: boolean;
  isCoHost: boolean;
  onAdmitUser: (socketId: string, approved: boolean) => void;
  onMuteParticipant: (socketId: string) => void;
  onMuteAll: () => void;
  onKickParticipant: (socketId: string) => void;
  onToggleCoHost: (socketId: string, currentStatus: boolean) => void;
}

export const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  participants,
  waitingList,
  currentUserId,
  isHost,
  isCoHost,
  onAdmitUser,
  onMuteParticipant,
  onMuteAll,
  onKickParticipant,
  onToggleCoHost,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const canModerate = isHost || isCoHost;

  const filteredParticipants = participants.filter((p) =>
    p.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 md:w-96 bg-gray-900 border-l border-gray-800 flex flex-col h-full z-40 text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Participants</h2>
          <span className="px-2 py-0.5 text-xs bg-gray-800 rounded-full font-mono text-gray-300">
            {participants.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Host Action Bar */}
      {canModerate && (
        <div className="px-4 py-2.5 bg-gray-950/70 border-b border-gray-800 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400 font-medium">Host Controls:</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center gap-1.5"
            onClick={onMuteAll}
          >
            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
            <span>Mute All</span>
          </Button>
        </div>
      )}

      {/* Waiting Room Section (Host view) */}
      {canModerate && waitingList.length > 0 && (
        <div className="p-3 bg-amber-950/30 border-b border-amber-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400">
              Waiting Room ({waitingList.length})
            </span>
          </div>

          <div className="space-y-2">
            {waitingList.map((user) => (
              <div
                key={user.socketId}
                className="flex items-center justify-between p-2 bg-gray-900/90 rounded-lg border border-amber-900/40 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                    {user.userName[0].toUpperCase()}
                  </div>
                  <span className="truncate font-medium">{user.userName}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-full bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400"
                    onClick={() => onAdmitUser(user.socketId, true)}
                    title="Admit"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-full bg-rose-600/20 hover:bg-rose-600/40 text-rose-400"
                    onClick={() => onAdmitUser(user.socketId, false)}
                    title="Deny"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search participants..."
            className="pl-8 h-8 text-xs bg-gray-800 border-gray-700 text-white placeholder-gray-500 rounded-lg"
          />
        </div>
      </div>

      {/* Active Participants List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredParticipants.map((p) => {
          const isSelf = p.socketId === currentUserId;

          return (
            <div
              key={p.socketId}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-800/60 transition-colors"
            >
              <div className="flex items-center gap-2.5 truncate max-w-[65%]">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-white">
                    {p.userName[0].toUpperCase()}
                  </div>
                  {p.isSpeaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-gray-900 animate-pulse" />
                  )}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-medium truncate text-gray-200">
                      {p.userName} {isSelf && "(You)"}
                    </span>
                    {p.isHost && (
                      <span title="Host" className="text-amber-400">
                        <Crown className="w-3 h-3 fill-amber-400" />
                      </span>
                    )}
                    {p.isCoHost && !p.isHost && (
                      <span title="Co-Host" className="text-blue-400">
                        <Shield className="w-3 h-3 fill-blue-400" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Icons & Menu */}
              <div className="flex items-center gap-1 text-gray-400">
                {p.isHandRaised && (
                  <span title="Hand Raised" className="text-amber-400">
                    <Hand className="w-3.5 h-3.5 fill-amber-400" />
                  </span>
                )}

                {p.videoEnabled ? (
                  <Video className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                )}

                {p.audioEnabled ? (
                  <Mic className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                )}

                {/* Moderate menu if user can moderate and this is another participant */}
                {canModerate && !isSelf && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-full text-gray-400 hover:text-white"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-gray-900 border-gray-800 text-white">
                      <DropdownMenuItem
                        onClick={() => onMuteParticipant(p.socketId)}
                        className="text-xs flex items-center gap-2 hover:bg-gray-800 cursor-pointer"
                      >
                        <MicOff className="w-3.5 h-3.5 text-amber-500" />
                        <span>Mute</span>
                      </DropdownMenuItem>

                      {isHost && (
                        <DropdownMenuItem
                          onClick={() => onToggleCoHost(p.socketId, p.isCoHost)}
                          className="text-xs flex items-center gap-2 hover:bg-gray-800 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-blue-500" />
                          <span>{p.isCoHost ? "Revoke Co-Host" : "Make Co-Host"}</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="bg-gray-800" />

                      <DropdownMenuItem
                        onClick={() => onKickParticipant(p.socketId)}
                        className="text-xs flex items-center gap-2 text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Remove from Call</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
