import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Video,
  Download,
  CreditCard,
  Shield,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user } = useUser();

  const [isdialogeopen, setisdialogeopen] = useState(false);
  return (
    <aside className="w-64 bg-card text-foreground border-r border-border min-h-screen p-2 hidden md:block shrink-0 transition-colors">
      <nav className="space-y-1">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="ghost" className="w-full justify-start">
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions">
          <Button variant="ghost" className="w-full justify-start">
            <PlaySquare className="w-5 h-5 mr-3" />
            Subscriptions
          </Button>
        </Link>
        <Link href="/downloads">
          <Button variant="ghost" className="w-full justify-start text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700">
            <Download className="w-5 h-5 mr-3 text-red-600" />
            Downloads
          </Button>
        </Link>
        <Link href="/video-call">
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40">
            <Video className="w-5 h-5 mr-3" />
            Video Call
          </Button>
        </Link>

        {user && (
          <>
            <div className="border-t border-border pt-2 mt-2">
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start">
                  <History className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button variant="ghost" className="w-full justify-start">
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              <Link href="/subscription/dashboard">
                <Button variant="ghost" className="w-full justify-start text-emerald-700 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                  <CreditCard className="w-5 h-5 mr-3 text-emerald-600" />
                  My Subscription
                </Button>
              </Link>
              <Link href="/security">
                <Button variant="ghost" className="w-full justify-start text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-950/40">
                  <Shield className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                  Security & Theme
                </Button>
              </Link>
              {(user?.role === "admin" || user?.role === "moderator") && (
                <Link href="/admin/moderation">
                  <Button variant="ghost" className="w-full justify-start text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-50 dark:hover:bg-purple-950/40">
                    <ShieldAlert className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" />
                    Admin Moderation
                  </Button>
                </Link>
              )}
              {user?.channelname ? (
                <Link href={`/channel/${user.id || user._id}`}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;
