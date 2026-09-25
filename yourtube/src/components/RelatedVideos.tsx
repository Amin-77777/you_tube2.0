import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getThumbnailSrc, getUniqueFallbackThumbnail, formatViews } from "@/lib/videoUtils";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    filepath?: string;
    thumbnail?: string;
    duration?: string;
    views: number;
    createdAt: string;
  }>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  if (!videos || !Array.isArray(videos)) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-base text-gray-900 mb-2">Related Videos</h3>
      {videos.map((video) => (
        <Link
          key={video._id}
          href={`/watch/${video._id}`}
          className="flex gap-2.5 group focus:outline-none"
        >
          <div className="relative w-40 aspect-video bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
            <img
              src={getThumbnailSrc(video)}
              alt={video.videotitle || "Video thumbnail"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e: any) => {
                e.target.src = getUniqueFallbackThumbnail(video._id || video.videotitle);
              }}
            />
            <div className="absolute bottom-1 right-1 bg-black/85 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
              {video.duration || "0:30"}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video.videotitle || "Untitled Video"}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.videochanel || "Community Channel"}</p>
            <p className="text-xs text-gray-600">
              {typeof video.views === "number" ? video.views.toLocaleString() : 0} views •{" "}
              {video.createdAt ? formatDistanceToNow(new Date(video.createdAt)) + " ago" : "Recently"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
