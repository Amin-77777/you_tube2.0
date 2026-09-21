import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import {
  Video,
  Plus,
  Keyboard,
  Shield,
  Users,
  Monitor,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Clock,
  Key,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function VideoCallLobby() {
  const router = useRouter();
  const { user } = useUser();

  const [joinCode, setJoinCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [enableWaitingRoom, setEnableWaitingRoom] = useState(false);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("yourtube_recent_rooms");
      if (stored) {
        setRecentRooms(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  // Generate a random room code like 'meet-4fa-9k2'
  const generateRoomId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const part1 = Array.from({ length: 3 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
    const part2 = Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
    const part3 = Array.from({ length: 3 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
    return `${part1}-${part2}-${part3}`;
  };

  const saveRecentRoom = (roomId: string) => {
    try {
      const updated = [roomId, ...recentRooms.filter((r) => r !== roomId)].slice(0, 5);
      setRecentRooms(updated);
      localStorage.setItem("yourtube_recent_rooms", JSON.stringify(updated));
    } catch (e) {}
  };

  const handleCreateInstantMeeting = () => {
    const roomId = generateRoomId();
    saveRecentRoom(roomId);
    router.push(`/video-call/${roomId}`);
  };

  const handleCreateCustomMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const roomId = generateRoomId();
    saveRecentRoom(roomId);

    // Save initial room preferences in session
    if (passcode) {
      sessionStorage.setItem(`passcode_${roomId}`, passcode);
    }
    if (enableWaitingRoom) {
      sessionStorage.setItem(`waiting_room_${roomId}`, "true");
    }

    router.push(`/video-call/${roomId}`);
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = joinCode.trim();
    if (!cleaned) return;

    // If a full URL was pasted, extract room ID
    if (cleaned.includes("/video-call/")) {
      cleaned = cleaned.split("/video-call/")[1].split("?")[0].split("/")[0];
    } else if (cleaned.includes("http")) {
      const parts = cleaned.split("/");
      cleaned = parts[parts.length - 1];
    }

    cleaned = cleaned.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();

    if (!cleaned) {
      toast.error("Please enter a valid meeting code or link.");
      return;
    }

    saveRecentRoom(cleaned);
    router.push(`/video-call/${cleaned}`);
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-60px)] bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 p-6 md:p-12 select-none">
      <Head>
        <title>Video Calling | YourTube</title>
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200/60 dark:border-red-800/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time HD Video Meetings</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.15]">
              Secure, crystal-clear video calls for everyone.
            </h1>

            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl">
              Connect 1-on-1 or in high-capacity group calls with ultra-low latency,
              live screen sharing, interactive chat, host moderation controls, and call recording.
            </p>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-6 rounded-2xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2.5 text-sm"
                onClick={handleCreateInstantMeeting}
              >
                <Video className="w-5 h-5" />
                <span>New Instant Meeting</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium px-5 py-6 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-sm"
                onClick={() => setShowCreateModal(true)}
              >
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Meeting Options</span>
              </Button>
            </div>

            {/* Join by Code Form */}
            <form onSubmit={handleJoinMeeting} className="flex items-center gap-3 pt-2 max-w-md">
              <div className="relative flex-1">
                <Keyboard className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter meeting code or link"
                  className="pl-10 h-12 rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!joinCode.trim()}
                className="h-12 px-6 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 font-medium text-sm transition-all"
              >
                <span>Join</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            {/* Recent meetings list */}
            {recentRooms.length > 0 && (
              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recent Rooms</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentRooms.map((room) => (
                    <button
                      key={room}
                      onClick={() => router.push(`/video-call/${room}`)}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-mono text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {room}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visual Feature Showcase */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 p-8 rounded-3xl border border-gray-800 shadow-2xl text-white space-y-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Feature Highlights
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 bg-red-600/20 text-red-400 rounded-full font-medium">
                  WebRTC Mesh
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                  <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">HD Audio & Video</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Adaptive bitrate and low latency communication powered by WebRTC.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Instant Screen Sharing</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Present slides, windows, or your entire screen with seamless switching.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Host Moderation</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Mute participants, lock meetings, co-host delegation, and waiting rooms.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Chat, Reactions & Files</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Public and private messages, floating emojis, and secure file sharing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Options Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 text-gray-900 dark:text-white animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">New Meeting Options</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Configure security before starting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomMeeting} className="space-y-4">
              <div>
                <Label htmlFor="passcodeOpt" className="text-xs font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Meeting Passcode (Optional)</span>
                </Label>
                <Input
                  id="passcodeOpt"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Set an entry passcode"
                  className="mt-1.5 text-sm"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Participants will be prompted for this code to join.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-xs font-semibold">Enable Waiting Room</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      You must approve participants to enter
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={enableWaitingRoom}
                  onChange={(e) => setEnableWaitingRoom(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 accent-red-600 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  Start Meeting
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
