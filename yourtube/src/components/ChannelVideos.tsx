import React, { useState } from "react";
import VideoCard from "./videocard";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Trash2, AlertTriangle, Film, Sparkles, SlidersHorizontal, Check } from "lucide-react";
import { getThumbnailSrc } from "@/lib/videoUtils";

interface ChannelVideosProps {
  videos: any[];
  isOwner?: boolean;
  onDeleteVideo?: (videoId: string) => Promise<void> | void;
}

export default function ChannelVideos({
  videos,
  isOwner = false,
  onDeleteVideo,
}: ChannelVideosProps) {
  const [videoToDelete, setVideoToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");

  const sortedVideos = [...(videos || [])].sort((a, b) => {
    if (sortBy === "popular") {
      return (b.views || 0) - (a.views || 0);
    }
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const handleDeleteClick = (video: any) => {
    setVideoToDelete(video);
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;
    try {
      setIsDeleting(true);
      if (onDeleteVideo) {
        await onDeleteVideo(videoToDelete._id || videoToDelete.id);
      }
      setVideoToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/20 border border-border/80 rounded-3xl p-8 transition-colors max-w-xl mx-auto my-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground shadow-inner">
          <Film className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No videos uploaded yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1 mb-6">
          This channel hasn't uploaded any videos yet. When videos are published, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Channel Videos</h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {videos.length} {videos.length === 1 ? "video" : "videos"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort pills */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSortBy("latest")}
              className={`px-3 py-1 rounded-lg transition-all ${
                sortBy === "latest"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Latest
            </button>
            <button
              type="button"
              onClick={() => setSortBy("popular")}
              className={`px-3 py-1 rounded-lg transition-all ${
                sortBy === "popular"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Popular
            </button>
          </div>

          {/* Owner Manage Toggle */}
          {isOwner && (
            <Button
              type="button"
              variant={manageMode ? "default" : "outline"}
              size="sm"
              onClick={() => setManageMode(!manageMode)}
              className={`rounded-xl text-xs font-bold h-8 flex items-center gap-1.5 transition-all ${
                manageMode
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{manageMode ? "Done Managing" : "Manage Videos"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Owner Manage Banner */}
      {isOwner && manageMode && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-600 dark:text-red-400 font-medium">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>
              <strong>Manage Mode Active:</strong> Click "Delete" on any video card below to permanently remove it from your channel.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setManageMode(false)}
            className="h-7 px-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-lg shrink-0"
          >
            Done
          </Button>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedVideos.map((video: any) => (
          <div key={video._id || video.id} className="relative group">
            <VideoCard
              video={video}
              canDelete={isOwner}
              onDelete={isOwner ? () => handleDeleteClick(video) : undefined}
            />

            {/* Persistent Delete Button in Manage Mode */}
            {isOwner && manageMode && (
              <div className="mt-2 flex items-center justify-between gap-2 p-2 bg-card rounded-xl border border-destructive/40 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground truncate">
                  {video.videotitle}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(video)}
                  className="h-7 px-3 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(videoToDelete)}
        onOpenChange={(open) => !open && setVideoToDelete(null)}
      >
        <DialogContent className="max-w-md bg-card text-card-foreground border-border rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <span>Delete Video?</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
              Are you sure you want to permanently delete this video? This action will remove the video file, thumbnail, and view counts from your channel and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {videoToDelete && (
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-2xl border border-border my-2">
              <img
                src={getThumbnailSrc(videoToDelete)}
                alt={videoToDelete.videotitle}
                className="w-20 h-12 object-cover rounded-xl shrink-0 bg-muted shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs text-foreground truncate">
                  {videoToDelete.videotitle || "Untitled Video"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {videoToDelete.videochanel || "Channel"} • {videoToDelete.duration || "0:30"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVideoToDelete(null)}
              disabled={isDeleting}
              className="rounded-full px-5 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-full px-5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? "animate-spin" : ""}`} />
              <span>{isDeleting ? "Deleting..." : "Delete Permanently"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
