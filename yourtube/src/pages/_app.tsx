import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isVideoRoom = router.pathname.startsWith("/video-call/[roomId]");

  return (
    <UserProvider>
      <div className="min-h-screen bg-white text-black">
        <title>Your-Tube Clone</title>
        {!isVideoRoom && <Header />}
        <Toaster />
        <div className="flex">
          {!isVideoRoom && <Sidebar />}
          <Component {...pageProps} />
        </div>
      </div>
    </UserProvider>
  );
}

