import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import VideoCall from "@/video-call/VideoCall";

export default function VideoCallRoomPage() {
  const router = useRouter();
  const { roomId } = router.query;

  if (!roomId || typeof roomId !== "string") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`Call ${roomId} | YourTube Meet`}</title>
      </Head>
      <VideoCall initialRoomId={roomId} />
    </>
  );
}
