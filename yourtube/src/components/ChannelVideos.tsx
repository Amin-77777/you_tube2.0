import React from "react";
import VideoCard from "./videocard";

export default function ChannelVideos({ videos }: any) {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 border border-border rounded-2xl p-6 transition-colors">
        <p className="text-muted-foreground text-sm">No videos uploaded yet on this channel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl font-bold text-foreground">Videos & Uploads</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video: any) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
}
