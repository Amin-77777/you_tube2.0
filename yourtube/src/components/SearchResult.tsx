import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { getThumbnailSrc, getUniqueFallbackThumbnail, formatViews } from "@/lib/videoUtils";


const SearchResult = ({ query }: any) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!query || !query.trim()) {
        setVideos([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await axiosInstance.get("/video/getall");
        const allVideos = res.data || [];
        const q = query.toLowerCase().trim();
        const results = allVideos.filter(
          (vid: any) =>
            (vid.videotitle && vid.videotitle.toLowerCase().includes(q)) ||
            (vid.videochanel && vid.videochanel.toLowerCase().includes(q))
        );
        setVideos(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [query]);

  if (!query || !query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 animate-pulse">Searching videos...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">No results found for "{query}"</h2>
        <p className="text-gray-600">
          Try different keywords or check your spelling.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-4">
        {videos.map((video: any) => (
          <div key={video._id} className="flex flex-col sm:flex-row gap-4 group">
            <Link href={`/watch/${video._id}`} className="flex-shrink-0">
              <div className="relative w-full sm:w-80 aspect-video bg-gray-200 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={getThumbnailSrc(video)}
                  alt={video.videotitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e: any) => {
                    e.target.src = getUniqueFallbackThumbnail(video._id || video.videotitle);
                  }}
                />
                <div className="absolute bottom-2 right-2 bg-black/85 text-white text-xs font-semibold px-2 py-0.5 rounded shadow">
                  {video.duration || "0:30"}
                </div>
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-semibold text-lg line-clamp-2 text-gray-900 group-hover:text-blue-600 mb-1 leading-snug">
                  {video.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span>{formatViews(video.views)}</span>
                <span>•</span>
                <span>
                  {video.createdAt ? formatDistanceToNow(new Date(video.createdAt)) + " ago" : "Recently"}
                </span>
              </div>

              <Link
                href={`/channel/${video.uploader}`}
                className="flex items-center gap-2 mb-2 hover:text-blue-600 text-sm text-gray-700 font-medium"
              >
                <Avatar className="w-6 h-6 border">
                  <AvatarFallback className="text-[10px] bg-red-100 text-red-700">
                    {video.videochanel?.[0]?.toUpperCase() || "V"}
                  </AvatarFallback>
                </Avatar>
                <span>{video.videochanel || "Community Channel"}</span>
              </Link>

              <p className="text-xs text-gray-600 line-clamp-2">
                High quality streaming video. Watch now in full resolution on YourTube.
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-6 border-t">
        <p className="text-xs text-gray-500">
          Showing {videos.length} results for "{query}"
        </p>
      </div>
    </div>
  );
};

export default SearchResult;

