import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import VideoUploader from "./VideoUploader";
import { useRouter } from "next/router";

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadVideoModal({ isOpen, onClose }: UploadVideoModalProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onClose();
    if (router.pathname === "/") {
      router.reload();
    } else {
      router.push("/");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white p-6 sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Upload Video
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <VideoUploader onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
