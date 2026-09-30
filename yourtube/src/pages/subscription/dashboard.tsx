import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  Crown,
  Zap,
  Shield,
  Clock,
  Download,
  Calendar,
  CreditCard,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Tv,
  Eye,
  Sliders,
  FileText,
  BadgeAlert,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SubscriptionDashboard() {
  const router = useRouter();
  const { user } = useUser();

  const [sub, setSub] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Action States
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [currentRes, billingRes, quotaRes] = await Promise.all([
        axiosInstance.get("/subscription/current"),
        axiosInstance.get("/subscription/billing-history"),
        axiosInstance.get("/download/quota"),
      ]);

      if (currentRes.data.subscription) {
        setSub(currentRes.data.subscription);
      }
      if (billingRes.data.invoices) {
        setInvoices(billingRes.data.invoices);
      }
      if (quotaRes.data) {
        setQuota(quotaRes.data);
      }
    } catch (err: any) {
      console.warn("Error fetching dashboard data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/signin?redirect=/subscription/dashboard");
      return;
    }
    fetchDashboardData();
  }, [user]);

  // Auto-renew toggle handler
  const handleToggleAutoRenew = async () => {
    if (!sub || sub.plan === "Free") return;

    try {
      setTogglingAutoRenew(true);
      const newStatus = !sub.autoRenew;

      if (!newStatus) {
        // Turning auto-renew off: calls cancel with immediate: false
        await axiosInstance.post("/subscription/cancel", { immediate: false });
        toast.info("Auto-renew disabled. Your access remains active until the end of this billing cycle.");
      } else {
        // Re-enable auto-renew
        await axiosInstance.post("/subscription/upgrade", {
          plan: sub.plan,
          duration: sub.duration || "monthly",
        });
        toast.success("Auto-renew re-enabled for your plan.");
      }

      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update auto-renew setting.");
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  // Cancel subscription handler
  const handleConfirmCancel = async (immediate: boolean) => {
    try {
      setCancelling(true);
      const res = await axiosInstance.post("/subscription/cancel", { immediate });
      toast.success(res.data.message || "Subscription updated.");
      setShowCancelModal(false);
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  // Printable Invoice Trigger
  const handlePrintInvoice = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Calculate validity countdown
  const getValidityCountdown = () => {
    if (!sub?.expiryDate) return null;
    const now = new Date().getTime();
    const expiry = new Date(sub.expiryDate).getTime();
    const diff = expiry - now;

    if (diff <= 0) {
      return { expired: true, text: "Expired" };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return {
      expired: false,
      days,
      hours,
      text: `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"} remaining`,
    };
  };

  const countdown = getValidityCountdown();
  const planName = sub?.plan || "Free";
  const isPaidPlan = planName !== "Free";

  const TierIcon =
    planName === "Gold" ? Crown : planName === "Silver" ? Shield : planName === "Bronze" ? Zap : Shield;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium text-sm">Loading your subscription dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50/60 p-4 md:p-8">
      <Head>
        <title>Subscription Dashboard - YourTube</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-2.5">
            <Link href="/subscriptions">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-bold border-gray-300 hover:bg-gray-100"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Browse All Plans
              </Button>
            </Link>

            <Link href="/downloads">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              >
                <Download className="w-3.5 h-3.5" />
                My Downloads
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Subscription & Billing Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Monitor your tier entitlements, active validity countdown, auto-renewal preferences, and printable invoices.
          </p>
        </div>

        {/* 1. Active Tier Status Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${
                  planName === "Gold"
                    ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-black"
                    : planName === "Silver"
                    ? "bg-gradient-to-tr from-slate-200 to-slate-400 text-slate-900"
                    : planName === "Bronze"
                    ? "bg-gradient-to-tr from-amber-700 to-amber-500 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                <TierIcon className="w-7 h-7" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-gray-900">{planName} Plan</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      sub?.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {sub?.status || "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Billing Cycle: <strong className="capitalize">{sub?.duration || "Monthly"}</strong>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link href="/subscriptions">
                <Button className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm">
                  Change / Upgrade Plan
                </Button>
              </Link>

              {isPaidPlan && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-full text-xs font-semibold text-gray-600 hover:text-red-600 border-gray-300"
                >
                  Cancel Plan
                </Button>
              )}
            </div>
          </div>

          {/* Details Grid: Countdown & Auto-Renew */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Validity Countdown */}
            <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
                <Clock className="w-4 h-4 text-red-600" />
                <span>Validity Countdown</span>
              </div>

              {countdown ? (
                <div>
                  <p className="text-lg font-black text-gray-900">{countdown.text}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Expires on: {new Date(sub.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-black text-gray-900">Always Active</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Standard free tier has no expiration.</p>
                </div>
              )}
            </div>

            {/* Auto-Renewal Status & Toggle */}
            <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-gray-700" />
                  <span>Auto-Renewal</span>
                </div>
                {isPaidPlan && (
                  <button
                    type="button"
                    disabled={togglingAutoRenew}
                    onClick={handleToggleAutoRenew}
                    className="text-gray-700 hover:text-gray-900 transition-colors"
                    title={sub?.autoRenew ? "Disable Auto-Renew" : "Enable Auto-Renew"}
                  >
                    {sub?.autoRenew ? (
                      <ToggleRight className="w-7 h-7 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-gray-400" />
                    )}
                  </button>
                )}
              </div>

              <div>
                <p className="text-lg font-black text-gray-900">
                  {isPaidPlan ? (sub?.autoRenew ? "Auto-Renew Active" : "Auto-Renew Off") : "N/A"}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {isPaidPlan
                    ? sub?.autoRenew
                      ? "Automatically renews at end of period via Razorpay."
                      : "Access continues until expiry date without recharging."
                    : "Free tier does not charge any renewal fees."}
                </p>
              </div>
            </div>

            {/* Scheduled Downgrade Info */}
            <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Next Scheduled Transition</span>
              </div>

              <div>
                <p className="text-lg font-black text-gray-900">
                  {sub?.scheduledDowngrade
                    ? `Downgrade to ${sub.scheduledDowngrade.targetPlan}`
                    : sub?.autoRenew
                    ? `Renew ${planName}`
                    : "Transition to Free"}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {sub?.expiryDate
                    ? `Effective on: ${new Date(sub.expiryDate).toLocaleDateString()}`
                    : "Account remains on Free tier."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Tier Entitlements & Daily Quotas */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900">Your Plan Entitlements</h2>
            <p className="text-xs text-gray-500">
              Quotas and limits reset automatically every midnight UTC.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Daily Downloads */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Daily Downloads
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-red-600">
                  {quota?.remaining ?? sub?.dailyDownloadLimit ?? 1}
                </span>
                <span className="text-xs text-gray-500">
                  / {sub?.dailyDownloadLimit || 1} left today
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Tokens valid 15m; 60m duplicate window.</p>
            </div>

            {/* Daily Watch Time */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Daily Watch Allowance
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-900">
                  {sub?.dailyWatchLimitMinutes >= 9999 ? "Unlimited" : `${sub?.dailyWatchLimitMinutes || 30}m`}
                </span>
                {sub?.dailyWatchLimitMinutes < 9999 && (
                  <span className="text-xs text-gray-500">
                    ({sub?.dailyWatchTimeUsed || 0}m used)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                {sub?.dailyWatchLimitMinutes >= 9999
                  ? "Enjoy uninterrupted streaming."
                  : "Upgrade to Gold for unlimited watch."}
              </p>
            </div>

            {/* Streaming Quality */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Max Streaming Quality
              </span>
              <span className="text-2xl font-black text-gray-900 block">
                {sub?.maxStreamingQuality || "360p"}
              </span>
              <p className="text-[11px] text-gray-500">
                {planName === "Gold" ? "Highest resolution available." : "Upgrade for HD & 4K."}
              </p>
            </div>

            {/* Ad Experience */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Ad Policy
              </span>
              <span className="text-2xl font-black text-gray-900 block">
                {planName === "Gold" ? "100% Ad-Free" : planName === "Silver" ? "No Banners" : "Standard Ads"}
              </span>
              <p className="text-[11px] text-gray-500">
                {planName === "Gold" ? "Zero interruptions anywhere." : "Ad-supported playback."}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Billing & Printable Invoice History */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-gray-900">Billing History & Receipts</h2>
              <p className="text-xs text-gray-500">
                View or print your official Razorpay payment invoices for tax and recordkeeping.
              </p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-2xl p-6 space-y-2">
              <FileText className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No payment invoices found yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Invoices are generated automatically each time a subscription is purchased or renewed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-900 text-xs uppercase tracking-wider font-extrabold">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Plan & Duration</th>
                    <th className="py-3 px-4">Date Paid</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">
                        {inv.planName} ({inv.duration})
                      </td>
                      <td className="py-3 px-4">
                        {new Date(inv.paymentDate || inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-black text-gray-900">
                        ₹{(inv.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-gray-500">
                        {inv.paymentId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          {inv.status || "PAID"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(inv)}
                          className="h-7 text-xs font-semibold rounded-lg gap-1 border-gray-300"
                        >
                          <Printer className="w-3 h-3" />
                          View Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Printable Invoice Receipt Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-6 border print:m-0 print:p-0 print:border-none print:shadow-none">
            {/* Modal Header (Hidden on print) */}
            <div className="flex items-center justify-between pb-3 border-b print:hidden">
              <h3 className="font-black text-gray-900 text-base">Payment Receipt & Invoice</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePrintInvoice}
                  className="rounded-full text-xs font-bold bg-gray-900 hover:bg-black text-white gap-1.5 h-8"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Invoice
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Printable Invoice Sheet */}
            <div className="space-y-6 text-gray-800 text-xs">
              {/* Brand Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center font-black text-sm">
                      Y
                    </div>
                    <span className="font-black text-xl text-gray-900 tracking-tight">YourTube 2.0</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Official Payment Receipt & Subscription Invoice</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-gray-900 text-sm block">
                    {selectedInvoice.invoiceNumber}
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    Date: {new Date(selectedInvoice.paymentDate || selectedInvoice.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Billed To / Account Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Subscriber Details
                  </span>
                  <p className="font-bold text-gray-900">{selectedInvoice.userName || user?.name || "Subscriber"}</p>
                  <p className="text-gray-600">{selectedInvoice.userEmail || user?.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Payment Gateway
                  </span>
                  <p className="font-mono text-gray-900 font-bold">Razorpay Test Mode</p>
                  <p className="font-mono text-[10px] text-gray-500">{selectedInvoice.paymentId}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-gray-500 text-[11px] uppercase font-bold">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-center">Duration</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 font-bold text-gray-900">
                      YourTube {selectedInvoice.planName} Plan Subscription
                    </td>
                    <td className="py-3 text-center capitalize">{selectedInvoice.duration}</td>
                    <td className="py-3 text-right font-bold text-gray-900">
                      ₹{(selectedInvoice.amount / 100).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="py-2 text-right text-gray-500">
                      Taxes & GST (Included)
                    </td>
                    <td className="py-2 text-right font-medium text-gray-600">₹0.00</td>
                  </tr>
                  <tr className="border-t font-black text-sm">
                    <td colSpan={2} className="py-3 text-right text-gray-900">
                      Total Paid
                    </td>
                    <td className="py-3 text-right text-red-600">
                      ₹{(selectedInvoice.amount / 100).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-medium">
                  Payment Completed and Verified via HMAC-SHA256 signature.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Cancel Subscription Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border">
            <div className="flex items-center gap-2.5 pb-2 border-b">
              <BadgeAlert className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">Cancel Subscription</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to cancel your <strong>{planName}</strong> plan? Your watch history, downloads, and past invoices will remain saved on your account.
            </p>

            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                disabled={cancelling}
                onClick={() => handleConfirmCancel(false)}
                className="w-full justify-start text-xs font-semibold py-5 rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <div className="text-left">
                  <p className="font-bold text-gray-900">Cancel at end of billing cycle (Recommended)</p>
                  <p className="text-[10px] text-gray-500">
                    Keep your {planName} benefits until {sub?.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : "expiry"}.
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                disabled={cancelling}
                onClick={() => handleConfirmCancel(true)}
                className="w-full justify-start text-xs font-semibold py-5 rounded-xl border-red-200 text-red-700 hover:bg-red-50"
              >
                <div className="text-left">
                  <p className="font-bold text-red-600">Cancel immediately</p>
                  <p className="text-[10px] text-red-400">
                    Reverts to Free tier right away without waiting.
                  </p>
                </div>
              </Button>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowCancelModal(false)}
                className="text-xs rounded-full"
              >
                Keep My Subscription
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
