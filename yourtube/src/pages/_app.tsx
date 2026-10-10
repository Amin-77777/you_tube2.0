import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isVideoRoom = router.pathname.startsWith("/video-call/[roomId]");
  const isWatchPage = router.pathname.startsWith("/watch");

  return (
    <UserProvider>
      <div className="min-h-screen bg-white text-black flex flex-col">
        <title>Your-Tube Clone</title>
        {!isVideoRoom && <Header />}
        <Toaster />
        <div className="flex w-full min-w-0 flex-1">
          {!isVideoRoom && !isWatchPage && <Sidebar />}
          <main className={`flex-1 w-full min-w-0 ${!isVideoRoom && !isWatchPage ? "pb-16 md:pb-0" : ""}`}>
            <Component {...pageProps} />
          </main>
        </div>
        {!isVideoRoom && <MobileBottomNav />}
      </div>
    </UserProvider>
  );
}

