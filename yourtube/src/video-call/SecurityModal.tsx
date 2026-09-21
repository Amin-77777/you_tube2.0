import React, { useState } from "react";
import {
  Shield,
  Lock,
  Unlock,
  Users,
  Monitor,
  MessageSquare,
  Copy,
  Check,
  X,
  Key,
} from "lucide-react";
import { RoomSettings } from "./types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomSettings: RoomSettings;
  passcode?: string;
  onToggleLock: (locked: boolean) => void;
  onToggleWaitingRoom: (enabled: boolean) => void;
  onTogglePermission: (permission: "allowChat" | "allowScreenShare", val: boolean) => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomSettings,
  passcode,
  onToggleLock,
  onToggleWaitingRoom,
  onTogglePermission,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyLink = () => {
    const url = `${window.location.origin}/video-call/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Meeting link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Host Moderation & Security</h2>
              <p className="text-xs text-gray-400">Manage meeting access and permissions</p>
            </div>
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

        {/* Security Controls */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Meeting Access
          </div>

          {/* Lock Meeting */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/60 border border-gray-800">
            <div className="flex items-center gap-3">
              {roomSettings.isLocked ? (
                <Lock className="w-5 h-5 text-rose-400" />
              ) : (
                <Unlock className="w-5 h-5 text-emerald-400" />
              )}
              <div>
                <p className="text-xs font-medium">Lock Meeting</p>
                <p className="text-[11px] text-gray-400">
                  When locked, no new participants can join
                </p>
              </div>
            </div>

            <button
              onClick={() => onToggleLock(!roomSettings.isLocked)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                roomSettings.isLocked ? "bg-red-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                  roomSettings.isLocked ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Enable Waiting Room */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/60 border border-gray-800">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xs font-medium">Waiting Room</p>
                <p className="text-[11px] text-gray-400">
                  Admit participants before they can enter
                </p>
              </div>
            </div>

            <button
              onClick={() => onToggleWaitingRoom(!roomSettings.waitingRoomEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                roomSettings.waitingRoomEnabled ? "bg-red-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                  roomSettings.waitingRoomEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
            Participant Permissions
          </div>

          {/* Share Screen Permission */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/60 border border-gray-800">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs font-medium">Allow Screen Sharing</p>
                <p className="text-[11px] text-gray-400">
                  Allow participants to share their screens
                </p>
              </div>
            </div>

            <button
              onClick={() => onTogglePermission("allowScreenShare", !roomSettings.allowScreenShare)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                roomSettings.allowScreenShare ? "bg-red-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                  roomSettings.allowScreenShare ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Chat Permission */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/60 border border-gray-800">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-medium">Allow In-Call Chat</p>
                <p className="text-[11px] text-gray-400">
                  Allow participants to send text and files
                </p>
              </div>
            </div>

            <button
              onClick={() => onTogglePermission("allowChat", !roomSettings.allowChat)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                roomSettings.allowChat ? "bg-red-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                  roomSettings.allowChat ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Meeting Information */}
        <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Room ID:</span>
            <span className="font-mono font-semibold">{roomId}</span>
          </div>
          {passcode && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <Key className="w-3 h-3" />
                <span>Passcode:</span>
              </span>
              <span className="font-mono font-semibold text-amber-400">{passcode}</span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2 border-gray-700 bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center gap-2"
            onClick={copyLink}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied!" : "Copy Meeting Invite Link"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
