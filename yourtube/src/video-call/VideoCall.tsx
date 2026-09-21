import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { useWebRTC } from "./useWebRTC";
import { PreJoinScreen } from "./PreJoinScreen";
import { VideoTile } from "./VideoTile";
import { InCallControls } from "./InCallControls";
import { ChatDrawer } from "./ChatDrawer";
import { ParticipantsDrawer } from "./ParticipantsDrawer";
import { SecurityModal } from "./SecurityModal";
import { RecordingModal } from "./RecordingModal";
import {
  Copy,
  Check,
  Circle,
  Lock,
  Grid,
  Layout,
  Clock,
  ArrowLeft,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VideoCallProps {
  initialRoomId?: string;
}

export default function VideoCall({ initialRoomId }: VideoCallProps) {
  const router = useRouter();
  const { user } = useUser();

  const roomId = initialRoomId || (router.query.roomId as string) || "general-room";
  const [userName, setUserName] = useState("");
  const [passcode, setPasscode] = useState("");

  // Pre-join audio/video preferences
  const [initialAudio, setInitialAudio] = useState(true);
  const [initialVideo, setInitialVideo] = useState(true);
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");

  // UI Panels
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<"grid" | "spotlight">("grid");
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);

  // Call duration timer
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Set default display name from auth context
  useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
    } else if (!userName) {
      setUserName("Guest " + Math.floor(1000 + Math.random() * 9000));
    }
  }, [user, userName]);

  // Hook for WebRTC & signaling
  const {
    currentSocketId,
    localStream,
    remoteStreams,
    isJoined,
    inWaitingRoom,
    waitingRoomMessage,
    isHost,
    isCoHost,
    participants,
    waitingList,
    chatMessages,
    roomSettings,
    reactions,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isHandRaised,
    recordedBlobUrl,
    setRecordedBlobUrl,
    audioDevices,
    videoDevices,
    audioLevel,
    mediaError,
    initLocalStream,
    joinMeeting,
    leaveMeeting,
    toggleAudio,
    toggleVideo,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    toggleRaiseHand,
    sendReaction,
    sendChatMessage,
    startRecording,
    stopRecording,
    forceMuteParticipant,
    forceMuteAll,
    kickParticipant,
    setCoHostStatus,
    toggleLockMeeting,
    toggleWaitingRoom,
    togglePermission,
    admitWaitingUser,
    endMeetingForAll,
  } = useWebRTC({
    roomId,
    userName,
    avatar: user?.image || null,
    passcode,
    initialAudio,
    initialVideo,
    selectedAudioId,
    selectedVideoId,
    onCallEnded: () => setHasLeft(true),
  });

  // Call duration counter
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isJoined) {
      timer = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDurationSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isJoined]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleAudio();
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        toggleVideo();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        toggleRaiseHand();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setIsParticipantsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAudio, toggleVideo, toggleRaiseHand]);

  // Format call duration HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const copyMeetingLink = () => {
    const url = `${window.location.origin}/video-call/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Meeting link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 1. Post-Call Screen
  if (hasLeft) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-950 text-white p-6 select-none">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">You left the meeting</h1>
            <p className="text-sm text-gray-400 mt-1">
              Thank you for using YourTube Video Calling.
            </p>
          </div>

          {recordedBlobUrl && (
            <div className="p-4 bg-gray-800/80 rounded-2xl border border-gray-700 space-y-2">
              <p className="text-xs text-gray-300 font-medium">
                Your call recording is ready!
              </p>
              <Button
                variant="default"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setRecordedBlobUrl(recordedBlobUrl)}
              >
                Review & Download Recording
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl flex items-center justify-center gap-2"
              onClick={() => {
                setHasLeft(false);
                joinMeeting();
              }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rejoin Meeting</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full border-gray-700 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center justify-center gap-2"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to YouTube Home</span>
            </Button>
          </div>
        </div>

        <RecordingModal
          isOpen={Boolean(recordedBlobUrl)}
          onClose={() => setRecordedBlobUrl(null)}
          recordedUrl={recordedBlobUrl}
          roomId={roomId}
        />
      </div>
    );
  }

  // 2. Waiting Room Screen
  if (inWaitingRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-950 text-white p-6 select-none">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold">Waiting to be admitted</h1>
            <p className="text-sm text-gray-400 mt-2">
              {waitingRoomMessage ||
                "Please wait, the host will let you into the meeting soon."}
            </p>
            <p className="text-xs text-gray-500 font-mono mt-2">Room: {roomId}</p>
          </div>

          <Button
            variant="outline"
            className="border-gray-700 bg-gray-800 hover:bg-gray-700 text-white rounded-xl"
            onClick={leaveMeeting}
          >
            Leave Waiting Room
          </Button>
        </div>
      </div>
    );
  }

  // 3. Pre-Join Preview Screen
  if (!isJoined) {
    return (
      <PreJoinScreen
        roomId={roomId}
        userName={userName}
        setUserName={setUserName}
        passcode={passcode}
        setPasscode={setPasscode}
        isAudioEnabled={isAudioEnabled}
        setIsAudioEnabled={setInitialAudio}
        isVideoEnabled={isVideoEnabled}
        setIsVideoEnabled={setInitialVideo}
        selectedAudioId={selectedAudioId}
        setSelectedAudioId={setSelectedAudioId}
        selectedVideoId={selectedVideoId}
        setSelectedVideoId={setSelectedVideoId}
        onJoin={joinMeeting}
        localStream={localStream}
        audioLevel={audioLevel}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        mediaError={mediaError}
        onRetryMedia={initLocalStream}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
      />
    );
  }

  // 4. In-Call Live Meeting
  // Find local participant object
  const matchedLocal =
    participants.find((p) => currentSocketId && p.socketId === currentSocketId) ||
    participants.find((p) => p.userName === userName);

  const localParticipant = matchedLocal
    ? {
        ...matchedLocal,
        audioEnabled: isAudioEnabled,
        videoEnabled: isVideoEnabled,
        isHandRaised,
      }
    : {
        socketId: currentSocketId || "local",
        userName: userName || "You",
        isHost,
        isCoHost,
        audioEnabled: isAudioEnabled,
        videoEnabled: isVideoEnabled,
        isHandRaised,
        isSpeaking: false,
        connectionQuality: "good" as const,
        joinedAt: Date.now(),
      };

  // Remote participants list
  const remoteParticipants = participants.filter((p) => {
    if (currentSocketId && p.socketId) {
      return p.socketId !== currentSocketId;
    }
    return p.userName !== userName;
  });

  // All tiles to render
  const allParticipants = [localParticipant, ...remoteParticipants];

  // Grid column calculation
  const totalCount = allParticipants.length;
  let gridLayoutClass = "grid-cols-1";
  if (totalCount === 2) gridLayoutClass = "grid-cols-1 md:grid-cols-2";
  else if (totalCount >= 3 && totalCount <= 4)
    gridLayoutClass = "grid-cols-1 sm:grid-cols-2";
  else if (totalCount >= 5 && totalCount <= 6)
    gridLayoutClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  else if (totalCount >= 7)
    gridLayoutClass = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  // Check pinned participant
  const pinnedParticipant = pinnedSocketId
    ? allParticipants.find((p) => p.socketId === pinnedSocketId)
    : null;

  return (
    <div className="relative flex flex-col h-screen w-full bg-gray-950 text-white overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800 text-xs">
            <span className="font-semibold text-gray-300 font-mono">{roomId}</span>
            <button
              onClick={copyMeetingLink}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copy meeting link"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Call duration timer */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(callDurationSeconds)}</span>
          </div>

          {/* Recording Banner */}
          {roomSettings.isRecording && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-600/40 text-xs font-semibold animate-pulse">
              <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
              <span>
                REC {roomSettings.recordingStartedBy && `(${roomSettings.recordingStartedBy})`}
              </span>
            </div>
          )}

          {/* Meeting Locked Badge */}
          {roomSettings.isLocked && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/40">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </div>
          )}
        </div>

        {/* View Layout Switcher */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 rounded-lg hidden sm:flex items-center gap-1.5"
            onClick={() =>
              setLayoutMode((prev) => (prev === "grid" ? "spotlight" : "grid"))
            }
          >
            {layoutMode === "grid" ? (
              <>
                <Layout className="w-3.5 h-3.5" />
                <span>Spotlight</span>
              </>
            ) : (
              <>
                <Grid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Video Viewport & Side Drawers */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Reaction Animations */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {reactions.map((rx) => (
            <div
              key={rx.id}
              className="absolute bottom-16 text-3xl md:text-4xl animate-float-up pointer-events-none"
              style={{ left: `${rx.x}%` }}
            >
              <div className="flex flex-col items-center">
                <span>{rx.emoji}</span>
                <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full font-sans mt-0.5">
                  {rx.senderName}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Video Canvas / Grid Area */}
        <main className="flex-1 p-3 md:p-4 overflow-y-auto flex items-center justify-center">
          {layoutMode === "spotlight" || pinnedParticipant ? (
            /* Spotlight / Pinned View */
            <div className="w-full h-full flex flex-col gap-3">
              {/* Main Stage Video */}
              <div className="flex-1 w-full min-h-0 relative">
                {(() => {
                  const focal = pinnedParticipant || allParticipants[0];
                  const isLocal = focal.socketId === localParticipant.socketId;
                  const stream = isLocal
                    ? localStream
                    : remoteStreams[focal.socketId] || null;

                  return (
                    <VideoTile
                      participant={focal}
                      stream={stream}
                      isLocal={isLocal}
                      isPinned={Boolean(pinnedSocketId)}
                      onTogglePin={() =>
                        setPinnedSocketId(
                          pinnedSocketId === focal.socketId ? null : focal.socketId
                        )
                      }
                      canModerate={isHost || isCoHost}
                      onForceMute={forceMuteParticipant}
                      onKick={kickParticipant}
                      onToggleCoHost={(id, cur) => setCoHostStatus(id, !cur)}
                    />
                  );
                })()}
              </div>

              {/* Filmstrip of other participants */}
              {allParticipants.length > 1 && (
                <div className="h-32 md:h-40 flex items-center gap-3 overflow-x-auto pb-1 flex-shrink-0">
                  {allParticipants.map((p) => {
                    const isLocal = p.socketId === localParticipant.socketId;
                    const stream = isLocal
                      ? localStream
                      : remoteStreams[p.socketId] || null;

                    return (
                      <div
                        key={p.socketId}
                        className="w-48 h-full flex-shrink-0 cursor-pointer"
                        onClick={() => setPinnedSocketId(p.socketId)}
                      >
                        <VideoTile
                          participant={p}
                          stream={stream}
                          isLocal={isLocal}
                          isPinned={pinnedSocketId === p.socketId}
                          onTogglePin={() =>
                            setPinnedSocketId(
                              pinnedSocketId === p.socketId ? null : p.socketId
                            )
                          }
                          canModerate={isHost || isCoHost}
                          onForceMute={forceMuteParticipant}
                          onKick={kickParticipant}
                          onToggleCoHost={(id, cur) =>
                            setCoHostStatus(id, !cur)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Grid View */
            <div
              className={`w-full h-full grid gap-3 md:gap-4 max-w-7xl auto-rows-fr ${gridLayoutClass}`}
            >
              {allParticipants.map((p) => {
                const isLocal = p.socketId === localParticipant.socketId;
                const stream = isLocal
                  ? localStream
                  : remoteStreams[p.socketId] || null;

                return (
                  <div key={p.socketId} className="w-full h-full min-h-[220px]">
                    <VideoTile
                      participant={p}
                      stream={stream}
                      isLocal={isLocal}
                      isPinned={pinnedSocketId === p.socketId}
                      onTogglePin={() =>
                        setPinnedSocketId(
                          pinnedSocketId === p.socketId ? null : p.socketId
                        )
                      }
                      canModerate={isHost || isCoHost}
                      onForceMute={forceMuteParticipant}
                      onKick={kickParticipant}
                      onToggleCoHost={(id, cur) => setCoHostStatus(id, !cur)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* In-Call Chat Drawer */}
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chatMessages}
          participants={allParticipants}
          currentUserId={localParticipant.socketId}
          allowChat={roomSettings.allowChat}
          canModerate={isHost || isCoHost}
          onSendMessage={sendChatMessage}
        />

        {/* Participants Drawer */}
        <ParticipantsDrawer
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          participants={allParticipants}
          waitingList={waitingList}
          currentUserId={localParticipant.socketId}
          isHost={isHost}
          isCoHost={isCoHost}
          onAdmitUser={admitWaitingUser}
          onMuteParticipant={forceMuteParticipant}
          onMuteAll={forceMuteAll}
          onKickParticipant={kickParticipant}
          onToggleCoHost={(id, cur) => setCoHostStatus(id, !cur)}
        />
      </div>

      {/* Bottom Floating In-Call Controls */}
      <InCallControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isRecording={roomSettings.isRecording}
        isHost={isHost}
        isCoHost={isCoHost}
        unreadCount={0}
        participantsCount={allParticipants.length}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onSwitchCamera={switchCamera}
        onToggleScreenShare={
          isScreenSharing ? stopScreenShare : startScreenShare
        }
        onToggleRaiseHand={toggleRaiseHand}
        onSendReaction={sendReaction}
        onToggleRecording={
          roomSettings.isRecording ? stopRecording : startRecording
        }
        onToggleChat={() => {
          setIsChatOpen((prev) => !prev);
          if (isParticipantsOpen) setIsParticipantsOpen(false);
        }}
        onToggleParticipants={() => {
          setIsParticipantsOpen((prev) => !prev);
          if (isChatOpen) setIsChatOpen(false);
        }}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onLeaveCall={leaveMeeting}
        onEndCallForAll={endMeetingForAll}
      />

      {/* Host & Security Modal */}
      <SecurityModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        roomId={roomId}
        roomSettings={roomSettings}
        passcode={passcode}
        onToggleLock={toggleLockMeeting}
        onToggleWaitingRoom={toggleWaitingRoom}
        onTogglePermission={togglePermission}
      />

      {/* Recording Review Modal */}
      <RecordingModal
        isOpen={Boolean(recordedBlobUrl)}
        onClose={() => setRecordedBlobUrl(null)}
        recordedUrl={recordedBlobUrl}
        roomId={roomId}
      />
    </div>
  );
}
