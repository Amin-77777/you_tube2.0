import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getBackendUrl } from "@/lib/backendUrl";
import EditThumbnailModal from "./EditThumbnailModal";

const VideoInfo = ({ video, onVideoUpdate }: any) => {
  const [currentVideo, setCurrentVideo] = useState(video);
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    setCurrentVideo(video);
  }, [video]);

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      const targetId = currentVideo?._id || video?._id;
      toast.error("Please sign in to download videos for offline viewing.", {
        action: {
          label: "Sign In",
          onClick: () => router.push(targetId ? `/signin?redirect=/watch/${targetId}` : "/signin"),
        },
      });
      return;
    }

    const targetId = currentVideo?._id || video?._id;
    if (!targetId) {
      toast.error("Video ID is missing.");
      return;
    }

    try {
      setDownloading(true);
      const res = await axiosInstance.post(`/download/authorize/${targetId}`);
      if (res.data.authorized && res.data.downloadUrl) {
        if (res.data.isDuplicate) {
          toast.info("Duplicate download: Downloaded again without using daily quota.");
        } else {
          toast.success(
            `Download started! ${res.data.quota?.remaining} download(s) remaining today.`
          );
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
        toast.error(errData.message || "Daily download quota exceeded.", {
          action: {
            label: "Upgrade Plan",
            onClick: () => router.push("/subscriptions"),
          },
        });
      } else {
        toast.error(errData?.message || "Failed to authorize download.");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">{video.videotitle}</h1>
        {video.accessLevel && video.accessLevel !== "free" && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-sm ${
              video.accessLevel === "gold"
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border border-yellow-300"
                : video.accessLevel === "silver"
                ? "bg-gradient-to-r from-slate-200 to-slate-400 text-slate-900 border border-slate-300"
                : "bg-gradient-to-r from-amber-700 to-amber-600 text-white border border-amber-600"
            }`}
          >
            <span>
              {video.accessLevel === "gold"
                ? "👑 Gold VIP"
                : video.accessLevel === "silver"
                ? "⚡ Silver"
                : "🥉 Bronze"}
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4 rounded-full bg-black text-white hover:bg-gray-800">Subscribe</Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full sm:flex-wrap">
          {/* Prominent High-Visibility Download Button */}
          <Button
            variant="default"
            size="sm"
            disabled={downloading}
            onClick={handleDownload}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full font-bold px-4 shadow-sm flex items-center gap-1.5 transition-all"
            title="Download Video for Offline Viewing"
          >
            <Download className={`w-4 h-4 text-white ${downloading ? "animate-bounce" : ""}`} />
            <span>{downloading ? "Preparing..." : "Download"}</span>
          </Button>

          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 hover:bg-gray-200 rounded-full text-blue-600 font-medium"
            onClick={() => setIsEditModalOpen(true)}
          >
            <ImageIcon className="w-5 h-5 mr-1.5 text-blue-600" />
            Thumbnail
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {isEditModalOpen && (
        <EditThumbnailModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          video={currentVideo}
          onSuccess={(updated) => {
            setCurrentVideo(updated);
            if (onVideoUpdate) {
              onVideoUpdate(updated);
            }
          }}
        />
      )}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>

      {/* Prominent Offline Download Action Banner */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">
              Download video for offline playback
            </h4>
            <p className="text-xs text-gray-600">
              {currentVideo?.filesize ? `Size: ${currentVideo.filesize} • ` : ""}
              Controlled daily quota • Secure download stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-5 shadow-xs"
          >
            <Download className={`w-4 h-4 mr-1.5 ${downloading ? "animate-bounce" : ""}`} />
            {downloading ? "Preparing..." : "Download Now"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/subscriptions")}
            className="rounded-full text-xs font-semibold border-red-200 text-red-700 hover:bg-red-100/50"
          >
            View Quota Plans
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoInfo;
