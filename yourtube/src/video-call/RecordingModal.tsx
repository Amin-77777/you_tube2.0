import React from "react";
import { Download, X, Film, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordedUrl: string | null;
  roomId: string;
}

export const RecordingModal: React.FC<RecordingModalProps> = ({
  isOpen,
  onClose,
  recordedUrl,
  roomId,
}) => {
  if (!isOpen || !recordedUrl) return null;

  const fileName = `meeting-${roomId}-${new Date().toISOString().slice(0, 10)}.webm`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl p-6 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Call Recording Complete</h2>
              <p className="text-xs text-gray-400">Preview or download your recorded meeting</p>
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

        {/* Video Player Preview */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-gray-800">
          <video src={recordedUrl} controls className="w-full h-full object-contain" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            className="border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
            onClick={onClose}
          >
            Close
          </Button>
          <a
            href={recordedUrl}
            download={fileName}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm shadow-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Recording</span>
          </a>
        </div>
      </div>
    </div>
  );
};
