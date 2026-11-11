import React, { useEffect, useState, useRef, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Languages,
  MoreVertical,
  Flag,
  Edit2,
  Trash2,
  History,
  MapPin,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
  X,
  Send,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  ur: "Urdu",
  es: "Spanish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  ja: "Japanese",
};

export const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Offensive Content",
  "Hate Speech",
  "Threats",
  "Misleading Information",
  "Malicious Links",
  "Other",
];

export interface CommentItem {
  _id: string;
  videoId: string;
  videoid?: string;
  userId: any;
  userid?: any;
  parentCommentId?: string | null;
  originalText: string;
  commentbody?: string;
  usercommented: string;
  userImage?: string;
  userLocation?: string;
  detectedLanguage?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  likesCount: number;
  dislikesCount: number;
  repliesCount: number;
  version: number;
  createdAt: string;
  commentedon?: string;
  userReaction?: "like" | "dislike" | null;
}

export interface TranslationState {
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  sourceLanguageName?: string;
  targetLanguageName?: string;
  isLoading: boolean;
  isShown: boolean;
  error?: string | null;
}

function formatCommentTime(dateInput: string | Date | number): string {
  if (!dateInput) return "Just now";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Recently";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 45) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderFormattedText(text: string) {
  if (!text) return null;
  const mentionRegex = /(@[a-zA-Z0-9_.-]+)/g;
  const lines = text.split("\n");

  return (
    <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200 break-words leading-relaxed">
      {lines.map((line, lIdx) => {
        const parts = line.split(mentionRegex);
        return (
          <p key={lIdx} className="min-h-[1.25rem]">
            {parts.map((part, pIdx) => {
              if (part.startsWith("@")) {
                return (
                  <span
                    key={pIdx}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded-sm"
                  >
                    {part}
                  </span>
                );
              }
              return <span key={pIdx}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

interface CommentsProps {
  videoId: string;
}

const Comments = ({ videoId }: CommentsProps) => {
  const { user } = useUser();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<string>("relevant");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // New Comment State
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User Preferences
  const [userPreferredLang, setUserPreferredLang] = useState<string>("en");
  const [showLocationPref, setShowLocationPref] = useState<boolean>(true);
  const [notifPrefs, setNotifPrefs] = useState({
    replies: true,
    likes: true,
    mentions: true,
    moderation: true,
  });
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  // Mention Suggestions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [activeMentionInputId, setActiveMentionInputId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Modals & Action States
  const [reportingComment, setReportingComment] = useState<CommentItem | null>(null);
  const [reportReason, setReportReason] = useState<string>("Spam");
  const [reportDescription, setReportDescription] = useState<string>("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [historyCommentId, setHistoryCommentId] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // CAPTCHA State
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const [captchaData, setCaptchaData] = useState<{ challengeId: string; question: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [pendingCommentPayload, setPendingCommentPayload] = useState<any>(null);

  // Rate Limiting Cooldown
  const [rateLimitTimer, setRateLimitTimer] = useState<number | null>(null);

  // Fetch comments from backend
  const fetchComments = async (currentPage = 1, currentSort = sortOption, append = false) => {
    if (!videoId) return;
    try {
      if (currentPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await axiosInstance.get(`/api/comments/${videoId}`, {
        params: {
          sort: currentSort,
          page: currentPage,
          limit: 15,
        },
      });

      let fetchedList: CommentItem[] = [];
      let total = 0;
      let more = false;

      if (res.data?.comments && Array.isArray(res.data.comments)) {
        fetchedList = res.data.comments;
        total = res.data.pagination?.total ?? fetchedList.length;
        more = res.data.pagination?.hasMore ?? false;
      } else if (Array.isArray(res.data)) {
        fetchedList = res.data;
        total = fetchedList.length;
        more = false;
      }

      if (append) {
        setComments((prev) => [...prev, ...fetchedList]);
      } else {
        setComments(fetchedList);
      }
      setTotalCount(total);
      setHasMore(more);
      setPage(currentPage);
    } catch (err: any) {
      console.warn("Error fetching comments:", err.message);
      toast.error("Could not load comments. Please refresh.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load user preferences on mount
  useEffect(() => {
    if (user) {
      axiosInstance
        .get("/api/user/comment-preferences")
        .then((res) => {
          if (res.data?.success) {
            if (res.data.preferredLanguage) setUserPreferredLang(res.data.preferredLanguage);
            if (res.data.showLocationInComments !== undefined)
              setShowLocationPref(res.data.showLocationInComments);
            if (res.data.notificationPreferences) setNotifPrefs(res.data.notificationPreferences);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Initial comment load & reload when videoId or sortOption changes
  useEffect(() => {
    fetchComments(1, sortOption, false);
  }, [videoId, sortOption]);

  // Rate limit countdown tick
  useEffect(() => {
    if (rateLimitTimer === null || rateLimitTimer <= 0) return;
    const interval = setInterval(() => {
      setRateLimitTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitTimer]);

  // Mentions Autocomplete Debounce
  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 1) {
      setMentionSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(`/api/comments/users/mentions?q=${encodeURIComponent(mentionQuery)}`);
        if (Array.isArray(res.data)) {
          setMentionSuggestions(res.data);
        }
      } catch (err) {
        setMentionSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  // Helper to trigger CAPTCHA challenge
  const requestCaptchaChallenge = async (failedPayload: any) => {
    try {
      const res = await axiosInstance.get("/api/comments/captcha/challenge");
      if (res.data?.challengeId) {
        setCaptchaData(res.data);
        setCaptchaAnswer("");
        setCaptchaError("");
        setPendingCommentPayload(failedPayload);
        setCaptchaModalOpen(true);
      }
    } catch {
      toast.error("Security challenge could not be loaded. Please try again shortly.");
    }
  };

  // Submit CAPTCHA
  const handleSolveCaptcha = async () => {
    if (!captchaAnswer.trim() || !captchaData || !pendingCommentPayload) return;
    const payloadWithCaptcha = {
      ...pendingCommentPayload,
      captchaChallengeId: captchaData.challengeId,
      captchaAnswer: captchaAnswer.trim(),
    };
    setCaptchaModalOpen(false);

    if (payloadWithCaptcha.parentCommentId) {
      // It was a reply
      executeReplySubmission(payloadWithCaptcha);
    } else {
      executeCommentSubmission(payloadWithCaptcha);
    }
  };

  // Handle typing in Main Comment box
  const handleCommentTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 2000) {
      setNewCommentText(val);
      detectMention(val, e.target.selectionStart, "main");
    }
  };

  const detectMention = (val: string, cursorIndex: number, inputId: string) => {
    const textBeforeCursor = val.slice(0, cursorIndex);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionQuery(lastWord.slice(1));
      setActiveMentionInputId(inputId);
    } else {
      setMentionQuery(null);
      setActiveMentionInputId(null);
    }
  };

  const handleSelectMention = (suggestedUser: any, inputType: "main" | "reply", currentText: string, setTextFn: (t: string) => void) => {
    const targetUsername = suggestedUser.channelname || suggestedUser.name.replace(/\s+/g, "").toLowerCase();
    const cursor = inputType === "main" ? commentInputRef.current?.selectionStart || currentText.length : currentText.length;
    const before = currentText.slice(0, cursor);
    const after = currentText.slice(cursor);
    const lastAtIndex = before.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const newText = before.slice(0, lastAtIndex) + `@${targetUsername} ` + after;
      setTextFn(newText);
    } else {
      setTextFn(currentText + ` @${targetUsername} `);
    }

    setMentionQuery(null);
    setActiveMentionInputId(null);
    setMentionSuggestions([]);
  };

  // Post top-level comment
  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("Please sign in to post comments.");
      return;
    }
    const cleanText = newCommentText.trim();
    if (!cleanText) return;

    const payload = {
      videoId,
      originalText: cleanText,
      userId: user._id || user.id,
      usercommented: user.name || "Anonymous",
    };

    executeCommentSubmission(payload);
  };

  const executeCommentSubmission = async (payload: any) => {
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/api/comments", payload);
      if (res.data?.success && res.data.result) {
        const added = res.data.result;
        setComments((prev) => [added, ...prev]);
        setTotalCount((prev) => prev + 1);
        setNewCommentText("");
        setMentionQuery(null);
        toast.success("Comment posted!");
      }
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 429) {
        const waitSec = data?.retryAfterSeconds || 60;
        setRateLimitTimer(waitSec);
        toast.error(data?.message || `Rate limit reached. Please wait ${waitSec}s.`);
        if (data?.requireCaptcha) {
          requestCaptchaChallenge(payload);
        }
      } else if (data?.requireCaptcha || data?.captchaRequired) {
        toast.info("Please verify the security challenge to post your comment.");
        requestCaptchaChallenge(payload);
      } else {
        toast.error(data?.message || "Failed to post comment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute reply submission
  const executeReplySubmission = async (payload: any, onComplete?: (reply: CommentItem) => void) => {
    try {
      const res = await axiosInstance.post("/api/comments", payload);
      if (res.data?.success && res.data.result) {
        const newReply = res.data.result;
        // Update parent repliesCount in comments state
        setComments((prev) =>
          prev.map((c) =>
            c._id === payload.parentCommentId
              ? { ...c, repliesCount: (c.repliesCount || 0) + 1 }
              : c
          )
        );
        toast.success("Reply posted!");
        if (onComplete) onComplete(newReply);
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.requireCaptcha || data?.captchaRequired) {
        requestCaptchaChallenge(payload);
      } else {
        toast.error(data?.message || "Failed to post reply.");
      }
    }
  };

  // Toggle Reaction (Like / Dislike)
  const handleToggleReaction = async (commentId: string, type: "like" | "dislike", isReply = false, parentId?: string) => {
    if (!user) {
      toast.error("Please sign in to react to comments.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/api/comments/${commentId}/reaction`, { type });
      if (res.data?.success) {
        const { userReaction, likesCount, dislikesCount } = res.data;

        setComments((prev) =>
          prev.map((c) => {
            if (c._id === commentId) {
              return { ...c, userReaction, likesCount, dislikesCount };
            }
            return c;
          })
        );
        return { userReaction, likesCount, dislikesCount };
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not update reaction");
    }
  };

  // Edit comment
  const handleSaveEdit = async (commentId: string, newText: string, currentVersion: number) => {
    try {
      const res = await axiosInstance.put(`/api/comments/${commentId}`, {
        originalText: newText,
        version: currentVersion,
      });

      if (res.data?.success && res.data.comment) {
        const updated = res.data.comment;
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? { ...c, ...updated, isEdited: true } : c))
        );
        toast.success("Comment updated successfully!");
        return true;
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error("Concurrency conflict: This comment was modified elsewhere. Please refresh.");
      } else {
        toast.error(err.response?.data?.message || "Failed to update comment");
      }
      return false;
    }
  };

  // Delete comment
  const handleConfirmDelete = async () => {
    if (!deletingCommentId) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/api/comments/${deletingCommentId}`);
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === deletingCommentId) {
            if (c.repliesCount > 0) {
              return {
                ...c,
                isDeleted: true,
                originalText: "This comment has been deleted.",
                usercommented: "[Deleted]",
                userImage: "",
              };
            } else {
              return null;
            }
          }
          return c;
        }).filter(Boolean) as CommentItem[]
      );
      toast.success("Comment deleted.");
      setDeletingCommentId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit Report
  const handleSubmitReport = async () => {
    if (!reportingComment) return;
    setIsSubmittingReport(true);
    try {
      const res = await axiosInstance.post(`/api/comments/${reportingComment._id}/report`, {
        reason: reportReason,
        description: reportDescription,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Thank you. This comment has been reported.");
        setReportingComment(null);
        setReportDescription("");
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.info(err.response.data.message || "You have already reported this comment.");
        setReportingComment(null);
      } else {
        toast.error(err.response?.data?.message || "Failed to submit report.");
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // View Edit History
  const handleOpenEditHistory = async (commentId: string) => {
    setHistoryCommentId(commentId);
    setIsLoadingHistory(true);
    try {
      const res = await axiosInstance.get(`/api/comments/${commentId}/history`);
      if (Array.isArray(res.data)) {
        setHistoryLogs(res.data);
      }
    } catch (err) {
      toast.error("Failed to fetch comment history");
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Save User Preferences
  const handleSavePreferences = async () => {
    try {
      const res = await axiosInstance.put("/api/user/comment-preferences", {
        preferredLanguage: userPreferredLang,
        showLocationInComments: showLocationPref,
        notificationPreferences: notifPrefs,
      });
      if (res.data?.success) {
        toast.success("Comment preferences saved!");
        setIsPrefModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save preferences.");
    }
  };

  return (
    <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
      {/* Top Header Bar: Total Count, Sorting Dropdown, Language Settings */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>{totalCount} Comments</span>
          </h2>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">Sort by:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs font-semibold h-8 px-3 gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  {sortOption === "relevant" && "Most Relevant"}
                  {sortOption === "newest" && "Newest First"}
                  {sortOption === "oldest" && "Oldest First"}
                  {sortOption === "likes" && "Most Liked"}
                  {sortOption === "dislikes" && "Most Disliked"}
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 rounded-xl shadow-xl">
                <DropdownMenuItem
                  onClick={() => setSortOption("relevant")}
                  className={`text-xs font-medium cursor-pointer ${sortOption === "relevant" ? "bg-red-50 text-red-600 font-bold" : ""}`}
                >
                  Most Relevant
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOption("newest")}
                  className={`text-xs font-medium cursor-pointer ${sortOption === "newest" ? "bg-red-50 text-red-600 font-bold" : ""}`}
                >
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOption("oldest")}
                  className={`text-xs font-medium cursor-pointer ${sortOption === "oldest" ? "bg-red-50 text-red-600 font-bold" : ""}`}
                >
                  Oldest First
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOption("likes")}
                  className={`text-xs font-medium cursor-pointer ${sortOption === "likes" ? "bg-red-50 text-red-600 font-bold" : ""}`}
                >
                  Most Liked
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOption("dislikes")}
                  className={`text-xs font-medium cursor-pointer ${sortOption === "dislikes" ? "bg-red-50 text-red-600 font-bold" : ""}`}
                >
                  Most Disliked
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Translation Preferences & Options */}
        <div className="flex items-center gap-2">
          {/* Quick Language Badge */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">
            <Languages className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-medium hidden sm:inline">Translate target:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {SUPPORTED_LANGUAGES[userPreferredLang] || userPreferredLang}
            </span>
          </div>

          {/* Preferences Button */}
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrefModalOpen(true)}
              className="rounded-full h-8 px-2.5 text-xs text-gray-600 hover:text-gray-900 gap-1"
              title="Comment & Language Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Settings</span>
            </Button>
          )}
        </div>
      </div>

      {/* Rate Limit Active Notice */}
      {rateLimitTimer !== null && rateLimitTimer > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <span className="font-bold">Posting temporarily paused: </span>
            <span>You have posted several comments rapidly. Cooldown active for </span>
            <strong className="underline">{rateLimitTimer} seconds</strong>.
          </div>
        </div>
      )}

      {/* Main Comment Input Box */}
      {user ? (
        <div className="flex gap-3 sm:gap-4 items-start">
          <Avatar className="w-10 h-10 border border-gray-200 shrink-0 mt-1">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback className="bg-red-100 text-red-700 font-bold">
              {user.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2 relative">
            <div className="relative">
              <Textarea
                ref={commentInputRef}
                placeholder="Add a comment... (Type @ to mention users, multiline & regional languages supported)"
                value={newCommentText}
                onChange={handleCommentTextChange}
                disabled={isSubmitting || (rateLimitTimer !== null && rateLimitTimer > 0)}
                className="min-h-[88px] max-h-[300px] resize-y rounded-2xl border-gray-200 dark:border-gray-800 p-3 text-sm focus-visible:ring-1 focus-visible:ring-red-600 dark:bg-gray-900"
              />

              {/* @Mention Autocomplete Dropdown */}
              {activeMentionInputId === "main" && mentionSuggestions.length > 0 && (
                <div className="absolute top-full left-0 z-50 mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Mention Suggestions
                  </div>
                  {mentionSuggestions.map((sug) => (
                    <div
                      key={sug._id}
                      onClick={() =>
                        handleSelectMention(
                          sug,
                          "main",
                          newCommentText,
                          setNewCommentText
                        )
                      }
                      className="p-2.5 flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={sug.image || ""} />
                        <AvatarFallback className="text-[10px]">{sug.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {sug.name}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">
                          @{sug.channelname || sug.name.replace(/\s+/g, "").toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Character Counter & Action Buttons */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span
                className={`text-[11px] font-mono ${
                  newCommentText.length > 1900 ? "text-red-600 font-bold" : "text-gray-400"
                }`}
              >
                {newCommentText.length} / 2000
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewCommentText("")}
                  disabled={!newCommentText.trim() || isSubmitting}
                  className="rounded-full text-xs h-8 px-4"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleSubmitComment}
                  disabled={
                    !newCommentText.trim() ||
                    isSubmitting ||
                    (rateLimitTimer !== null && rateLimitTimer > 0)
                  }
                  size="sm"
                  className="rounded-full text-xs h-8 px-5 bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Comment</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 flex items-center justify-between text-sm">
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Sign in to join the conversation, reply, react, and translate comments.
          </p>
          <a
            href="/signin"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-xs shadow-xs"
          >
            Sign in
          </a>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6 pt-2">
        {loading ? (
          <div className="py-12 text-center space-y-2 animate-pulse">
            <RefreshCw className="w-8 h-8 text-gray-300 mx-auto animate-spin" />
            <p className="text-sm font-semibold text-gray-500">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-gray-50 dark:bg-gray-900/40 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
            <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
              No comments yet
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Be the first to share your thoughts, ask questions, or provide feedback on this video!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment._id}
              comment={comment}
              currentUser={user}
              preferredLang={userPreferredLang}
              onToggleReaction={handleToggleReaction}
              onSaveEdit={handleSaveEdit}
              onRequestDelete={(id) => setDeletingCommentId(id)}
              onRequestReport={(c) => setReportingComment(c)}
              onOpenHistory={(id) => handleOpenEditHistory(id)}
              onSubmitReply={executeReplySubmission}
            />
          ))
        )}

        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="text-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchComments(page + 1, sortOption, true)}
              disabled={loadingMore}
              className="rounded-full px-6 py-2 text-xs font-bold gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading more...</span>
                </>
              ) : (
                <span>Load more comments</span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* --- MODAL 1: REPORT COMMENT DIALOG --- */}
      {reportingComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-800 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                  Report Comment
                </h3>
              </div>
              <button
                onClick={() => setReportingComment(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Help us keep the community safe. Reports flag comments for review by our moderation team.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Reason for report:
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full text-xs font-medium bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 focus:ring-1 focus:ring-red-600"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Additional Details (Optional):
                </label>
                <Textarea
                  placeholder="Describe why this comment violates community guidelines..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value.slice(0, 1000))}
                  className="text-xs min-h-[70px] rounded-xl dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReportingComment(null)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                className="rounded-full text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: DELETE CONFIRMATION --- */}
      {deletingCommentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-800 animate-in fade-in">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                Delete Comment?
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Are you sure you want to delete this comment? If this comment has threaded replies,
              they will be preserved with a deleted placeholder.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingCommentId(null)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-full text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: COMMENT EDIT HISTORY --- */}
      {historyCommentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-800 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                  Comment Edit History
                </h3>
              </div>
              <button
                onClick={() => setHistoryCommentId(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-gray-100 dark:divide-gray-800">
              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                  Loading edit revisions...
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No previous edits recorded for this comment.
                </div>
              ) : (
                historyLogs.map((log, idx) => (
                  <div key={idx} className="pt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Revision v{log.version}</span>
                      <span>{new Date(log.editedAt).toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 font-mono text-[11px] text-gray-800 dark:text-gray-200">
                      {log.previousText}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHistoryCommentId(null)}
                className="rounded-full text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: ANTI-SPAM CAPTCHA CHALLENGE --- */}
      {captchaModalOpen && captchaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                Security Check
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              To keep our platform spam-free, please solve this quick verification question:
            </p>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-center space-y-2">
              <p className="text-sm font-black text-amber-950 dark:text-amber-200">
                {captchaData.question}
              </p>
              <Input
                type="text"
                placeholder="Enter answer..."
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSolveCaptcha();
                }}
                className="text-center font-bold text-sm rounded-xl dark:bg-gray-900"
              />
              {captchaError && <p className="text-[11px] text-red-600 font-bold">{captchaError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCaptchaModalOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSolveCaptcha}
                disabled={!captchaAnswer.trim()}
                className="rounded-full text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Verify & Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: USER COMMENT & LANGUAGE PREFERENCES --- */}
      {isPrefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                  Comment & Language Settings
                </h3>
              </div>
              <button
                onClick={() => setIsPrefModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Preferred Translation Language */}
              <div>
                <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
                  Default Translation Target Language:
                </label>
                <select
                  value={userPreferredLang}
                  onChange={(e) => setUserPreferredLang(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 font-semibold focus:ring-1 focus:ring-blue-600"
                >
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name} ({code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Clicking "Translate" on any comment will translate it directly into this language.
                </p>
              </div>

              {/* Location Privacy Toggle */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    Display Location on Comments
                  </p>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Show your city & country tag on comments you post (when permitted).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={showLocationPref}
                  onChange={(e) => setShowLocationPref(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Notification Preferences */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  Comment Notification Preferences:
                </p>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.replies}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({ ...prev, replies: e.target.checked }))
                    }
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Notify me when someone replies to my comments
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.likes}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({ ...prev, likes: e.target.checked }))
                    }
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Notify me when someone likes my comment
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.mentions}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({ ...prev, mentions: e.target.checked }))
                    }
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Notify me when someone mentions me with @username
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPrefModalOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePreferences}
                className="rounded-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================================================
// INDIVIDUAL COMMENT CARD WITH NESTED REPLIES & ACTIONS
// ========================================================================

interface CommentCardProps {
  comment: CommentItem;
  currentUser: any;
  preferredLang: string;
  isReply?: boolean;
  parentId?: string;
  onToggleReaction: (
    id: string,
    type: "like" | "dislike",
    isReply?: boolean,
    parentId?: string
  ) => Promise<any>;
  onSaveEdit: (id: string, newText: string, version: number) => Promise<boolean | undefined>;
  onRequestDelete: (id: string) => void;
  onRequestReport: (c: CommentItem) => void;
  onOpenHistory: (id: string) => void;
  onSubmitReply: (payload: any, onComplete?: (r: CommentItem) => void) => void;
}

const CommentCard = ({
  comment,
  currentUser,
  preferredLang,
  isReply = false,
  parentId,
  onToggleReaction,
  onSaveEdit,
  onRequestDelete,
  onRequestReport,
  onOpenHistory,
  onSubmitReply,
}: CommentCardProps) => {
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.originalText || comment.commentbody || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Reaction State
  const [likes, setLikes] = useState(comment.likesCount || 0);
  const [dislikes, setDislikes] = useState(comment.dislikesCount || 0);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(comment.userReaction || null);

  // Translation State
  const [translation, setTranslation] = useState<TranslationState>({
    isLoading: false,
    isShown: false,
    error: null,
  });

  // Threaded Replies State
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Check ownership
  const isAuthor =
    currentUser &&
    String(comment.userId?._id || comment.userId || comment.userid) ===
      String(currentUser._id || currentUser.id);
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "moderator";

  // Check 15-minute edit limit
  const createdAtTime = new Date(comment.createdAt || comment.commentedon || Date.now()).getTime();
  const minutesSincePosting = (Date.now() - createdAtTime) / (60 * 1000);
  const canEdit = (isAuthor && minutesSincePosting <= 15) || isAdmin;

  // React to comment
  const handleReact = async (type: "like" | "dislike") => {
    const res = await onToggleReaction(comment._id, type, isReply, parentId);
    if (res) {
      setReaction(res.userReaction);
      setLikes(res.likesCount);
      setDislikes(res.dislikesCount);
    }
  };

  // Trigger Translation
  const handleTranslate = async () => {
    // If already translated, just toggle visibility
    if (translation.translatedText) {
      setTranslation((prev) => ({ ...prev, isShown: !prev.isShown, error: null }));
      return;
    }

    setTranslation((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await axiosInstance.post(`/api/comments/${comment._id}/translate`, {
        targetLanguage: preferredLang,
      });

      if (res.data?.success) {
        setTranslation({
          translatedText: res.data.translatedText,
          sourceLanguage: res.data.sourceLanguage,
          targetLanguage: res.data.targetLanguage,
          sourceLanguageName: res.data.sourceLanguageName,
          targetLanguageName: res.data.targetLanguageName,
          isLoading: false,
          isShown: true,
          error: null,
        });
      }
    } catch (err: any) {
      setTranslation((prev) => ({
        ...prev,
        isLoading: false,
        error: err.response?.data?.message || "Translation failed. Please retry.",
      }));
    }
  };

  // Save Edit
  const handleSave = async () => {
    if (!editText.trim()) return;
    setIsSavingEdit(true);
    const success = await onSaveEdit(comment._id, editText.trim(), comment.version);
    setIsSavingEdit(false);
    if (success) {
      setIsEditing(false);
    }
  };

  // Toggle Threaded Replies
  const handleToggleReplies = async () => {
    if (!showReplies && replies.length === 0) {
      setLoadingReplies(true);
      try {
        const res = await axiosInstance.get(`/api/comments/${comment._id}/replies`);
        if (Array.isArray(res.data)) {
          setReplies(res.data);
        }
      } catch (err) {
        toast.error("Failed to load replies");
      } finally {
        setLoadingReplies(false);
      }
    }
    setShowReplies((prev) => !prev);
  };

  // Send nested reply
  const handlePostReply = async () => {
    if (!currentUser) {
      toast.error("Please sign in to reply.");
      return;
    }
    if (!replyText.trim()) return;

    setIsSubmittingReply(true);
    const payload = {
      videoId: comment.videoId || comment.videoid,
      parentCommentId: comment._id,
      originalText: replyText.trim(),
      userId: currentUser._id || currentUser.id,
      usercommented: currentUser.name || "Anonymous",
    };

    onSubmitReply(payload, (newReply: CommentItem) => {
      setReplies((prev) => [...prev, newReply]);
      setReplyText("");
      setIsReplying(false);
      setShowReplies(true);
      setIsSubmittingReply(false);
    });
  };

  return (
    <div className={`flex gap-3 items-start group ${isReply ? "pt-2" : ""}`}>
      {/* Avatar */}
      <Avatar className={`${isReply ? "w-8 h-8" : "w-10 h-10"} border border-gray-200 shrink-0 mt-0.5`}>
        <AvatarImage src={comment.isDeleted ? "" : comment.userImage || ""} />
        <AvatarFallback className="bg-gray-100 text-gray-700 font-bold text-xs">
          {comment.isDeleted ? "?" : comment.usercommented?.[0] || "U"}
        </AvatarFallback>
      </Avatar>

      {/* Main Comment Content Area */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Author Line, Location, Timestamp, Edited Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-bold ${
                comment.isDeleted ? "text-gray-400 italic" : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {comment.usercommented}
            </span>

            {/* Location Badge (Section 2) */}
            {!comment.isDeleted && comment.userLocation && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40"
                title={`Commented from ${comment.userLocation}`}
              >
                <MapPin className="w-2.5 h-2.5" />
                <span>{comment.userLocation}</span>
              </span>
            )}

            {/* Relative Timestamp + Exact Date Hover (Section 2) */}
            <span
              className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
              title={new Date(comment.createdAt || comment.commentedon || Date.now()).toLocaleString()}
            >
              {formatCommentTime(comment.createdAt || comment.commentedon || Date.now())}
            </span>

            {/* Edited status */}
            {!comment.isDeleted && comment.isEdited && (
              <span
                onClick={() => onOpenHistory(comment._id)}
                className="text-[10px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline cursor-pointer"
                title="View edit history"
              >
                (edited)
              </span>
            )}
          </div>

          {/* Three-dot Action Menu (Section 2) */}
          {!comment.isDeleted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl">
                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => {
                      setIsEditing(true);
                      setEditText(comment.originalText || comment.commentbody || "");
                    }}
                    className="text-xs flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    <span>Edit comment</span>
                  </DropdownMenuItem>
                )}

                {(isAuthor || isAdmin) && (
                  <DropdownMenuItem
                    onClick={() => onRequestDelete(comment._id)}
                    className="text-xs flex items-center gap-2 cursor-pointer text-red-600 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Delete comment</span>
                  </DropdownMenuItem>
                )}

                {comment.isEdited && (
                  <DropdownMenuItem
                    onClick={() => onOpenHistory(comment._id)}
                    className="text-xs flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <History className="w-3.5 h-3.5 text-gray-500" />
                    <span>View edit history</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => onRequestReport(comment)}
                  className="text-xs flex items-center gap-2 cursor-pointer text-amber-700 dark:text-amber-400 font-medium"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Report comment</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Comment Text / Inline Editor */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, 2000))}
              disabled={isSavingEdit}
              className="min-h-[80px] rounded-xl text-xs dark:bg-gray-900"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-gray-400">{editText.length} / 2000</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="rounded-full text-xs h-7 px-3"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!editText.trim() || isSavingEdit}
                  className="rounded-full text-xs h-7 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {isSavingEdit ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            {comment.isDeleted ? (
              <p className="text-gray-400 dark:text-gray-500 italic text-xs">
                This comment has been deleted.
              </p>
            ) : (
              renderFormattedText(comment.originalText || comment.commentbody || "")
            )}
          </div>
        )}

        {/* Translation Block (Section 3) */}
        {!comment.isDeleted && translation.isShown && translation.translatedText && (
          <div className="mt-2 p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 rounded-2xl space-y-1.5 text-xs text-blue-950 dark:text-blue-100 animate-in fade-in">
            <div className="flex items-center justify-between text-[10px] text-blue-700 dark:text-blue-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" />
                <span>
                  Translated from {translation.sourceLanguageName || translation.sourceLanguage} to{" "}
                  {translation.targetLanguageName || translation.targetLanguage}
                </span>
              </span>
              <button
                onClick={() => setTranslation((prev) => ({ ...prev, isShown: false }))}
                className="underline hover:text-blue-900 dark:hover:text-white"
              >
                Hide
              </button>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap font-medium">
              {translation.translatedText}
            </p>
          </div>
        )}

        {/* Translation Error / Retry (Section 3) */}
        {translation.error && (
          <div className="mt-1 flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-xl border border-red-200 dark:border-red-900/60">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{translation.error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTranslate}
              className="rounded-full text-[10px] h-6 px-2.5 text-red-700 border-red-300 font-bold"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Action Buttons Row: Like, Dislike, Reply, Translate */}
        {!comment.isDeleted && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5 text-xs text-gray-500">
            {/* Like Button */}
            <button
              onClick={() => handleReact("like")}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                reaction === "like" ? "text-blue-600 font-bold" : "text-gray-600 dark:text-gray-400"
              }`}
              title="Like comment"
            >
              <ThumbsUp
                className={`w-3.5 h-3.5 ${reaction === "like" ? "fill-blue-600 text-blue-600" : ""}`}
              />
              <span className="text-[11px]">{likes > 0 ? likes : ""}</span>
            </button>

            {/* Dislike Button */}
            <button
              onClick={() => handleReact("dislike")}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                reaction === "dislike" ? "text-red-600 font-bold" : "text-gray-600 dark:text-gray-400"
              }`}
              title="Dislike comment"
            >
              <ThumbsDown
                className={`w-3.5 h-3.5 ${reaction === "dislike" ? "fill-red-600 text-red-600" : ""}`}
              />
              <span className="text-[11px]">{dislikes > 0 ? dislikes : ""}</span>
            </button>

            {/* Reply Button */}
            {!isReply && (
              <button
                onClick={() => setIsReplying((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[11px] font-semibold text-gray-700 dark:text-gray-300"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}

            {/* Translate Button */}
            <button
              onClick={handleTranslate}
              disabled={translation.isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[11px] font-semibold text-blue-600 dark:text-blue-400"
            >
              {translation.isLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : translation.isShown ? (
                <>
                  <Languages className="w-3 h-3" />
                  <span>Show original</span>
                </>
              ) : (
                <>
                  <Languages className="w-3 h-3" />
                  <span>Translate</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Nested Reply Form */}
        {isReplying && (
          <div className="pt-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex gap-2.5">
              <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                <AvatarImage src={currentUser?.image || ""} />
                <AvatarFallback className="text-[10px] font-bold">
                  {currentUser?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1.5">
                <Textarea
                  placeholder={`Replying to @${comment.usercommented}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value.slice(0, 2000))}
                  className="min-h-[64px] rounded-xl text-xs dark:bg-gray-900"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] text-gray-400">{replyText.length} / 2000</span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsReplying(false);
                        setReplyText("");
                      }}
                      className="rounded-full text-xs h-7 px-3"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePostReply}
                      disabled={!replyText.trim() || isSubmittingReply}
                      className="rounded-full text-xs h-7 px-4 bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      {isSubmittingReply ? "Replying..." : "Reply"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Threaded Replies Accordion (Section 1 & 4) */}
        {!isReply && (comment.repliesCount > 0 || replies.length > 0) && (
          <div className="pt-1">
            <button
              onClick={handleToggleReplies}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline py-1"
            >
              {showReplies ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Hide {replies.length || comment.repliesCount} replies</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>
                    Show {replies.length > 0 ? replies.length : comment.repliesCount} replies
                  </span>
                </>
              )}
            </button>

            {/* Expanded Replies Tree */}
            {showReplies && (
              <div className="mt-2 pl-3 sm:pl-4 border-l-2 border-gray-200 dark:border-gray-800 space-y-4">
                {loadingReplies ? (
                  <div className="py-2 text-xs text-gray-400 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading replies...</span>
                  </div>
                ) : (
                  replies.map((reply) => (
                    <CommentCard
                      key={reply._id}
                      comment={reply}
                      currentUser={currentUser}
                      preferredLang={preferredLang}
                      isReply={true}
                      parentId={comment._id}
                      onToggleReaction={onToggleReaction}
                      onSaveEdit={onSaveEdit}
                      onRequestDelete={onRequestDelete}
                      onRequestReport={onRequestReport}
                      onOpenHistory={onOpenHistory}
                      onSubmitReply={onSubmitReply}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments;
