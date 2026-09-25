"use client";
import React, { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getThumbnailSrc, getUniqueFallbackThumbnail, formatViews } from "@/lib/videoUtils";
import { Play, Image as ImageIcon } from "lucide-react";
import EditThumbnailModal from "./EditThumbnailModal";

export default function VideoCard({ video, onVideoUpdate }: { video: any; onVideoUpdate?: (v: any) => void }) {
  const [currentVideo, setCurrentVideo] = useState(video);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

