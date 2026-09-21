import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Shield,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PreJoinScreenProps {
  roomId: string;
  userName: string;
  setUserName: (name: string) => void;
  passcode: string;
  setPasscode: (code: string) => void;
  isAudioEnabled: boolean;
  setIsAudioEnabled: (val: boolean) => void;
  isVideoEnabled: boolean;
  setIsVideoEnabled: (val: boolean) => void;
  selectedAudioId: string;
  setSelectedAudioId: (id: string) => void;
  selectedVideoId: string;
  setSelectedVideoId: (id: string) => void;
  onJoin: () => void;
}

export const PreJoinScreen: React.FC<PreJoinScreenProps> = ({
  roomId,
  userName,
  setUserName,
  passcode,
  setPasscode,
  isAudioEnabled,
  setIsAudioEnabled,
  isVideoEnabled,
  setIsVideoEnabled,
  selectedAudioId,
  setSelectedAudioId,
  selectedVideoId,
  setSelectedVideoId,
  onJoin,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize preview stream
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function setupPreview() {
      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
          video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
        };

        const s = await navigator.mediaDevices.getUserMedia(constraints);
        localStream = s;
        setStream(s);

        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }

        // Apply initial track states
        const aTrack = s.getAudioTracks()[0];
        if (aTrack) aTrack.enabled = isAudioEnabled;

        const vTrack = s.getVideoTracks()[0];
        if (vTrack) vTrack.enabled = isVideoEnabled;

        // Mic volume level detection
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx && aTrack) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;
          const source = ctx.createMediaStreamSource(s);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        }

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      } catch (err) {
        console.warn("Camera/mic preview error:", err);
      }
    }

    setupPreview();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedAudioId, selectedVideoId]);

  // Toggle audio track
  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    if (stream) {
      const aTrack = stream.getAudioTracks()[0];
      if (aTrack) aTrack.enabled = newState;
    }
  };

  // Toggle video track
  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    if (stream) {
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) vTrack.enabled = newState;
    }
  };

  const copyMeetingLink = () => {
    const url = `${window.location.origin}/video-call/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Meeting link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] w-full px-4 py-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Camera Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                !isVideoEnabled ? "hidden" : "block"
              }`}
            />

            {!isVideoEnabled && (
              <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center text-3xl font-semibold text-white mb-3 shadow-inner">
                  {userName ? userName[0].toUpperCase() : "U"}
                </div>
                <p className="text-sm font-medium">Camera is turned off</p>
              </div>
            )}

            {/* In-Preview Floating Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
              <Button
                type="button"
                size="icon"
                variant={isAudioEnabled ? "secondary" : "destructive"}
                className="rounded-full w-10 h-10 transition-all"
                onClick={handleToggleAudio}
                title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                type="button"
                size="icon"
                variant={isVideoEnabled ? "secondary" : "destructive"}
                className="rounded-full w-10 h-10 transition-all"
                onClick={handleToggleVideo}
                title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-full w-10 h-10 text-white hover:bg-white/20"
                onClick={() => setShowSettings(!showSettings)}
                title="Device Settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* Live Mic Level Indicator */}
            {isAudioEnabled && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white">
                <Volume2 className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Device Settings Drawer / Box */}
          {showSettings && (
            <div className="w-full mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border shadow-sm space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Camera Device</Label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-900"
                >
                  <option value="">Default Camera</option>
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera (${d.deviceId.slice(0, 5)})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Microphone Device</Label>
                <select
                  value={selectedAudioId}
                  onChange={(e) => setSelectedAudioId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-900"
                >
                  <option value="">Default Microphone</option>
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone (${d.deviceId.slice(0, 5)})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Meeting Info & Join Action */}
        <div className="lg:col-span-5 flex flex-col space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready to Join</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Meeting Room
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
              Room ID: <span className="font-semibold text-gray-800 dark:text-gray-200">{roomId}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName" className="text-sm font-medium">
                Your Display Name
              </Label>
              <Input
                id="displayName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="passcode" className="text-sm font-medium flex items-center justify-between">
                <span>Passcode (Optional)</span>
                <Shield className="w-3.5 h-3.5 text-gray-400" />
              </Label>
              <Input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Leave blank if none required"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-6 text-base rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              onClick={onJoin}
              disabled={!userName.trim()}
            >
              <span>Join Meeting</span>
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300"
              onClick={copyMeetingLink}
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Link Copied!" : "Copy Meeting Link"}</span>
            </Button>
          </div>

          <div className="border-t pt-4 text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p>🔒 End-to-end encrypted real-time audio and video.</p>
            <p>✨ HD WebRTC mesh with ultra-low latency.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
