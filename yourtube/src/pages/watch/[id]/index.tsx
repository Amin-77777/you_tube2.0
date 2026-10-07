import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";
import { DEFAULT_FALLBACK_VIDEOS } from "@/lib/videoUtils";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const fetchVideoData = async () => {
      setLoading(true);
      let list: any[] = [];

      try {
        const res = await axiosInstance.get("/video/getall");
        if (Array.isArray(res.data) && res.data.length > 0) {
          list = res.data;
        }
      } catch (err) {
        console.warn("Could not fetch videos from backend, using fallback list:", err);
      }

      if (list.length === 0) {
        list = DEFAULT_FALLBACK_VIDEOS;
      }
      setAllVideos(list);

      // Find the requested video by _id or fallback
      let matched = list.find((v: any) => v._id === id || v.id === id);

      // If still not matched, check fallback list
      if (!matched) {
        matched = DEFAULT_FALLBACK_VIDEOS.find(
          (v: any) => v._id === id || v.videotitle?.toLowerCase() === String(id).toLowerCase()
        );
      }

      // If still no match but list has items, fall back to first video
      if (!matched && list.length > 0) {
        matched = list[0];
      }

      setCurrentVideo(matched || null);
      setLoading(false);
    };

    fetchVideoData();
  }, [router.isReady, id]);

  // Compute Next and Previous videos
  const { nextVideo, prevVideo } = useMemo(() => {
    if (!allVideos.length || !currentVideo) {
      return { nextVideo: undefined, prevVideo: undefined };
    }
    const currentIndex = allVideos.findIndex(
      (v) => v._id === currentVideo._id || v.id === currentVideo._id
    );
    const next =
      currentIndex >= 0 && currentIndex < allVideos.length - 1
        ? allVideos[currentIndex + 1]
        : allVideos.length > 1
        ? allVideos[0]
        : undefined;
    const prev = currentIndex > 0 ? allVideos[currentIndex - 1] : undefined;

    return { nextVideo: next, prevVideo: prev };
  }, [allVideos, currentVideo]);

  const handleNextVideo = () => {
    if (nextVideo?._id) {
      router.push(`/watch/${nextVideo._id}`);
    }
  };

  const handlePreviousVideo = () => {
    if (prevVideo?._id) {
      router.push(`/watch/${prevVideo._id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium text-sm animate-pulse">Loading video player...</p>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <Film className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Video Not Found</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          The video you are looking for does not exist or may have been removed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm px-5 py-2.5 rounded-full transition-colors shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* THEATER MODE: Full-width banner at top */}
      {isTheaterMode ? (
        <div>
          <div className="w-full bg-black py-0 sm:py-2">
            <div className="max-w-[1700px] mx-auto px-0 sm:px-4">
              <Videopplayer
                video={currentVideo}
                nextVideo={nextVideo}
                prevVideo={prevVideo}
                onNextVideo={handleNextVideo}
                onPreviousVideo={handlePreviousVideo}
                onTheaterModeChange={(theater) => setIsTheaterMode(theater)}
              />
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <VideoInfo
                  video={currentVideo}
                  onVideoUpdate={(updated: any) => setCurrentVideo(updated)}
                />
                <Comments videoId={currentVideo._id || id} />
              </div>
              <div className="space-y-4">
                <RelatedVideos
                  videos={allVideos.filter((v: any) => v._id !== currentVideo._id)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD MODE: 2-column layout */
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Videopplayer
                video={currentVideo}
                nextVideo={nextVideo}
                prevVideo={prevVideo}
                onNextVideo={handleNextVideo}
                onPreviousVideo={handlePreviousVideo}
                onTheaterModeChange={(theater) => setIsTheaterMode(theater)}
              />
              <VideoInfo
                video={currentVideo}
                onVideoUpdate={(updated: any) => setCurrentVideo(updated)}
              />
              <Comments videoId={currentVideo._id || id} />
            </div>
            <div className="space-y-4">
              <RelatedVideos
                videos={allVideos.filter((v: any) => v._id !== currentVideo._id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchPage;
