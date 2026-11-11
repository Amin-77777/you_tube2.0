import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Key,
  LogOut,
  Trash2,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { useTheme, ThemePreference } from "@/lib/ThemeContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SecurityDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { themePreference, effectiveTheme, setThemePreference, istTimeString } = useTheme();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "sessions" | "devices">("overview");

  // Overview Data
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);

  // Login History State
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState("All");
  const [deviceFilter, setDeviceFilter] = useState("All");
  const [ipSearch, setIpSearch] = useState("");
  const [selectedEventDetail, setSelectedEventDetail] = useState<any>(null);

  // Active Sessions State
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionToRevoke, setSessionToRevoke] = useState<any>(null);
  const [revokeAllOthersModal, setRevokeAllOthersModal] = useState(false);

  // Trusted Devices State
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
  const [deviceToRevoke, setDeviceToRevoke] = useState<any>(null);
  const [revokeAllDevicesModal, setRevokeAllDevicesModal] = useState(false);

  // Check auth
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token && !user) {
      router.push("/signin?redirect=/security");
    }
  }, [user, router]);

  // Fetch Overview
  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const res = await axiosInstance.get("/security/overview");
      setOverview(res.data);
    } catch (err: any) {
      toast.error("Failed to load security overview");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // Fetch Login History
  const fetchLoginHistory = useCallback(
    async (page = 1) => {
      try {
        setHistoryLoading(true);
        const params: any = { page, limit: 10 };
        if (statusFilter !== "All") params.status = statusFilter;
        if (deviceFilter !== "All") params.deviceType = deviceFilter;
        if (ipSearch.trim()) params.ip = ipSearch.trim();

        const res = await axiosInstance.get("/security/login-history", { params });
        setHistoryEvents(res.data.events || []);
        setHistoryPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
        setHistoryPage(page);
      } catch (err) {
        toast.error("Failed to load login history");
      } finally {
        setHistoryLoading(false);
      }
    },
    [statusFilter, deviceFilter, ipSearch]
  );

  // Fetch Active Sessions
  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await axiosInstance.get("/security/sessions");
      setSessions(res.data || []);
    } catch (err) {
      toast.error("Failed to load active sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Fetch Trusted Devices
  const fetchTrustedDevices = useCallback(async () => {
    try {
      setDevicesLoading(true);
      const res = await axiosInstance.get("/security/trusted-devices");
      setTrustedDevices(res.data || []);
    } catch (err) {
      toast.error("Failed to load trusted devices");
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === "history") fetchLoginHistory(1);
    if (activeTab === "sessions") fetchSessions();
    if (activeTab === "devices") fetchTrustedDevices();
  }, [activeTab, fetchLoginHistory, fetchSessions, fetchTrustedDevices]);

  // Revoke Session Handler
  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return;
    try {
      await axiosInstance.delete(`/security/sessions/${sessionToRevoke._id || sessionToRevoke.jwtId}`);
      toast.success("Session revoked successfully");
      setSessionToRevoke(null);
      fetchSessions();
      fetchOverview();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke session");
    }
  };

  // Revoke All Other Sessions
  const handleRevokeAllOtherSessions = async () => {
    try {
      const res = await axiosInstance.post("/security/sessions/revoke-others");
      toast.success(res.data?.message || "All other sessions revoked");
      setRevokeAllOthersModal(false);
      fetchSessions();
      fetchOverview();
    } catch (err: any) {
      toast.error("Failed to revoke other sessions");
    }
  };

  // Revoke Trusted Device Handler
  const handleRevokeDevice = async () => {
    if (!deviceToRevoke) return;
    try {
      await axiosInstance.delete(`/security/trusted-devices/${deviceToRevoke._id}`);
      toast.success("Trusted device revoked");
      setDeviceToRevoke(null);
      fetchTrustedDevices();
      fetchOverview();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke device");
    }
  };

  // Revoke All Trusted Devices
  const handleRevokeAllDevices = async () => {
    try {
      const res = await axiosInstance.post("/security/trusted-devices/revoke-all");
      toast.success(res.data?.message || "All trusted devices revoked");
      setRevokeAllDevicesModal(false);
      fetchTrustedDevices();
      fetchOverview();
    } catch (err) {
      toast.error("Failed to revoke trusted devices");
    }
  };

  // Helper device icon
  const getDeviceIcon = (type = "") => {
    const t = (type || "").toLowerCase();
    if (t === "mobile") return <Smartphone className="w-4 h-4 text-blue-500" />;
    if (t === "tablet") return <Tablet className="w-4 h-4 text-purple-500" />;
    return <Laptop className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />;
  };

  // Helper status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Success":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle className="w-3 h-3" />
            Success
          </span>
        );
      case "OTP Required":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Key className="w-3 h-3" />
            OTP Challenge
          </span>
        );
      case "OTP Failed":
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
      case "Blocked":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-300">
            <AlertTriangle className="w-3 h-3" />
            Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 min-h-[85vh]">
      <Head>
        <title>Account Security & Theme Settings - YouTube 2.0</title>
      </Head>

      {/* Header Banner */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-start sm:items-center gap-4">
          <div className="p-3.5 bg-red-600/10 text-red-600 dark:bg-red-950/50 dark:text-red-400 rounded-2xl shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Account Security & Theme
              </h1>
              {overview && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    overview.status === "Secure"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {overview.status}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Manage automatic IST theme selection, review login history, active sessions, and trusted devices.
            </p>
          </div>
        </div>

        {/* Live IST clock badge */}
        <div className="bg-muted/50 border border-border/80 px-4 py-2.5 rounded-2xl shrink-0 self-start md:self-auto text-xs">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mb-0.5">
            <Clock className="w-3.5 h-3.5 text-red-600" />
            <span>Official Indian Standard Time (IST)</span>
          </div>
          <span className="font-bold text-foreground tracking-tight">{istTimeString || "Syncing..."}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "overview", label: "Security Overview", icon: ShieldCheck },
          { id: "history", label: "Login History", icon: Clock },
          { id: "sessions", label: "Active Sessions", icon: Laptop },
          { id: "devices", label: "Trusted Devices", icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Theme Personalization Card */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Automatic Theme Management (IST Timezone)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  According to your location rules: <strong>Light Theme</strong> applies from 5:00 AM through 11:59 AM IST, and <strong>Dark Theme</strong> applies from 12:00 PM through 4:59 AM IST.
                </p>
              </div>

              {/* Effective theme indicator */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted border border-border text-xs font-semibold text-foreground shrink-0">
                <span>Active Theme:</span>
                <span className="capitalize text-red-600 dark:text-red-400 font-bold">{effectiveTheme}</span>
              </div>
            </div>

            {/* Theme Preference Radio Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "auto",
                  label: "Auto (IST Scheduled)",
                  desc: "Light: 5 AM - 12 PM | Dark: 12 PM - 5 AM",
                  icon: Sparkles,
                },
                {
                  id: "light",
                  label: "Always Light",
                  desc: "Bright display mode permanently active",
                  icon: Sun,
                },
                {
                  id: "dark",
                  label: "Always Dark",
                  desc: "Dim display mode permanently active",
                  icon: Moon,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = themePreference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThemePreference(opt.id as ThemePreference)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "border-red-600 bg-red-600/5 ring-2 ring-red-600/20"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-xl ${
                            isSelected
                              ? "bg-red-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{opt.label}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-red-600 bg-red-600" : "border-muted-foreground"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Security Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Active Sessions</span>
              <div className="text-2xl font-black text-foreground">
                {overview?.activeSessionsCount ?? 1}
              </div>
              <span className="text-[11px] text-muted-foreground block">Devices signed in right now</span>
            </div>

            <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Trusted Devices</span>
              <div className="text-2xl font-black text-foreground">
                {overview?.trustedDevicesCount ?? 0}
              </div>
              <span className="text-[11px] text-muted-foreground block">Devices bypassing OTP for 30d</span>
            </div>

            <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Failed Attempts (24h)</span>
              <div
                className={`text-2xl font-black ${
                  (overview?.recentFailedAttemptsCount || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {overview?.recentFailedAttemptsCount ?? 0}
              </div>
              <span className="text-[11px] text-muted-foreground block">
                {(overview?.recentFailedAttemptsCount || 0) === 0 ? "Zero suspicious activity" : "Unsuccessful logins"}
              </span>
            </div>

            <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Last Login Location</span>
              <div className="text-sm font-bold text-foreground truncate">
                {overview?.lastLoginLocation || "Unknown"}
              </div>
              <span className="text-[11px] text-muted-foreground block truncate">
                IP: {overview?.lastLoginIp || "N/A"}
              </span>
            </div>
          </div>

          {/* Recent Security Notices */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Recent Security Events</h3>
              <button
                onClick={() => setActiveTab("history")}
                className="text-xs text-red-600 font-semibold hover:underline"
              >
                View Full History →
              </button>
            </div>

            {overview?.alerts?.length > 0 ? (
              <div className="divide-y divide-border/60">
                {overview.alerts.map((al: any) => (
                  <div key={al._id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          al.severity === "success"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : al.severity === "warning"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {al.severity === "success" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : al.severity === "warning" ? (
                          <Key className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block">{al.title}</span>
                        <span className="text-[11px] text-muted-foreground block">
                          {al.device} • {al.location} • IP: {al.ip}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium shrink-0">
                      {al.timeIST}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No recent security alerts recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LOGIN HISTORY */}
      {activeTab === "history" && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Detailed Login History</h2>
              <p className="text-xs text-muted-foreground">
                Comprehensive record of every authenticated session and verification attempt with IST timestamps.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLoginHistory(historyPage)}
              className="rounded-full text-xs self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-3 rounded-2xl border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-card border border-border rounded-xl px-2.5 py-1.5 outline-none font-medium text-foreground"
              >
                <option value="All">All Statuses</option>
                <option value="Success">Success</option>
                <option value="OTP Required">OTP Required</option>
                <option value="OTP Failed">OTP Failed</option>
                <option value="Failed">Failed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Device:</span>
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="text-xs bg-card border border-border rounded-xl px-2.5 py-1.5 outline-none font-medium text-foreground"
              >
                <option value="All">All Devices</option>
                <option value="Desktop">Desktop</option>
                <option value="Mobile">Mobile</option>
                <option value="Tablet">Tablet</option>
              </select>
            </div>

            <div className="flex-1 min-w-[160px] relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by IP address"
                value={ipSearch}
                onChange={(e) => setIpSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-card"
              />
            </div>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto border border-border rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-muted-foreground border-b border-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date & Time (IST)</th>
                  <th className="py-3 px-4 font-semibold">Device & Browser</th>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Trust Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {historyLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading login activity records...
                    </td>
                  </tr>
                ) : historyEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No login events match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  historyEvents.map((evt) => (
                    <tr key={evt._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                        {evt.displayTimeIST}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(evt.device?.type)}
                          <span className="font-semibold text-foreground">
                            {evt.browser?.name || "Unknown"}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            on {evt.os?.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-foreground">
                        {evt.ip}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {evt.location?.city ? `${evt.location.city}, ${evt.location.country}` : "Unknown"}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(evt.status)}</td>
                      <td className="py-3 px-4">
                        {evt.isTrusted ? (
                          <span className="text-emerald-600 font-semibold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Trusted
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Untrusted</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEventDetail(evt)}
                          className="h-7 text-xs px-2.5 font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>
              Showing page <strong>{historyPagination.page}</strong> of{" "}
              <strong>{historyPagination.totalPages}</strong> ({historyPagination.total} total records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage <= 1 || historyLoading}
                onClick={() => fetchLoginHistory(historyPage - 1)}
                className="h-8 px-3 rounded-lg text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage >= historyPagination.totalPages || historyLoading}
                onClick={() => fetchLoginHistory(historyPage + 1)}
                className="h-8 px-3 rounded-lg text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE SESSIONS */}
      {activeTab === "sessions" && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Active Sessions</h2>
              <p className="text-xs text-muted-foreground">
                Devices currently signed into your account. Revoking a session immediately terminates access on that device.
              </p>
            </div>

            {sessions.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRevokeAllOthersModal(true)}
                className="rounded-full text-xs font-semibold self-start sm:self-auto"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Log Out All Other Sessions
              </Button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading active sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">No active sessions found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((sess) => (
                <div
                  key={sess._id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    sess.isCurrent
                      ? "border-red-600/50 bg-red-600/5 ring-1 ring-red-600/20"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-muted shrink-0">
                        {getDeviceIcon(sess.deviceType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {sess.deviceName || sess.browser?.name || "Web Browser"}
                          </span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase tracking-wider">
                              This Device
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground block">
                          {sess.browser?.name} on {sess.os?.name || "Unknown OS"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground pt-2 border-t border-border/60">
                    <div className="flex justify-between">
                      <span>IP Address:</span>
                      <strong className="text-foreground font-mono">{sess.ip}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Approximate Location:</span>
                      <strong className="text-foreground">
                        {sess.location?.city ? `${sess.location.city}, ${sess.location.country}` : "Unknown"}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Active:</span>
                      <strong className="text-foreground">{sess.lastActivityAtIST || "Just now"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Session Expires:</span>
                      <span className="text-foreground">{sess.expiresAtIST}</span>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSessionToRevoke(sess)}
                      className="w-full text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1.5" />
                      Revoke Access
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TRUSTED DEVICES */}
      {activeTab === "devices" && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Trusted Devices</h2>
              <p className="text-xs text-muted-foreground">
                Browsers registered to bypass repeated two-factor security challenges for up to 30 days.
              </p>
            </div>

            {trustedDevices.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRevokeAllDevicesModal(true)}
                className="rounded-full text-xs font-semibold self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Revoke All Trusted Devices
              </Button>
            )}
          </div>

          {devicesLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading trusted devices...</div>
          ) : trustedDevices.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Key className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p>You have no trusted devices registered.</p>
              <p className="text-[11px] text-muted-foreground">
                Check &quot;Trust this device for 30 days&quot; next time you complete an OTP challenge.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trustedDevices.map((dev) => (
                <div
                  key={dev._id}
                  className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground block">
                        {dev.deviceName || "Trusted Browser"}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {dev.browser?.name} on {dev.os?.name || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground pt-2 border-t border-border/60">
                    <div className="flex justify-between">
                      <span>Registered On:</span>
                      <strong className="text-foreground">{dev.createdAtIST}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Trust Expires:</span>
                      <strong className="text-foreground text-amber-600 dark:text-amber-400">
                        {dev.expiresAtIST}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Used:</span>
                      <strong className="text-foreground">{dev.lastUsedAtIST}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Seen Location:</span>
                      <span className="text-foreground">
                        {dev.location?.city ? `${dev.location.city}, ${dev.location.country}` : "Unknown"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeviceToRevoke(dev)}
                    className="w-full text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Remove Device
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION DIALOG: REVOKE SINGLE SESSION */}
      <Dialog open={!!sessionToRevoke} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Revoke Device Session?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will immediately sign out <strong>{sessionToRevoke?.deviceName}</strong> (IP:{" "}
              {sessionToRevoke?.ip}). The user will have to authenticate again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setSessionToRevoke(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRevokeSession}>
              Revoke Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: REVOKE ALL OTHER SESSIONS */}
      <Dialog open={revokeAllOthersModal} onOpenChange={setRevokeAllOthersModal}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Log Out of All Other Sessions?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to invalidate all other active sessions? Your current session on this device will remain active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setRevokeAllOthersModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRevokeAllOtherSessions}>
              Log Out All Others
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: REVOKE SINGLE TRUSTED DEVICE */}
      <Dialog open={!!deviceToRevoke} onOpenChange={(open) => !open && setDeviceToRevoke(null)}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Remove Trusted Device?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Future logins from <strong>{deviceToRevoke?.deviceName}</strong> will require two-factor OTP verification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setDeviceToRevoke(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRevokeDevice}>
              Remove Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: REVOKE ALL TRUSTED DEVICES */}
      <Dialog open={revokeAllDevicesModal} onOpenChange={setRevokeAllDevicesModal}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Revoke All Trusted Devices?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will revoke trust for all {trustedDevices.length} registered devices. Every device will require fresh OTP verification on their next sign-in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setRevokeAllDevicesModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRevokeAllDevices}>
              Revoke All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: SINGLE LOGIN EVENT DETAIL */}
      <Dialog open={!!selectedEventDetail} onOpenChange={(open) => !open && setSelectedEventDetail(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              <span>Login Attempt Metadata</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detailed event audit log for security compliance.
            </DialogDescription>
          </DialogHeader>

          {selectedEventDetail && (
            <div className="space-y-3 text-xs divide-y divide-border/60 py-2">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Event Status:</span>
                <div>{getStatusBadge(selectedEventDetail.status)}</div>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Timestamp (IST):</span>
                <strong className="text-foreground">{selectedEventDetail.displayTimeIST}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Public IP:</span>
                <strong className="text-foreground font-mono">{selectedEventDetail.ip}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">IP Classification:</span>
                <strong className="text-foreground">{selectedEventDetail.ipClassification || "IPv4"}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Approximate Location:</span>
                <strong className="text-foreground">
                  {selectedEventDetail.location?.city
                    ? `${selectedEventDetail.location.city}, ${selectedEventDetail.location.region}, ${selectedEventDetail.location.country}`
                    : "Unknown"}
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Browser:</span>
                <strong className="text-foreground">
                  {selectedEventDetail.browser?.name} {selectedEventDetail.browser?.version}
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Operating System:</span>
                <strong className="text-foreground">
                  {selectedEventDetail.os?.name} {selectedEventDetail.os?.version}
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Device Type:</span>
                <strong className="text-foreground">{selectedEventDetail.device?.type || "Desktop"}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Trusted Device:</span>
                <strong className={selectedEventDetail.isTrusted ? "text-emerald-600" : "text-muted-foreground"}>
                  {selectedEventDetail.isTrusted ? "Yes (Trusted)" : "No (Untrusted)"}
                </strong>
              </div>
              {selectedEventDetail.riskIndicators?.length > 0 && (
                <div className="py-1">
                  <span className="text-muted-foreground block mb-1">Risk Signals Detected:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedEventDetail.riskIndicators.map((sig: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[10px] font-mono"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setSelectedEventDetail(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
