"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getThumbnailSrc, getUniqueFallbackThumbnail, formatViews } from "@/lib/videoUtils";
import { Play, Image as ImageIcon, Download } from "lucide-react";
import EditThumbnailModal from "./EditThumbnailModal";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getBackendUrl } from "@/lib/backendUrl";
import { toast } from "sonner";

export default function VideoCard({ video, onVideoUpdate }: { video: any; onVideoUpdate?: (v: any) => void }) {
  const router = useRouter();
  const { user } = useUser();
  const [currentVideo, setCurrentVideo] = useState(video);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Sync if prop changes
  React.useEffect(() => {
    setCurrentVideo(video);
  }, [video]);

  const thumbnailSrc = getThumbnailSrc(currentVideo);
  const fallbackThumbnail = getUniqueFallbackThumbnail(currentVideo?._id || currentVideo?.videotitle);

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to download videos.", {
        action: {
          label: "Sign In",
          onClick: () => router.push(`/signin?redirect=/watch/${currentVideo?._id}`),
        },
      });
      return;
    }

    try {
      setIsDownloading(true);
      const res = await axiosInstance.post(`/download/authorize/${currentVideo?._id}`);
      if (res.data.authorized && res.data.downloadUrl) {
        if (res.data.isDuplicate) {
          toast.info("Duplicate download: Saved again without using daily quota.");
        } else {
          toast.success(`Download started! Remaining today: ${res.data.quota?.remaining}`);
        }
        const fullUrl = `${getBackendUrl()}${res.data.downloadUrl}`;
        const link = document.createElement("a");
        link.href = fullUrl;
        link.setAttribute("download", "");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.error === "QuotaExceeded") {
        toast.error(errData.message || "Daily download limit reached.", {
          action: {
            label: "Upgrade Plan",
            onClick: () => router.push("/subscriptions"),
          },
        });
      } else {
        toast.error(errData?.message || "Failed to start download.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpdateSuccess = (updated: any) => {
    setCurrentVideo(updated);
    setImageError(false);
    setImageLoaded(false);
    if (onVideoUpdate) {
      onVideoUpdate(updated);
    }
  };

  return (
    <>
      <div className="group block focus:outline-none relative">
        <Link href={`/watch/${currentVideo?._id}`} className="block">
          <div className="space-y-3">
            {/* Thumbnail Container */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 shadow-sm transition-all group-hover:shadow-md">
              {/* Thumbnail Image */}
              <img
                src={imageError ? fallbackThumbnail : thumbnailSrc}
                alt={currentVideo?.videotitle || "Video thumbnail"}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Subtle Hover Play Overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-black/70 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                </div>
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 bg-black/85 text-white text-xs font-semibold px-2 py-0.5 rounded shadow">
                {currentVideo?.duration || "0:30"}
              </div>

              {/* Premium Tier Badge */}
              {currentVideo?.accessLevel && currentVideo.accessLevel !== "free" && (
                <div
                  className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md backdrop-blur-md transition-opacity group-hover:opacity-0 ${
                    currentVideo.accessLevel === "gold"
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border border-yellow-200"
                      : currentVideo.accessLevel === "silver"
                      ? "bg-gradient-to-r from-slate-200 to-slate-400 text-slate-900 border border-slate-100"
                      : "bg-gradient-to-r from-amber-700 to-amber-600 text-white border border-amber-500"
                  }`}
                >
                  <span>
                    {currentVideo.accessLevel === "gold"
                      ? "👑 GOLD VIP"
                      : currentVideo.accessLevel === "silver"
                      ? "⚡ SILVER"
                      : "🥉 BRONZE"}
                  </span>
                </div>
              )}

              {/* Quick Download Button on Hover */}
              <button
                type="button"
                onClick={handleQuickDownload}
                title="Download Video"
                disabled={isDownloading}
                className="absolute top-2 left-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md z-10 font-semibold"
              >
                <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
                <span>{isDownloading ? "..." : "Download"}</span>
              </button>

              {/* Quick Change Thumbnail Button on Hover */}
              <button
                type="button"
                onClick={handleEditClick}
                title="Change Thumbnail"
                className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow backdrop-blur-sm z-10"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Thumbnail</span>
              </button>
            </div>

            {/* Video Metadata */}
            <div className="flex gap-3 items-start">
              <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5 border">
                <AvatarFallback className="bg-red-100 text-red-700 font-semibold text-xs">
                  {currentVideo?.videochanel?.[0]?.toUpperCase() || "V"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {currentVideo?.videotitle || "Untitled Video"}
                </h3>
                <p className="text-xs text-gray-600 mt-1 font-medium truncate">
                  {currentVideo?.videochanel || "Community Channel"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatViews(currentVideo?.views)} •{" "}
                  {currentVideo?.createdAt
                    ? formatDistanceToNow(new Date(currentVideo.createdAt)) + " ago"
                    : "Recently"}
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Edit Thumbnail Modal */}
      {isEditModalOpen && (
        <EditThumbnailModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          video={currentVideo}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </>
  );
}
