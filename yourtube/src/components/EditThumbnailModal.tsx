"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";
import { getThumbnailSrc } from "@/lib/videoUtils";
import { Upload, Image as ImageIcon, Sparkles, Check, Link as LinkIcon, RefreshCw } from "lucide-react";

interface EditThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: any;
  onSuccess?: (updatedVideo: any) => void;
}

const PRESET_THUMBNAILS = [
  {
    name: "Tech & Studio",
    url: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Mobile Cinematic",
    url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Cute 3D Animation",
    url: "https://images.unsplash.com/photo-1591382696684-38c427c7547a?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Glowing Jellyfish",
    url: "https://images.unsplash.com/photo-1548232979-6c557ee14752?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Synthwave / Music",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "City Lights Night",
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Peaceful Sunset",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Fantasy Art",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
  },
];

export default function EditThumbnailModal({
  isOpen,
  onClose,
  video,
  onSuccess,
}: EditThumbnailModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "presets">("upload");
  const [previewSrc, setPreviewSrc] = useState<string>(getThumbnailSrc(video));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial state when modal opens or video changes
  React.useEffect(() => {
    if (video) {
      setPreviewSrc(getThumbnailSrc(video));
      setSelectedFile(null);
      setUrlInput("");
    }
  }, [video, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file (JPG, PNG, WebP).");
        return;
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewSrc(objectUrl);
    }
  };

  const handleUrlApply = () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a valid image URL.");
      return;
    }
    setSelectedFile(null);
    setPreviewSrc(urlInput.trim());
    toast.success("Preview updated from URL.");
  };

  const handlePresetSelect = (url: string) => {
    setSelectedFile(null);
    setUrlInput(url);
    setPreviewSrc(url);
  };

  const handleSave = async () => {
    if (!video?._id) {
      toast.error("Video ID is missing.");
      return;
    }

    try {
      setIsSaving(true);
      let res;

      if (selectedFile) {
        // Upload image file via FormData
        const formData = new FormData();
        formData.append("thumbnail", selectedFile);
        res = await axiosInstance.put(`/video/update/${video._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Update with URL string or preset
        res = await axiosInstance.put(`/video/update/${video._id}`, {
          thumbnail: previewSrc,
        });
      }

      toast.success("Thumbnail updated successfully!");
      if (onSuccess) {
        onSuccess(res.data?.video || { ...video, thumbnail: previewSrc });
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to update thumbnail:", err);
      toast.error(
        err.response?.data?.message || "Failed to update thumbnail. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white p-6 sm:rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            Change Video Thumbnail
          </DialogTitle>
          <p className="text-xs text-gray-500 truncate mt-1">
            Editing thumbnail for: <span className="font-semibold text-gray-700">{video?.videotitle || "Video"}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Live Preview Box */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border shadow-inner flex items-center justify-center">
            {previewSrc ? (
              <img
                src={previewSrc}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
                onError={() => {
                  toast.error("Failed to load image preview. Please check the URL.");
                }}
              />
            ) : (
              <div className="text-gray-400 text-sm flex flex-col items-center gap-2">
                <ImageIcon className="w-8 h-8" />
                <span>No thumbnail selected</span>
              </div>
            )}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-semibold px-2 py-0.5 rounded backdrop-blur-sm">
              Preview
            </div>
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-0.5 rounded">
              {video?.duration || "0:30"}
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "upload"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "url"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              Paste URL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "presets"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Presets
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === "upload" && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl p-6 text-center cursor-pointer transition-all"
              >
                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800">
                  {selectedFile ? selectedFile.name : "Click or drag an image here to upload"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports JPG, PNG, WebP up to 10MB
                </p>
                {selectedFile && (
                  <p className="text-xs text-green-600 font-semibold mt-2 flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" /> Selected: {(selectedFile.size / 1024).toFixed(0)} KB
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: URL Input */}
          {activeTab === "url" && (
            <div className="space-y-3">
              <Label htmlFor="thumb-url" className="text-sm font-medium text-gray-700">
                Image Web Address
              </Label>
              <div className="flex gap-2">
                <Input
                  id="thumb-url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={handleUrlApply}>
                  Preview
                </Button>
              </div>
            </div>
          )}

          {/* Tab 3: Presets */}
          {activeTab === "presets" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Pick from curated high-quality thumbnails:</p>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {PRESET_THUMBNAILS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(preset.url)}
                    className={`relative rounded-lg overflow-hidden border-2 aspect-video transition-all group focus:outline-none ${
                      previewSrc === preset.url
                        ? "border-blue-600 ring-2 ring-blue-400"
                        : "border-transparent hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white font-medium text-center px-1">
                        {preset.name}
                      </span>
                    </div>
                    {previewSrc === preset.url && (
                      <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5 shadow">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Thumbnail"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
