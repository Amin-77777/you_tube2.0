import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Paperclip,
  Smile,
  Lock,
  Download,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { ChatMessage, Participant, ChatFile } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  participants: Participant[];
  currentUserId: string;
  allowChat: boolean;
  canModerate: boolean;
  onSendMessage: (
    text: string,
    file?: ChatFile | null,
    isPrivate?: boolean,
    recipientId?: string | null
  ) => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👏"];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  participants,
  currentUserId,
  allowChat,
  canModerate,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("everyone");
  const [selectedFile, setSelectedFile] = useState<ChatFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    if (!allowChat && !canModerate) {
      toast.error("Chat is disabled by the host.");
      return;
    }

    const isPrivate = selectedRecipientId !== "everyone";
    onSendMessage(
      inputText.trim(),
      selectedFile,
      isPrivate,
      isPrivate ? selectedRecipientId : null
    );

    setInputText("");
    setSelectedFile(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result as string,
      });
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="w-80 md:w-96 bg-gray-900 border-l border-gray-800 flex flex-col h-full z-40 text-white select-none">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950">
        <h2 className="font-semibold text-sm">In-Call Messages</h2>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Recipient Selector */}
      <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/60 flex items-center justify-between text-xs text-gray-400">
        <span>Send to:</span>
        <select
          value={selectedRecipientId}
          onChange={(e) => setSelectedRecipientId(e.target.value)}
          className="bg-gray-800 text-white rounded px-2 py-1 text-xs border border-gray-700 outline-none"
        >
          <option value="everyone">Everyone</option>
          {participants
            .filter((p) => p.socketId !== currentUserId)
            .map((p) => (
              <option key={p.socketId} value={p.socketId}>
                Direct: {p.userName}
              </option>
            ))}
        </select>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs px-4">
            <p>No messages yet.</p>
            <p className="mt-1 text-gray-600">Messages sent here are visible to call participants.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-0.5">
                  <span className="font-medium text-gray-300">
                    {isSelf ? "You" : msg.senderName}
                  </span>
                  {msg.isPrivate && (
                    <span className="flex items-center gap-0.5 text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded-full border border-indigo-800/40">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Direct</span>
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs break-words shadow-sm ${
                    isSelf
                      ? "bg-red-600 text-white rounded-br-none"
                      : "bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700"
                  }`}
                >
                  {msg.text && <p>{msg.text}</p>}

                  {/* Attached File */}
                  {msg.file && (
                    <div className="mt-2 p-2 bg-black/25 rounded-lg border border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        {msg.file.type.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="text-[11px] font-medium truncate">{msg.file.name}</p>
                          <p className="text-[9px] text-gray-400">
                            {formatFileSize(msg.file.size)}
                          </p>
                        </div>
                      </div>

                      <a
                        href={msg.file.dataUrl}
                        download={msg.file.name}
                        className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Disabled Chat Notice */}
      {!allowChat && !canModerate && (
        <div className="px-4 py-2 bg-red-950/40 border-t border-red-900/40 text-[11px] text-red-400 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Host has restricted participant messaging.</span>
        </div>
      )}

      {/* Quick Emojis Bar */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-gray-950 border-t border-gray-800 overflow-x-auto">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="text-sm p-1 rounded hover:bg-gray-800 transition-colors"
            onClick={() => setInputText((prev) => prev + emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Attached file preview */}
      {selectedFile && (
        <div className="px-4 py-2 bg-gray-800/80 border-t border-gray-700 flex items-center justify-between text-xs">
          <span className="truncate text-gray-300 font-mono">📎 {selectedFile.name}</span>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-gray-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Chat Input */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-gray-950 border-t border-gray-800 flex items-center gap-2"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-8 h-8 rounded-full text-gray-400 hover:text-white"
          onClick={() => fileInputRef.current?.click()}
          title="Share a file (up to 10MB)"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            selectedRecipientId === "everyone"
              ? "Send a message to everyone..."
              : "Send direct message..."
          }
          disabled={!allowChat && !canModerate}
          className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-xs h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-red-500"
        />

        <Button
          type="submit"
          size="icon"
          className="w-9 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white"
          disabled={(!inputText.trim() && !selectedFile) || (!allowChat && !canModerate)}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
