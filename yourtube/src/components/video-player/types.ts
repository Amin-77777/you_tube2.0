export interface SubtitleTrack {
  label: string;
  srclang: string;
  src: string;
  kind?: "subtitles" | "captions";
  default?: boolean;
}

export interface VideoItem {
  _id: string;
  videotitle: string;
  filepath: string;
  thumbnail?: string;
  accessLevel?: string;
  videochanel?: string;
  views?: number;
  duration?: string;
  subtitles?: SubtitleTrack[];
  sources?: { src: string; quality?: string }[];
  [key: string]: any;
}

export interface PlayerCustomControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  playbackRate: number;
  isFullscreen: boolean;
  isTheaterMode: boolean;
  isPiP: boolean;
  showControls: boolean;
  isBuffering: boolean;
  isSeeking: boolean;
  captionsEnabled: boolean;
  selectedQuality: string;
  availableQualities: string[];
  subtitles: SubtitleTrack[];
  currentSubtitleTrack: string | null;

  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSeekRelative: (offsetSeconds: number) => void;
  onVolumeChange: (newVolume: number) => void;
  onToggleMute: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onQualityChange: (quality: string) => void;
  onToggleFullscreen: () => void;
  onToggleTheaterMode: () => void;
  onTogglePiP: () => void;
  onToggleCaptions: () => void;
  onSelectSubtitleTrack: (srclang: string | null) => void;

  onPreviousVideo?: () => void;
  onNextVideo?: () => void;
  hasPreviousVideo?: boolean;
  hasNextVideo?: boolean;

  posterSrc?: string;
  videoSrc?: string;
}
