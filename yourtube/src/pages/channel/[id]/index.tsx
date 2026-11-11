import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();

  const [channelData, setChannelData] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const rawId = typeof id === "string" ? decodeURIComponent(id).trim() : "";

  const isOwner =
    user &&
    (user._id === rawId ||
      user.id === rawId ||
      (user.channelname &&
        channelData?.channelname &&
        user.channelname.toLowerCase() === channelData.channelname.toLowerCase()));

  useEffect(() => {
    if (!router.isReady) return;

    const fetchChannelAndVideos = async () => {
      try {
        setLoading(true);

        let activeChan: any = null;
        // If visiting own channel by ID or channel name
        if (
          user &&
          (user._id === rawId ||
            user.id === rawId ||
            (user.channelname && user.channelname.toLowerCase() === rawId.toLowerCase()))
        ) {
          activeChan = user;
        } else {
          try {
            const channelRes = await axiosInstance.get(`/user/channel/${encodeURIComponent(rawId)}`);
            if (channelRes.data) {
              activeChan = channelRes.data;
            }
          } catch (_) {
            activeChan = {
              _id: rawId,
              channelname: rawId || "Creator Channel",
              description: "Welcome to my official channel on YourTube!",
              image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rawId || "Creator")}`,
            };
          }
        }
        setChannelData(activeChan);

        // Fetch videos for this channel
        try {
          const vRes = await axiosInstance.get("/video/getall");
          if (Array.isArray(vRes.data)) {
            const targetName = (activeChan?.channelname || rawId).toLowerCase();
            const targetId = (activeChan?._id || rawId).toLowerCase();

            const matched = vRes.data.filter((v: any) => {
              const uploader = (v.uploader || "").toLowerCase();
              const channelName = (v.videochanel || "").toLowerCase();
              return (
                uploader === targetId ||
                uploader === rawId.toLowerCase() ||
                channelName === targetName
              );
            });
            // If uploader matched, show them; otherwise show popular catalog
            setVideos(matched.length > 0 ? matched : vRes.data.slice(0, 8));
          }
        } catch (err) {
          console.warn("Could not fetch channel videos:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChannelAndVideos();
  }, [router.isReady, rawId, user]);

  const activeChannel = isOwner ? user || channelData : channelData;

  return (
    <div className="flex-1 min-h-screen bg-background text-foreground transition-colors duration-200">
      <Head>
        <title>
          {activeChannel?.channelname || "Channel"} - YourTube
        </title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-4">
        <ChannelHeader
          channel={activeChannel}
          user={user}
          onEditProfile={() => router.push("/channel/create?mode=edit")}
        />

        <Channeltabs />

        {isOwner && (
          <div className="px-4 py-2">
            <VideoUploader channelId={rawId} channelName={activeChannel?.channelname} />
          </div>
        )}

        <div className="px-4 pb-12">
          <ChannelVideos videos={videos} />
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;
