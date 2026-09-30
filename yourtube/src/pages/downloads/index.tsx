import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { format } from "date-fns";
import {
  Download,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Film,
  Zap,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuotaCard from "@/components/QuotaCard";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/backendUrl";

export default function DownloadsPage() {
  const { user } = useUser();
  const [quota, setQuota] = useState<any>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("desc");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch Quota
  const fetchQuota = async () => {
    if (!user) {
      setQuotaLoading(false);
      return;
    }
    try {
      setQuotaLoading(true);
      const res = await axiosInstance.get("/download/quota");
      setQuota(res.data);
    } catch (err: any) {
      console.warn("Could not fetch quota:", err.message);
    } finally {
      setQuotaLoading(false);
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    if (!user) {
      setHistoryLoading(false);
      return;
    }
    try {
      setHistoryLoading(true);
      const params: any = {
        page,
        limit: 8,
        sort: sortBy,
      };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await axiosInstance.get("/download/history", { params });
      setHistory(res.data.records || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to load download history:", err);
      toast.error("Failed to load download history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [user, page, statusFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  // Handle Retry for failed download
  const handleRetry = async (downloadId: string) => {
    try {
      setActionLoadingId(downloadId);
      const res = await axiosInstance.post(`/download/retry/${downloadId}`);
      if (res.data.authorized && res.data.downloadUrl) {
        toast.success("Retry authorized! Starting download...");
        const fullUrl = `${getBackendUrl()}${res.data.downloadUrl}`;
        const link = document.createElement("a");
        link.href = fullUrl;
        link.setAttribute("download", "");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          fetchHistory();
          fetchQuota();
        }, 1500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to retry download";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Download Again (Re-authorization)
  const handleDownloadAgain = async (videoId: string, downloadId: string) => {
    try {
      setActionLoadingId(downloadId);
      const res = await axiosInstance.post(`/download/authorize/${videoId}`);
      if (res.data.authorized && res.data.downloadUrl) {
        if (res.data.isDuplicate) {
          toast.info("Duplicate download within window: No quota consumed!");
        } else {
          toast.success("Download started! Remaining today: " + res.data.quota?.remaining);
        }

        const fullUrl = `${getBackendUrl()}${res.data.downloadUrl}`;
        const link = document.createElement("a");
        link.href = fullUrl;
        link.setAttribute("download", "");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          fetchHistory();
          fetchQuota();
        }, 1500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Download request failed";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case "STARTED":
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            In Progress
          </span>
        );
      case "FAILED":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            <Clock className="w-3.5 h-3.5" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getPlanBadge = (plan: string) => {
    const map: Record<string, string> = {
      Free: "bg-gray-100 text-gray-700 border-gray-200",
      Bronze: "bg-amber-100 text-amber-800 border-amber-300",
      Silver: "bg-slate-200 text-slate-800 border-slate-300",
      Gold: "bg-yellow-100 text-yellow-800 border-yellow-400",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[plan] || map.Free}`}>
        {plan}
      </span>
    );
  };

  if (!user) {
    return (
      <main className="flex-1 p-6 md:p-10 max-w-5xl">
        <Head>
          <title>Downloads - YourTube</title>
        </Head>
        <div className="bg-white border rounded-2xl p-10 text-center shadow-sm max-w-lg mx-auto mt-12">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view Downloads</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sign in with your account to track your daily download quota and download videos for offline viewing.
          </p>
          <Link href="/signin?redirect=/downloads">
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6 font-semibold shadow-sm">
              Sign In to YourTube
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Head>
        <title>Downloads & Quota - YourTube</title>
      </Head>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Download className="w-7 h-7 text-red-600" />
            Downloads & Offline Media
          </h1>
          <p className="text-sm text-gray-500">
            Manage your downloaded videos, track quota usage, and retry offline requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchQuota();
              fetchHistory();
            }}
            className="flex items-center gap-1.5 rounded-full text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Link href="/subscriptions">
            <Button size="sm" variant="secondary" className="rounded-full text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Manage Subscription
            </Button>
          </Link>
        </div>
      </div>

      {/* Quota Dashboard Card */}
      <QuotaCard quota={quota} loading={quotaLoading} />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {["ALL", "COMPLETED", "IN_PROGRESS", "FAILED"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                  statusFilter === status
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status === "ALL" ? "All Records" : status.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-72">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search downloads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-full bg-gray-50 focus-visible:ring-1"
              />
            </div>
            <Button type="submit" size="sm" variant="ghost" className="h-9 px-3 rounded-full text-xs">
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Downloads List */}
      {historyLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
          <Film className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No downloads found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            {statusFilter !== "ALL" || searchQuery
              ? "No download records matched your filter criteria."
              : "You haven't downloaded any videos yet. Browse videos and hit Download to save them offline."}
          </p>
          <Link href="/">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 text-xs font-semibold">
              Browse Videos
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((record) => {
            const video = record.videoId;
            const createdAt = new Date(record.createdAt);
            const formattedDate = !isNaN(createdAt.getTime())
              ? format(createdAt, "dd MMM yyyy, h:mm a")
              : "Unknown date";
            const isLoading = actionLoadingId === record._id;

            return (
              <div
                key={record._id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Thumbnail */}
                  <div className="relative w-28 sm:w-36 aspect-video bg-gray-100 rounded-lg overflow-hidden shrink-0 border">
                    <img
                      src={video?.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400"}
                      alt={video?.videotitle || "Video thumbnail"}
                      className="w-full h-full object-cover"
                    />
                    {video?.duration && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {video.duration}
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <Link
                      href={video?._id ? `/watch/${video._id}` : "#"}
                      className="text-sm font-bold text-gray-900 hover:text-red-600 line-clamp-1 transition-colors"
                    >
                      {video?.videotitle || "Untitled Video"}
                    </Link>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{video?.videochanel || "Channel"}</span>
                      <span>•</span>
                      <span>{formattedDate}</span>
                      <span>•</span>
                      <span>{record.fileSize || video?.filesize || "Unknown size"}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {getStatusBadge(record.status)}
                      <span className="text-xs text-gray-400">Plan:</span>
                      {getPlanBadge(record.subscriptionPlan || "Free")}
                      {record.isDuplicate && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                          Duplicate (No Quota)
                        </span>
                      )}
                      {record.failureReason && (
                        <span className="text-[11px] text-red-600 font-medium">
                          Reason: {record.failureReason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {record.status === "FAILED" || record.status === "CANCELLED" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleRetry(record._id)}
                      className="rounded-full text-xs font-semibold border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                      Retry
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isLoading || !video?._id}
                      onClick={() => handleDownloadAgain(video?._id, record._id)}
                      className="rounded-full text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800"
                    >
                      <Download className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                      Download Again
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="text-xs rounded-full px-4"
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="text-xs rounded-full px-4"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
