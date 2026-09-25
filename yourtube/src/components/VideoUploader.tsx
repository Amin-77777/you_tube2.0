import { Check, FileVideo, Upload, X, Image as ImageIcon, Sparkles, RefreshCw } from "lucide-react";
import React, { ChangeEvent, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

interface VideoUploaderProps {
  channelId?: string | string[];
  channelName?: string;
  onSuccess?: () => void;
}

const VideoUploader = ({ channelId, channelName, onSuccess }: VideoUploaderProps) => {
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [channelInput, setChannelInput] = useState("");
  const [uploadComplete, setUploadComplete] = useState(false);

  // Thumbnail states
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>("");
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<string>("0:30");
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Auto-capture frame thumbnails from selected video
  useEffect(() => {
    if (!videoFile) {
      setCapturedFrames([]);
      setSelectedThumbnail("");
      setCustomThumbnailFile(null);
      setCustomThumbnailUrl("");
      return;
    }

    const videoUrl = URL.createObjectURL(videoFile);
    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
    video.preload = "auto";

    setIsExtractingFrames(true);

    video.onloadedmetadata = () => {
      const dur = video.duration;
      if (dur && !isNaN(dur)) {
        const mins = Math.floor(dur / 60);
        const secs = Math.floor(dur % 60);
        setVideoDuration(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
      }

      // Capture 3 frames at 15%, 40%, and 70% of duration
      const captureTimes = [
        Math.max(0.5, dur * 0.15),
        Math.max(1, dur * 0.4),
        Math.max(2, dur * 0.7),
      ];

      const frames: string[] = [];
      let currentIndex = 0;

      const captureNext = () => {
        if (currentIndex >= captureTimes.length) {
          setIsExtractingFrames(false);
          setCapturedFrames(frames);
          if (frames.length > 0 && !selectedThumbnail) {
            setSelectedThumbnail(frames[0]);
          }
          URL.revokeObjectURL(videoUrl);
          return;
        }

        video.currentTime = captureTimes[currentIndex];
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(640, video.videoWidth || 640);
          canvas.height = Math.min(360, video.videoHeight || 360);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            frames.push(dataUrl);
          }
        } catch (e) {
          console.warn("Could not capture video frame:", e);
        }
        currentIndex++;
        captureNext();
      };

      captureNext();
    };

    video.onerror = () => {
      setIsExtractingFrames(false);
      URL.revokeObjectURL(videoUrl);
    };

    return () => {
      URL.revokeObjectURL(videoUrl);
    };
  }, [videoFile]);

  const handlefilechange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isVideo =
        (file.type && file.type.startsWith("video/")) ||
        /\.(mp4|webm|mov|mkv|avi|ogg|m4v)$/i.test(file.name);
      if (!isVideo) {
        toast.error("Please upload a valid video file (MP4, WebM, MOV, etc.).");
        return;
      }
      if (file.size > 250 * 1024 * 1024) {
        toast.error("File size exceeds 250MB limit.");
        return;
      }
      setVideoFile(file);
      const filename = file.name;
      if (!videoTitle) {
        setVideoTitle(filename.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleCustomThumbChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file (JPG, PNG, WebP).");
        return;
      }
      setCustomThumbnailFile(file);
      const objUrl = URL.createObjectURL(file);
      setSelectedThumbnail(objUrl);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setChannelInput("");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    setCapturedFrames([]);
    setSelectedThumbnail("");
    setCustomThumbnailFile(null);
    setCustomThumbnailUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (thumbInputRef.current) {
      thumbInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    if (isUploading) {
      toast.error("Your video upload has been cancelled");
    }
    resetForm();
  };

  const handleUpload = async () => {
    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide a file and a title.");
      return;
    }
    const effectiveChannelName =
      channelInput.trim() ||
      channelName ||
      user?.channelname ||
      user?.name ||
      "Community Channel";
    const resolvedChannelId = Array.isArray(channelId) ? channelId[0] : channelId;
    const effectiveChannelId = resolvedChannelId || user?._id || "user";

    const formdata = new FormData();
    formdata.append("file", videoFile);
    formdata.append("videotitle", videoTitle);
    formdata.append("videochanel", effectiveChannelName);
    formdata.append("uploader", effectiveChannelId);
    formdata.append("duration", videoDuration);

    // Attach thumbnail
    if (customThumbnailFile) {
      formdata.append("thumbnail", customThumbnailFile);
    } else if (selectedThumbnail) {
      if (selectedThumbnail.startsWith("data:image/")) {
        try {
          const byteString = atob(selectedThumbnail.split(",")[1]);
          const mimeString = selectedThumbnail.split(",")[0].split(":")[1].split(";")[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          formdata.append("thumbnail", blob, "thumbnail.jpg");
        } catch (e) {
          formdata.append("thumbnail", selectedThumbnail);
        }
      } else {
        formdata.append("thumbnail", selectedThumbnail);
      }
    } else if (customThumbnailUrl.trim()) {
      formdata.append("thumbnail", customThumbnailUrl.trim());
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      await axiosInstance.post("/video/upload", formdata, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progresEvent: any) => {
          if (progresEvent.total) {
            const progress = Math.round((progresEvent.loaded * 100) / progresEvent.total);
            setUploadProgress(progress);
          }
        },
      });
      toast.success("Video and thumbnail uploaded successfully!");
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("There was an error uploading your video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Video & Set Thumbnail</h2>

      <div className="space-y-4">
        {!videoFile ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-100/80 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-blue-500 mb-2" />
            <p className="text-lg font-semibold text-gray-800">
              Drag and drop video files to upload
            </p>
            <p className="text-sm text-gray-500 mt-1">or click to browse your computer</p>
            <p className="text-xs text-gray-400 mt-4">MP4, WebM, MOV, MKV, AVI • Up to 250MB</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.ogg,.m4v"
              onChange={handlefilechange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected File Details */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm">
              <div className="bg-blue-100 p-2 rounded-md">
                <FileVideo className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-gray-900">{videoFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Duration: {videoDuration}
                </p>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={cancelUpload}>
                  <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-green-100 p-1 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>

            {/* Video Title & Channel */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="title" className="text-xs font-semibold text-gray-700">
                  Video Title (required)
                </Label>
                <Input
                  id="title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Add a title that describes your video"
                  disabled={isUploading || uploadComplete}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="channel" className="text-xs font-semibold text-gray-700">
                  Channel / Creator Name (optional)
                </Label>
                <Input
                  id="channel"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder={
                    channelName || user?.channelname || user?.name || "Community Channel"
                  }
                  disabled={isUploading || uploadComplete}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Thumbnail Selection Section */}
            <div className="p-4 bg-white rounded-xl border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  Select Video Thumbnail
                </Label>
                {selectedThumbnail && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Thumbnail selected
                  </span>
                )}
              </div>

              {/* Auto-extracted Video Frames */}
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Auto-captured from your video (click to select):
                </p>
                {isExtractingFrames ? (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg text-xs text-gray-500 gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    Generating snapshots from video...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {capturedFrames.map((frame, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedThumbnail(frame);
                          setCustomThumbnailFile(null);
                        }}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          selectedThumbnail === frame
                            ? "border-blue-600 ring-2 ring-blue-400"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <img src={frame} alt={`Snapshot ${idx + 1}`} className="w-full h-full object-cover" />
                        {selectedThumbnail === frame && (
                          <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5 shadow">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded">
                          Frame {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Or Upload Custom Image */}
              <div className="pt-2 border-t flex flex-col sm:flex-row gap-2 items-center">
                <input
                  type="file"
                  ref={thumbInputRef}
                  className="hidden"
                  accept="image/*,.jpg,.jpeg,.png,.webp"
                  onChange={handleCustomThumbChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => thumbInputRef.current?.click()}
                  className="w-full sm:w-auto text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Custom Thumbnail Image
                </Button>
                <span className="text-xs text-gray-400">or</span>
                <Input
                  placeholder="Paste thumbnail image URL..."
                  value={customThumbnailUrl}
                  onChange={(e) => {
                    setCustomThumbnailUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedThumbnail(e.target.value.trim());
                      setCustomThumbnailFile(null);
                    }
                  }}
                  className="text-xs h-8 flex-1"
                />
              </div>

              {/* Thumbnail Live Preview */}
              {selectedThumbnail && (
                <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="w-20 aspect-video rounded overflow-hidden bg-black flex-shrink-0">
                    <img src={selectedThumbnail} alt="Selected thumb" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold text-gray-800">Thumbnail Preview</p>
                    <p className="text-[11px] text-gray-500">
                      {customThumbnailFile ? customThumbnailFile.name : "Custom / Captured snapshot"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600 font-medium">
                  <span>Uploading video & thumbnail...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-2">
              {!uploadComplete && (
                <>
                  <Button variant="outline" onClick={cancelUpload} disabled={uploadComplete || isUploading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !videoTitle.trim() || uploadComplete}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isUploading ? "Uploading..." : "Upload Video"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;

