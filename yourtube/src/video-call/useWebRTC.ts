import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import {
  Participant,
  ChatMessage,
  RoomSettings,
  WaitingUser,
  ReactionItem,
  ChatFile,
} from "./types";
import { toast } from "sonner";

const getIceConfiguration = (): RTCConfiguration => {
  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.services.mozilla.com" },
  ];

  // If a custom TURN server is specified via environment variables (e.g. Metered.ca, Twilio, Coturn)
  if (process.env.NEXT_PUBLIC_TURN_URL) {
    const urls = process.env.NEXT_PUBLIC_TURN_URL.split(",").map((u) => u.trim());
    iceServers.push({
      urls,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
};

const ICE_SERVERS = getIceConfiguration();

interface UseWebRTCProps {
  roomId: string;
  userName: string;
  avatar?: string | null;
  passcode?: string;
  initialAudio?: boolean;
  initialVideo?: boolean;
  selectedAudioId?: string;
  selectedVideoId?: string;
  onCallEnded?: () => void;
}

export function useWebRTC({
  roomId,
  userName,
  avatar,
  passcode,
  initialAudio = true,
  initialVideo = true,
  selectedAudioId,
  selectedVideoId,
  onCallEnded,
}: UseWebRTCProps) {
  const socket = getSocket();

  // Local state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudio);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideo);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Call status
  const [isJoined, setIsJoined] = useState(false);
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [waitingRoomMessage, setWaitingRoomMessage] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    isLocked: false,
    waitingRoomEnabled: false,
    allowChat: true,
    allowScreenShare: true,
    isRecording: false,
    recordingStartedBy: null,
  });
  const [reactions, setReactions] = useState<ReactionItem[]>([]);

  // Remote streams: socketId -> MediaStream
  const [remoteStreams, setRemoteStreams] = useState<{
    [socketId: string]: MediaStream;
  }>({});

  // Recording
  const [isRecordingLocally, setIsRecordingLocally] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Refs for WebRTC mesh
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map()
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Current socket ID for unique local participant identification
  const [currentSocketId, setCurrentSocketId] = useState<string>(socket.id || "");

  useEffect(() => {
    if (socket.connected) {
      setCurrentSocketId(socket.id || "");
    }
    const onConnect = () => setCurrentSocketId(socket.id || "");
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket]);

  // Keep localStreamRef synced and ensure all peers have local tracks
  useEffect(() => {
    localStreamRef.current = localStream;
    if (localStream) {
      peersRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        localStream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch((err) => console.warn("replaceTrack error:", err));
          } else {
            pc.addTrack(track, localStream);
          }
        });
      });
    }
  }, [localStream]);

  // Device enumeration listener
  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.enumerateDevices) return;
    const updateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      } catch (e) {
        console.warn("enumerateDevices error:", e);
      }
    };
    updateDevices();
    navigator.mediaDevices.addEventListener("devicechange", updateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", updateDevices);
    };
  }, []);

  // Resume suspended AudioContext on user gesture
  useEffect(() => {
    const handleGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener("click", handleGesture);
    window.addEventListener("keydown", handleGesture);
    return () => {
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, []);

  // Audio level detection for active speaker indicator and pre-join meter
  const setupAudioDetection = useCallback((stream: MediaStream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Visual volume level (0 to 100)
        const level = Math.min(100, Math.round((average / 128) * 100));
        setAudioLevel(level);

        // Active speaker flag (only if audio track is actually enabled)
        const isTrackEnabled = stream.getAudioTracks()[0]?.enabled ?? false;
        const currentlySpeaking = isTrackEnabled && average > 18;

        if (currentlySpeaking) {
          speakingCounter = 5;
        } else if (speakingCounter > 0) {
          speakingCounter--;
        }

        const active = speakingCounter > 0;
        setIsSpeaking((prev) => {
          if (prev !== active) {
            socket.emit("update-status", {
              roomId,
              updates: { isSpeaking: active },
            });
            return active;
          }
          return prev;
        });

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("AudioContext setup failed:", err);
    }
  }, [roomId, socket]);

  // Clean up Web Audio
  const cleanupAudioDetection = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Initialize local media stream with robust fallbacks
  const initLocalStream = useCallback(async () => {
    if (typeof window === "undefined") return null;

    if (!navigator?.mediaDevices?.getUserMedia) {
      const isSecure = typeof window.isSecureContext === "boolean" ? window.isSecureContext : true;
      const err = !isSecure
        ? "Camera and microphone access requires HTTPS or localhost. Please open this site over a secure connection."
        : "Your browser does not support camera or microphone access.";
      setMediaError(err);
      toast.error(err);
      return null;
    }

    try {
      const audioConstraint = selectedAudioId
        ? { deviceId: { exact: selectedAudioId } }
        : true;
      const videoConstraint = selectedVideoId
        ? { deviceId: { exact: selectedVideoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } };

      let stream: MediaStream | null = null;

      try {
        // Attempt both audio and video
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: videoConstraint,
        });
        setMediaError(null);
      } catch (bothErr: any) {
        console.warn("[useWebRTC] Failed to acquire both audio and video:", bothErr);

        // Fallback 1: Try audio only (e.g. desktop PC without webcam)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraint,
            video: false,
          });
          setIsVideoEnabled(false);
          setMediaError("Camera not detected or permitted. Audio-only mode enabled.");
          toast.warning("Camera not detected or permitted. Running in audio-only mode.");
        } catch (audioErr) {
          // Fallback 2: Try video only (e.g. mic permission denied or broken)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: videoConstraint,
            });
            setIsAudioEnabled(false);
            setMediaError("Microphone not detected or permitted. Video-only mode enabled.");
            toast.warning("Microphone not detected or permitted. Running in video-only mode.");
          } catch (videoErr) {
            console.error("[useWebRTC] Failed to acquire any media devices:", bothErr);
            const errMsg =
              bothErr?.name === "NotAllowedError" || bothErr?.name === "PermissionDeniedError"
                ? "Camera or microphone permissions were denied. Please allow them in your browser or Windows Privacy Settings."
                : bothErr?.name === "NotFoundError" || bothErr?.name === "DevicesNotFoundError"
                ? "No camera or microphone devices were detected on your computer."
                : bothErr?.name === "NotReadableError" || bothErr?.name === "TrackStartError"
                ? "Camera or microphone is already in use by another application. Please close other apps and retry."
                : "Could not access camera/microphone: " + (bothErr?.message || "Check permissions.");
            setMediaError(errMsg);
            toast.error(errMsg);
            return null;
          }
        }
      }

      if (!stream) return null;

      // Stop previous tracks if replacing
      if (localStreamRef.current && localStreamRef.current !== stream) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      // Apply initial mute/video state
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = initialAudio;
        setIsAudioEnabled(initialAudio);
      }
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = initialVideo;
        setIsVideoEnabled(initialVideo);
      }

      setupAudioDetection(stream);

      // Refresh device list after permission is granted to get accurate labels
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      } catch (e) {}

      return stream;
    } catch (err: any) {
      console.error("[useWebRTC] initLocalStream unexpected error:", err);
      setMediaError(err?.message || "Failed to initialize media devices.");
      return null;
    }
  }, [
    selectedAudioId,
    selectedVideoId,
    initialAudio,
    initialVideo,
    setupAudioDetection,
  ]);

  // Initialize media automatically on mount and device change
  useEffect(() => {
    initLocalStream();
  }, [selectedAudioId, selectedVideoId]);

  // Helper to create RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback(
    (targetSocketId: string) => {
      if (peersRef.current.has(targetSocketId)) {
        return peersRef.current.get(targetSocketId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local stream tracks or transceivers to ensure bidirectional audio & video
      const activeStream = screenStreamRef.current || localStreamRef.current;
      const audioTrack = activeStream?.getAudioTracks()[0];
      const videoTrack = activeStream?.getVideoTracks()[0];

      if (audioTrack && activeStream) {
        pc.addTrack(audioTrack, activeStream);
      } else {
        try {
          pc.addTransceiver("audio", { direction: "sendrecv" });
        } catch (e) {}
      }

      if (videoTrack && activeStream) {
        pc.addTrack(videoTrack, activeStream);
      } else {
        try {
          pc.addTransceiver("video", { direction: "sendrecv" });
        } catch (e) {}
      }

      // Handle ICE candidates safely
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateData = event.candidate.toJSON
            ? event.candidate.toJSON()
            : {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              };
          socket.emit("ice-candidate", {
            target: targetSocketId,
            candidate: candidateData,
          });
        }
      };

      // Handle incoming remote stream tracks
      pc.ontrack = (event) => {
        console.log(`[WebRTC] ontrack received ${event.track.kind} from ${targetSocketId}`);
        setRemoteStreams((prev) => {
          const existing = prev[targetSocketId];
          let updatedTracks: MediaStreamTrack[] = [];

          if (existing) {
            updatedTracks = existing.getTracks().filter((t) => t.id !== event.track.id);
            updatedTracks.push(event.track);
          } else if (event.streams && event.streams[0]) {
            updatedTracks = event.streams[0].getTracks();
          } else {
            updatedTracks = [event.track];
          }

          return {
            ...prev,
            [targetSocketId]: new MediaStream(updatedTracks),
          };
        });
      };

      // Connection quality monitoring & ICE auto-recovery
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`[WebRTC] Peer ${targetSocketId} connection state: ${state}`);
        let quality: "good" | "fair" | "poor" = "good";
        if (state === "connecting") quality = "fair";
        else if (state === "disconnected" || state === "failed") quality = "poor";

        setParticipants((prev) =>
          prev.map((p) =>
            p.socketId === targetSocketId
              ? { ...p, connectionQuality: quality }
              : p
          )
        );
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE state (${targetSocketId}): ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "failed") {
          console.warn(`[WebRTC] ICE connection failed with ${targetSocketId}. Retrying...`);
          try {
            pc.restartIce();
          } catch (e) {
            console.warn("restartIce error:", e);
          }
        }
      };

      peersRef.current.set(targetSocketId, pc);
      return pc;
    },
    [socket]
  );

  // Join the room via socket
  const joinMeeting = useCallback(async () => {
    let stream = localStreamRef.current;
    if (!stream) {
      stream = await initLocalStream();
    }

    socket.emit("join-room", {
      roomId,
      userName,
      avatar,
      passcode,
      audioEnabled: isAudioEnabled,
      videoEnabled: isVideoEnabled,
    });
  }, [
    roomId,
    userName,
    avatar,
    passcode,
    isAudioEnabled,
    isVideoEnabled,
    initLocalStream,
    socket,
  ]);

  // Toggle Audio (Mute / Unmute / Dynamically acquire if missing)
  const toggleAudio = useCallback(async () => {
    let stream = localStreamRef.current;
    if (!stream) {
      await initLocalStream();
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const newState = !audioTrack.enabled;
      audioTrack.enabled = newState;
      setIsAudioEnabled(newState);
      if (!newState) {
        setAudioLevel(0);
      }

      socket.emit("update-status", {
        roomId,
        updates: { audioEnabled: newState },
      });

      toast.info(newState ? "Microphone unmuted" : "Microphone muted");
    } else {
      // Audio track was not present, try to acquire it now
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
          video: false,
        });
        const newTrack = audioStream.getAudioTracks()[0];
        if (newTrack) {
          stream.addTrack(newTrack);
          setIsAudioEnabled(true);
          setupAudioDetection(stream);

          peersRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const sender = senders.find((s) => s.track && s.track.kind === "audio");
            if (sender) {
              sender.replaceTrack(newTrack).catch((err) => console.warn("replaceTrack error:", err));
            } else {
              pc.addTrack(newTrack, stream!);
            }
          });

          socket.emit("update-status", {
            roomId,
            updates: { audioEnabled: true },
          });
          toast.success("Microphone enabled");
        }
      } catch (err) {
        console.error("Failed to enable microphone:", err);
        toast.error("Could not access microphone device.");
      }
    }
  }, [roomId, socket, selectedAudioId, setupAudioDetection, initLocalStream]);

  // Toggle Video (Camera on / off / Dynamically acquire if missing)
  const toggleVideo = useCallback(async () => {
    let stream = localStreamRef.current;
    if (!stream) {
      await initLocalStream();
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;
      setIsVideoEnabled(newState);

      socket.emit("update-status", {
        roomId,
        updates: { videoEnabled: newState },
      });

      toast.info(newState ? "Camera turned on" : "Camera turned off");
    } else {
      // Video track was not present, try to acquire it now
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoId
            ? { deviceId: { exact: selectedVideoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const newTrack = videoStream.getVideoTracks()[0];
        if (newTrack) {
          stream.addTrack(newTrack);
          setIsVideoEnabled(true);

          peersRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const sender = senders.find((s) => s.track && s.track.kind === "video");
            if (sender) {
              sender.replaceTrack(newTrack).catch((err) => console.warn("replaceTrack error:", err));
            } else {
              pc.addTrack(newTrack, stream!);
            }
          });

          socket.emit("update-status", {
            roomId,
            updates: { videoEnabled: true },
          });
          toast.success("Camera turned on");
        }
      } catch (err) {
        console.error("Failed to enable camera:", err);
        toast.error("Could not access camera device.");
      }
    }
  }, [roomId, socket, selectedVideoId, initLocalStream]);

  // Switch camera device (mobile front/rear or select device)
  const switchCamera = useCallback(
    async (deviceId?: string) => {
      if (!localStreamRef.current) return;
      try {
        const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (currentVideoTrack) {
          currentVideoTrack.stop();
        }

        const newConstraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        };

        const newVideoStream = await navigator.mediaDevices.getUserMedia(newConstraints);
        const newTrack = newVideoStream.getVideoTracks()[0];

        // Replace track on localStream
        if (currentVideoTrack) {
          localStreamRef.current.removeTrack(currentVideoTrack);
        }
        localStreamRef.current.addTrack(newTrack);

        // Replace track on all active peer connections
        peersRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find(
            (s) => s.track && s.track.kind === "video"
          );
          if (videoSender) {
            videoSender.replaceTrack(newTrack).catch((err) => console.warn("replaceTrack error:", err));
          } else {
            pc.addTrack(newTrack, localStreamRef.current!);
          }
        });

        setIsVideoEnabled(true);
        toast.success("Switched camera successfully");
      } catch (err) {
        console.error("Error switching camera:", err);
        toast.error("Failed to switch camera device.");
      }
    },
    []
  );

  // Screen Sharing
  const startScreenShare = useCallback(async () => {
    if (!roomSettings.allowScreenShare && !isHost && !isCoHost) {
      toast.error("Screen sharing is restricted by the host.");
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(displayStream);
      screenStreamRef.current = displayStream;
      setIsScreenSharing(true);

      const screenVideoTrack = displayStream.getVideoTracks()[0];

      // Replace track on all RTCPeerConnections
      peersRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(
          (s) => s.track && s.track.kind === "video"
        );
        if (videoSender) {
          videoSender.replaceTrack(screenVideoTrack);
        }
      });

      // Notify socket
      socket.emit("update-status", {
        roomId,
        updates: { isScreenSharing: true },
      });

      // Handle user stopping screen share via browser bar
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      toast.success("Screen sharing started");
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        console.error("Screen share error:", err);
        toast.error("Failed to share screen.");
      }
    }
  }, [roomSettings.allowScreenShare, isHost, isCoHost, roomId, socket]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);

    // Revert to local webcam track on all peers
    const webcamVideoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (webcamVideoTrack) {
      peersRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(
          (s) => s.track && s.track.kind === "video"
        );
        if (videoSender) {
          videoSender.replaceTrack(webcamVideoTrack);
        }
      });
    }

    socket.emit("update-status", {
      roomId,
      updates: { isScreenSharing: false },
    });

    toast.info("Screen sharing ended");
  }, [roomId, socket]);

  // Raise / Lower Hand
  const toggleRaiseHand = useCallback(() => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);

    socket.emit("update-status", {
      roomId,
      updates: { isHandRaised: newState },
    });

    toast(newState ? "✋ You raised your hand" : "Hand lowered");
  }, [isHandRaised, roomId, socket]);

  // Floating Emoji Reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      socket.emit("send-reaction", { roomId, emoji });

      // Local animation preview
      const newReaction: ReactionItem = {
        id: `rx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        senderName: userName,
        emoji,
        x: Math.random() * 80 + 10,
      };
      setReactions((prev) => [...prev, newReaction]);

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 3500);
    },
    [roomId, userName, socket]
  );

  // In-Call Chat message
  const sendChatMessage = useCallback(
    (text: string, file?: ChatFile | null, isPrivate = false, recipientId?: string | null) => {
      if (!roomSettings.allowChat && !isHost && !isCoHost) {
        toast.error("Chat is disabled by the host.");
        return;
      }

      socket.emit("send-chat-message", {
        roomId,
        text,
        file,
        isPrivate,
        recipientId,
      });
    },
    [roomSettings.allowChat, isHost, isCoHost, roomId, socket]
  );

  // Call Recording (MediaRecorder API)
  const startRecording = useCallback(async () => {
    if (!isHost && !isCoHost) {
      toast.error("Only hosts can record the meeting.");
      return;
    }

    try {
      recordedChunksRef.current = [];
      const streamToRecord = screenStreamRef.current || localStreamRef.current;
      if (!streamToRecord) {
        toast.error("No stream available to record.");
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(streamToRecord, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        setIsRecordingLocally(false);
      };

      recorder.start(1000); // 1-second chunks
      setIsRecordingLocally(true);

      // Broadcast to room
      socket.emit("toggle-recording", { roomId, isRecording: true });
      toast.success("Meeting recording started");
    } catch (err) {
      console.error("Recording start error:", err);
      toast.error("Failed to start call recording.");
    }
  }, [isHost, isCoHost, roomId, socket]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    socket.emit("toggle-recording", { roomId, isRecording: false });
    toast.info("Meeting recording stopped. Preparing file...");
  }, [roomId, socket]);

  // Host Moderation Actions
  const forceMuteParticipant = useCallback(
    (targetSocketId: string) => {
      socket.emit("mute-participant", { roomId, targetSocketId });
      toast.info("Mute request sent.");
    },
    [roomId, socket]
  );

  const forceMuteAll = useCallback(() => {
    socket.emit("mute-all", { roomId });
    toast.info("Muted all participants.");
  }, [roomId, socket]);

  const kickParticipant = useCallback(
    (targetSocketId: string) => {
      socket.emit("kick-participant", { roomId, targetSocketId });
      toast.info("Participant removed.");
    },
    [roomId, socket]
  );

  const setCoHostStatus = useCallback(
    (targetSocketId: string, coHostVal: boolean) => {
      socket.emit("set-cohost", {
        roomId,
        targetSocketId,
        isCoHost: coHostVal,
      });
      toast.info(coHostVal ? "Assigned co-host" : "Revoked co-host");
    },
    [roomId, socket]
  );

  const toggleLockMeeting = useCallback(
    (locked: boolean) => {
      socket.emit("toggle-lock", { roomId, isLocked: locked });
      toast.info(locked ? "Meeting locked" : "Meeting unlocked");
    },
    [roomId, socket]
  );

  const toggleWaitingRoom = useCallback(
    (enabled: boolean) => {
      socket.emit("toggle-waiting-room", {
        roomId,
        waitingRoomEnabled: enabled,
      });
      toast.info(enabled ? "Waiting room enabled" : "Waiting room disabled");
    },
    [roomId, socket]
  );

  const togglePermission = useCallback(
    (permission: "allowChat" | "allowScreenShare", value: boolean) => {
      socket.emit("toggle-permission", { roomId, permission, value });
      toast.info(
        `${permission === "allowChat" ? "Chat" : "Screen sharing"} ${
          value ? "allowed" : "restricted"
        }`
      );
    },
    [roomId, socket]
  );

  const admitWaitingUser = useCallback(
    (targetSocketId: string, approved: boolean) => {
      socket.emit("waiting-room-decision", {
        roomId,
        targetSocketId,
        approved,
      });
    },
    [roomId, socket]
  );

  const endMeetingForAll = useCallback(() => {
    socket.emit("end-meeting", { roomId });
    leaveMeeting();
  }, [roomId, socket]);

  // Leave Meeting
  const leaveMeeting = useCallback(() => {
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    // Close peer connections
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    cleanupAudioDetection();

    socket.emit("leave-room", { roomId });

    setIsJoined(false);
    setInWaitingRoom(false);
    if (onCallEnded) {
      onCallEnded();
    }
  }, [roomId, socket, cleanupAudioDetection, onCallEnded]);

  // Socket event subscriptions
  useEffect(() => {
    // When successfully joined the room
    socket.on("room-joined", async (data) => {
      console.log("[Client] room-joined:", data);
      setIsJoined(true);
      setInWaitingRoom(false);
      setIsHost(data.isHost);
      setIsCoHost(data.isCoHost);
      setParticipants(data.participants);
      setRoomSettings(data.settings);
      setChatMessages(data.chatHistory || []);
      setWaitingList(data.waitingList || []);

      // If there are other participants already in room, initiate WebRTC offer to each
      data.participants.forEach(async (participant: Participant) => {
        if (participant.socketId === socket.id) return;
        try {
          const pc = createPeerConnection(participant.socketId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", {
            target: participant.socketId,
            offer,
          });
        } catch (err) {
          console.error("Error creating initial offer for peer:", err);
        }
      });
    });

    // When a new participant joins
    socket.on("user-joined", ({ participant }: { participant: Participant }) => {
      console.log("[Client] user-joined:", participant);
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
      toast.info(`${participant.userName} joined the meeting`);
    });

    // When someone leaves
    socket.on("user-left", ({ socketId, userName, newHostId }) => {
      console.log("[Client] user-left:", socketId);
      // Close peer connection
      const pc = peersRef.current.get(socketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(socketId);
      }
      // Remove remote stream
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      // Remove from participants
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));

      if (newHostId && newHostId === socket.id) {
        setIsHost(true);
        toast.success("You are now the host of this meeting.");
      }

      if (userName) {
        toast.info(`${userName} left the meeting`);
      }
    });

    // WebRTC Offer received
    socket.on("offer", async ({ sender, offer }) => {
      try {
        const pc = createPeerConnection(sender);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process any queued candidates safely
        const pending = pendingCandidatesRef.current.get(sender) || [];
        for (const cand of pending) {
          if (cand && (cand.candidate || cand.candidate === "")) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (candErr) {
              console.warn("[WebRTC] Error adding queued candidate:", candErr);
            }
          }
        }
        pendingCandidatesRef.current.delete(sender);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { target: sender, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    // WebRTC Answer received
    socket.on("answer", async ({ sender, answer }) => {
      try {
        const pc = peersRef.current.get(sender);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Process queued candidates safely
          const pending = pendingCandidatesRef.current.get(sender) || [];
          for (const cand of pending) {
            if (cand && (cand.candidate || cand.candidate === "")) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (candErr) {
                console.warn("[WebRTC] Error adding queued candidate:", candErr);
              }
            }
          }
          pendingCandidatesRef.current.delete(sender);
        }
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    });

    // WebRTC ICE Candidate received
    socket.on("ice-candidate", async ({ sender, candidate }) => {
      try {
        if (!candidate) return;
        const pc = peersRef.current.get(sender);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (candErr) {
            console.warn("[WebRTC] Error adding remote candidate:", candErr);
          }
        } else {
          // Queue candidate
          const list = pendingCandidatesRef.current.get(sender) || [];
          list.push(candidate);
          pendingCandidatesRef.current.set(sender, list);
        }
      } catch (err) {
        console.error("Error in ice-candidate handler:", err);
      }
    });

    // Participant status update (mute, camera, hand raised, speaking)
    socket.on("participant-updated", ({ socketId, updates }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, ...updates } : p))
      );
    });

    // Waiting room status
    socket.on("waiting-room-status", ({ inWaitingRoom, message }) => {
      setInWaitingRoom(inWaitingRoom);
      if (message) setWaitingRoomMessage(message);
    });

    // Waiting room list updated (for host)
    socket.on("waiting-room-updated", ({ waitingList }) => {
      setWaitingList(waitingList || []);
    });

    // Admitted to room from waiting room
    socket.on("admitted-to-room", (data) => {
      setInWaitingRoom(false);
      setIsJoined(true);
      setIsHost(data.isHost);
      setIsCoHost(data.isCoHost);
      setParticipants(data.participants);
      setRoomSettings(data.settings);
      setChatMessages(data.chatHistory || []);
      toast.success("Admitted to meeting!");
    });

    // Denied entry
    socket.on("denied-entry", ({ message }) => {
      setInWaitingRoom(false);
      toast.error(message || "Denied entry by host.");
      leaveMeeting();
    });

    // Join error (locked room, wrong passcode)
    socket.on("join-error", ({ message }) => {
      toast.error(message);
      leaveMeeting();
    });

    // Force muted by host
    socket.on("force-mute", ({ by, all }) => {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsAudioEnabled(false);
          socket.emit("update-status", {
            roomId,
            updates: { audioEnabled: false },
          });
        }
      }
      toast.warning(
        all
          ? "The host has muted all participants."
          : `You were muted by ${by || "the host"}.`
      );
    });

    // Kicked from room
    socket.on("kicked-from-room", ({ reason }) => {
      toast.error(reason || "You were removed from the meeting.");
      leaveMeeting();
    });

    // Meeting ended by host
    socket.on("meeting-ended", ({ reason }) => {
      toast.info(reason || "Meeting ended by host.");
      leaveMeeting();
    });

    // Chat message received
    socket.on("new-chat-message", ({ message }: { message: ChatMessage }) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // Floating reaction received
    socket.on("reaction-received", ({ senderName, emoji }) => {
      const rx: ReactionItem = {
        id: `rx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        senderName,
        emoji,
        x: Math.random() * 80 + 10,
      };
      setReactions((prev) => [...prev, rx]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== rx.id));
      }, 3500);
    });

    // Room settings updated (lock, waiting room, permissions)
    socket.on("room-settings-updated", (updates: Partial<RoomSettings>) => {
      setRoomSettings((prev) => ({ ...prev, ...updates }));
    });

    // Recording status changed
    socket.on("recording-status-changed", ({ isRecording, recordingStartedBy }) => {
      setRoomSettings((prev) => ({
        ...prev,
        isRecording,
        recordingStartedBy,
      }));
      toast(
        isRecording
          ? `🔴 Recording started by ${recordingStartedBy || "host"}`
          : "⏹️ Recording stopped"
      );
    });

    return () => {
      socket.off("room-joined");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("participant-updated");
      socket.off("waiting-room-status");
      socket.off("waiting-room-updated");
      socket.off("admitted-to-room");
      socket.off("denied-entry");
      socket.off("join-error");
      socket.off("force-mute");
      socket.off("kicked-from-room");
      socket.off("meeting-ended");
      socket.off("new-chat-message");
      socket.off("reaction-received");
      socket.off("room-settings-updated");
      socket.off("recording-status-changed");
    };
  }, [socket, roomId, createPeerConnection, leaveMeeting]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupAudioDetection();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
    };
  }, [cleanupAudioDetection]);

  return {
    currentSocketId,
    localStream,
    screenStream,
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
    isSpeaking,
    isRecordingLocally,
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
  };
}
