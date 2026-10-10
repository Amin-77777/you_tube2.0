import {
  Bell,
  Menu,
  Mic,
  Search,
  Upload,
  User,
  VideoIcon,
  Download,
  Zap,
  CreditCard,
  ArrowLeft,
  X,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  Home,
  LogOut,
} from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import UploadVideoModal from "./UploadVideoModal";
import NotificationBell from "./NotificationBell";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";

const Header = () => {
  const { user, logout } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsMobileSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-2 sm:px-4 bg-white border-b shadow-xs">
        {isMobileSearchOpen ? (
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSearchOpen(false)}
              className="shrink-0 rounded-full"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Button>
            <div className="flex-1 relative flex items-center">
              <Input
                type="search"
                placeholder="Search YourTube"
                value={searchQuery}
                autoFocus
                onKeyPress={handleKeypress}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full pr-9 bg-gray-100 border-gray-200 focus-visible:ring-1"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="rounded-full shrink-0"
              aria-label="Submit search"
            >
              <Search className="w-5 h-5 text-gray-700" />
            </Button>
          </form>
        ) : (
          <>
            {/* Brand & Hamburger */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="rounded-full"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </Button>
              <Link href="/" className="flex items-center gap-1.5 focus:outline-none">
                <div className="bg-red-600 p-1 rounded-lg shadow-xs">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <span className="text-lg sm:text-xl font-bold tracking-tight">YourTube</span>
                <span className="text-[10px] text-gray-400 font-semibold self-start -ml-0.5">IN</span>
              </Link>
            </div>

            {/* Center Desktop Search */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex items-center gap-2 flex-1 max-w-2xl mx-4"
            >
              <div className="flex flex-1">
                <Input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onKeyPress={handleKeypress}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-l-full border-r-0 focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
                >
                  <Search className="w-5 h-5" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Mic className="w-5 h-5" />
              </Button>
            </form>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile Search Icon Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSearchOpen(true)}
                className="md:hidden rounded-full"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </Button>

              {/* Downloads Button - hidden on extra small screens */}
              <Link href="/downloads" title="View Downloads & Quota" className="hidden sm:inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 font-semibold rounded-full border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 text-xs shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-red-600" />
                  <span>Downloads</span>
                </Button>
              </Link>

              {/* Upload Button - hidden on mobile, accessible via bottom nav + drawer */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 font-medium rounded-full border-gray-300 hover:bg-gray-100 px-3 py-1 text-sm shadow-sm"
                title="Upload Video"
              >
                <Upload className="w-4 h-4 text-red-600" />
                <span>Upload</span>
              </Button>

              {user ? (
                <>
                  <Link href="/video-call" title="Video Call" className="hidden sm:inline-flex">
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <VideoIcon className="w-5 h-5 text-gray-700" />
                    </Button>
                  </Link>
                  <NotificationBell />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full p-0"
                      >
                        <Avatar className="h-8 w-8 border border-gray-200">
                          <AvatarImage src={user.image} />
                          <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      {user?.channelname ? (
                        <DropdownMenuItem asChild>
                          <Link href={`/channel/${user?._id || user?.id}`}>Your channel</Link>
                        </DropdownMenuItem>
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
                      <DropdownMenuItem asChild>
                        <Link href="/history">History</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/liked">Liked videos</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/watch-later">Watch later</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/downloads" className="flex items-center gap-2 font-medium text-red-600">
                          <Download className="w-4 h-4 text-red-600" />
                          Downloads
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/subscriptions" className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          Subscription Plans
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/subscription/dashboard" className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          Subscription & Invoices
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link href="/signin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 font-medium px-3 text-xs"
                  >
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sign in</span>
                  </Button>
                </Link>
              )}
            </div>
          </>
        )}
      </header>

      {/* Mobile Slide-out Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu Panel */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full z-10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="rounded-full"
                aria-label="Close menu"
              >
                <X className="w-6 h-6 text-gray-700" />
              </Button>
              <Link
                href="/"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-1.5"
              >
                <div className="bg-red-600 p-1 rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <span className="text-lg font-bold">YourTube</span>
              </Link>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <Link
                href="/"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <Home className="w-5 h-5 text-gray-700" />
                <span>Home</span>
              </Link>
              <Link
                href="/subscriptions"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <PlaySquare className="w-5 h-5 text-gray-700" />
                <span>Subscriptions</span>
              </Link>
              <Link
                href="/downloads"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Download className="w-5 h-5 text-red-600" />
                <span>Downloads</span>
              </Link>
              <Link
                href="/video-call"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <VideoIcon className="w-5 h-5 text-gray-700" />
                <span>Video Call</span>
              </Link>

              <div className="border-t my-2 pt-2">
                {user ? (
                  <>
                    <Link
                      href="/history"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      <History className="w-5 h-5 text-gray-700" />
                      <span>History</span>
                    </Link>
                    <Link
                      href="/liked"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      <ThumbsUp className="w-5 h-5 text-gray-700" />
                      <span>Liked videos</span>
                    </Link>
                    <Link
                      href="/watch-later"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      <Clock className="w-5 h-5 text-gray-700" />
                      <span>Watch later</span>
                    </Link>
                    <Link
                      href="/subscription/dashboard"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span>My Subscription</span>
                    </Link>

                    <div className="pt-2 border-t mt-2">
                      {user?.channelname ? (
                        <Link
                          href={`/channel/${user?._id || user?.id}`}
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                        >
                          <User className="w-5 h-5 text-gray-700" />
                          <span>Your channel</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileDrawerOpen(false);
                            setisdialogeopen(true);
                          }}
                          className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                        >
                          <User className="w-5 h-5 text-gray-700" />
                          <span>Create Channel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileDrawerOpen(false);
                          logout();
                        }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-1"
                      >
                        <LogOut className="w-5 h-5 text-red-600" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-2 py-3">
                    <p className="text-xs text-gray-500 mb-3">
                      Sign in to like videos, comment, and subscribe.
                    </p>
                    <Link
                      href="/signin"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="inline-flex items-center gap-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-4 py-2 rounded-full text-xs shadow-xs"
                    >
                      <User className="w-4 h-4 text-blue-600" />
                      <span>Sign in</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <UploadVideoModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </>
  );
};

export default Header;
