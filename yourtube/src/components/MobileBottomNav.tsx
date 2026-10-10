"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, PlaySquare, PlusCircle, Download, Clock, User } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import UploadVideoModal from "./UploadVideoModal";

export default function MobileBottomNav() {
  const router = useRouter();
  const { user } = useUser();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Do not show bottom nav on watch page or video room
  if (
    router.pathname.startsWith("/watch") ||
    router.pathname.startsWith("/video-call/[roomId]")
  ) {
    return null;
  }

  const currentPath = router.pathname;

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 py-1 px-2 flex items-center justify-around shadow-lg select-none"
      >
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            currentPath === "/" ? "text-red-600 font-bold" : "text-gray-600 hover:text-black"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </Link>

        {/* Subscriptions */}
        <Link
          href="/subscriptions"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            currentPath.startsWith("/subscriptions") || currentPath.startsWith("/subscription")
              ? "text-red-600 font-bold"
              : "text-gray-600 hover:text-black"
          }`}
        >
          <PlaySquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Subscriptions</span>
        </Link>

        {/* Quick Upload */}
        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="flex flex-col items-center justify-center py-0.5 px-3 text-red-600 active:scale-95 transition-transform"
          aria-label="Upload video"
          title="Upload video"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        {/* Downloads */}
        <Link
          href="/downloads"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            currentPath.startsWith("/downloads") ? "text-red-600 font-bold" : "text-gray-600 hover:text-black"
          }`}
        >
          <Download className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Downloads</span>
        </Link>

        {/* Library / Profile */}
        <Link
          href={user ? "/history" : "/signin"}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            currentPath.startsWith("/history") || currentPath.startsWith("/liked") || currentPath.startsWith("/watch-later")
              ? "text-red-600 font-bold"
              : "text-gray-600 hover:text-black"
          }`}
        >
          {user ? <Clock className="w-5 h-5 mb-0.5" /> : <User className="w-5 h-5 mb-0.5" />}
          <span className="text-[10px]">{user ? "History" : "Sign In"}</span>
        </Link>
      </nav>

      {/* Upload Modal triggered from bottom bar */}
      {isUploadOpen && (
        <UploadVideoModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
        />
      )}
    </>
  );
}
