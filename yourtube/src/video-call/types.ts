export interface Participant {
  socketId: string;
  userName: string;
  avatar?: string | null;
  isHost: boolean;
  isCoHost: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  connectionQuality: "good" | "fair" | "poor";
  joinedAt: number;
}

export interface WaitingUser {
  socketId: string;
  userName: string;
  avatar?: string | null;
  requestedAt: number;
}

export interface ChatFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  file?: ChatFile | null;
  isPrivate: boolean;
  recipientId?: string | null;
  recipientName?: string | null;
  timestamp: string;
}

export interface RoomSettings {
  isLocked: boolean;
  waitingRoomEnabled: boolean;
  allowChat: boolean;
  allowScreenShare: boolean;
  isRecording: boolean;
  recordingStartedBy?: string | null;
  hasPasscode?: boolean;
}

export interface ReactionItem {
  id: string;
  senderName: string;
  emoji: string;
  x: number;
}
