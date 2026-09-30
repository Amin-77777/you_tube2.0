import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Check,
  Zap,
  Shield,
  Crown,
  ArrowLeft,
  Download,
  RefreshCw,
  HelpCircle,
  Clock,
  Sparkles,
  CreditCard,
  Tv,
  Eye,
  Sliders,
  FileText,
  BadgePercent,
  CheckCircle2,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import QuotaCard from "@/components/QuotaCard";
import { toast } from "sonner";

interface DurationOption {
  key: string;
  name: string;
  days: number;
  discountPercent: number;
  badge?: string;
}

const DURATIONS: DurationOption[] = [
  { key: "monthly", name: "Monthly", days: 30, discountPercent: 0 },
  { key: "quarterly", name: "Quarterly", days: 90, discountPercent: 10, badge: "Save 10%" },
  { key: "yearly", name: "Yearly", days: 365, discountPercent: 20, badge: "Save 20%" },
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { plan: targetQueryPlan, required: requiredTierQuery } = router.query;
  const { user } = useUser();

  const [plans, setPlans] = useState<Record<string, any>>({});
  const [currentPlan, setCurrentPlan] = useState<string>("Free");
  const [activeSub, setActiveSub] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<string>("monthly");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // Test Mode Modal fallback (for instant testing without manual card typing)
  const [testModalOrder, setTestModalOrder] = useState<any>(null);
  const [verifyingTestPayment, setVerifyingTestPayment] = useState(false);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const plansRes = await axiosInstance.get("/subscription/plans");
      if (plansRes.data.plans) {
        setPlans(plansRes.data.plans);
      }

      if (user) {
        const [currentRes, quotaRes] = await Promise.all([
          axiosInstance.get("/subscription/current"),
          axiosInstance.get("/download/quota"),
        ]);

        if (currentRes.data.subscription) {
          setActiveSub(currentRes.data.subscription);
          setCurrentPlan(currentRes.data.subscription.plan || "Free");
        }
        if (quotaRes.data) {
          setQuota(quotaRes.data);
        }
      }
    } catch (err: any) {
      console.warn("Error loading subscription info:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
    loadRazorpayScript();
  }, [user]);

  // Price calculator for specific duration
  const getPlanPrice = (planKey: string, durationKey: string) => {
    const plan = plans[planKey];
    if (!plan || plan.monthlyPrice === 0) return 0;

    const baseMonthly = plan.monthlyPrice;
    if (durationKey === "quarterly") {
      return Math.round(baseMonthly * 3 * 0.9);
    }
    if (durationKey === "yearly") {
      return Math.round(baseMonthly * 12 * 0.8);
    }
    return baseMonthly;
  };

  const getMonthlyEquivalent = (planKey: string, durationKey: string) => {
    const total = getPlanPrice(planKey, durationKey);
    if (durationKey === "quarterly") return Math.round(total / 3);
    if (durationKey === "yearly") return Math.round(total / 12);
    return total;
  };

  // Handle plan purchase or upgrade
  const handleSelectPlan = async (planKey: string) => {
    if (!user) {
      toast.info(`Please sign in to select the ${planKey} plan.`);
      router.push(`/signin?redirect=/subscriptions&plan=${planKey}`);
      return;
    }

    if (planKey === currentPlan && activeSub?.status === "ACTIVE") {
      toast.info(`You are currently on the ${planKey} plan.`);
      return;
    }

    // Free plan downgrade / activation
    if (planKey === "Free") {
      try {
        setProcessingPlan("Free");
        const res = await axiosInstance.post("/subscription/upgrade", { plan: "Free" });
        toast.success(res.data.message || "Free plan activated successfully.");
        await fetchSubscriptionData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to switch to Free plan.");
      } finally {
        setProcessingPlan(null);
      }
      return;
    }

    // Paid Plan: Create Razorpay Order
    try {
      setProcessingPlan(planKey);
      const orderRes = await axiosInstance.post("/subscription/create-order", {
        planId: planKey,
        duration: selectedDuration,
      });

      const {
        orderId,
        amount,
        amountInPaise,
        currency,
        keyId,
        user: userInfo,
        isTestSimulation,
      } = orderRes.data;

      const effectivePaise = amountInPaise || (amount ? amount * 100 : 0);
      const effectiveRupees = amount || effectivePaise / 100;

      // Determine if a real, verified Razorpay live/test key is configured
      const isRealRazorpayKey =
        Boolean(keyId) &&
        !isTestSimulation &&
        !keyId.includes("YourTestKey") &&
        !keyId.includes("placeholder") &&
        /^rzp_(test|live)_[A-Za-z0-9]{8,}$/.test(keyId);

      if (!isRealRazorpayKey) {
        // Directly open our built-in Razorpay Test Checkout modal without hitting api.razorpay.com with a dummy key
        setTestModalOrder({
          orderId,
          amount: effectiveRupees,
          amountInPaise: effectivePaise,
          currency: currency || "INR",
          plan: planKey,
          duration: selectedDuration,
        });
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof (window as any).Razorpay === "undefined") {
        setTestModalOrder({
          orderId,
          amount: effectiveRupees,
          amountInPaise: effectivePaise,
          currency: currency || "INR",
          plan: planKey,
          duration: selectedDuration,
        });
        return;
      }

      // Configure Razorpay checkout
      const options = {
        key: keyId,
        amount: effectivePaise, // Razorpay SDK requires smallest subunit (paise)
        currency: currency || "INR",
        name: "YourTube Premium",
        description: `${planKey} Plan (${selectedDuration.toUpperCase()})`,
        image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=128&auto=format&fit=crop&q=80",
        order_id: orderId,
        handler: async function (response: any) {
          try {
            toast.loading("Verifying payment...", { id: "verify-payment" });
            const verifyRes = await axiosInstance.post("/subscription/verify-payment", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            toast.dismiss("verify-payment");
            toast.success(verifyRes.data.message || `🎉 ${planKey} Plan activated successfully!`);
            await fetchSubscriptionData();
            router.push("/subscription/dashboard");
          } catch (verifyErr: any) {
            toast.dismiss("verify-payment");
            toast.error(verifyErr.response?.data?.message || "Payment verification failed.");
          }
        },
        prefill: {
          name: userInfo?.name || user?.name || "Subscriber",
          email: userInfo?.email || user?.email || "subscriber@yourtube.com",
        },
        notes: {
          plan: planKey,
          duration: selectedDuration,
        },
        theme: {
          color: "#DC2626", // Red-600
        },
        modal: {
          ondismiss: function () {
            toast.info("Payment checkout was closed.");
          },
        },
      };

      try {
        const razorpay = new (window as any).Razorpay(options);
        razorpay.on("payment.failed", function (response: any) {
          console.warn("Razorpay payment failed callback:", response.error);
          toast.info("Switching to Test Mode Simulation...");
          setTestModalOrder({
            orderId,
            amount: effectiveRupees,
            amountInPaise: effectivePaise,
            currency: currency || "INR",
            plan: planKey,
            duration: selectedDuration,
          });
        });
        razorpay.open();
      } catch (sdkErr) {
        console.warn("Failed to open Razorpay SDK:", sdkErr);
        setTestModalOrder({
          orderId,
          amount: effectiveRupees,
          amountInPaise: effectivePaise,
          currency: currency || "INR",
          plan: planKey,
          duration: selectedDuration,
        });
      }
    } catch (err: any) {
      console.error("Order creation error:", err);
      toast.error(err.response?.data?.message || "Failed to create payment order.");
    } finally {
      setProcessingPlan(null);
    }
  };

  // Simulated Instant Test Mode Payment (for testing environments)
  const handleSimulateTestPayment = async () => {
    if (!testModalOrder) return;
    try {
      setVerifyingTestPayment(true);
      const testPaymentId = `pay_test_${Date.now()}`;
      const testSignature = `sig_test_${Date.now()}`;

      const res = await axiosInstance.post("/subscription/verify-payment", {
        razorpayOrderId: testModalOrder.orderId,
        razorpayPaymentId: testPaymentId,
        razorpaySignature: testSignature,
      });

      toast.success(res.data.message || `🎉 ${testModalOrder.plan} plan activated successfully!`);
      setTestModalOrder(null);
      await fetchSubscriptionData();
      router.push("/subscription/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Test payment verification failed.");
    } finally {
      setVerifyingTestPayment(false);
    }
  };

  const planIcons: Record<string, any> = {
    Free: Shield,
    Bronze: Zap,
    Silver: Crown,
    Gold: Crown,
  };

  const planColorStyles: Record<
    string,
    { border: string; bg: string; badgeBg: string; button: string; tag: string }
  > = {
    Free: {
      border: "border-gray-200",
      bg: "bg-white",
      badgeBg: "bg-gray-100 text-gray-800",
      button: "bg-gray-100 hover:bg-gray-200 text-gray-800",
      tag: "text-gray-600",
    },
    Bronze: {
      border: "border-amber-300 shadow-sm",
      bg: "bg-gradient-to-b from-amber-50/40 to-white",
      badgeBg: "bg-amber-100 text-amber-800",
      button: "bg-amber-600 hover:bg-amber-700 text-white font-bold",
      tag: "text-amber-800",
    },
    Silver: {
      border: "border-slate-300 shadow-sm",
      bg: "bg-gradient-to-b from-slate-50/50 to-white",
      badgeBg: "bg-slate-200 text-slate-800",
      button: "bg-slate-800 hover:bg-slate-900 text-white font-bold",
      tag: "text-slate-800",
    },
    Gold: {
      border: "border-yellow-400 ring-2 ring-yellow-400/30 shadow-lg",
      bg: "bg-gradient-to-b from-yellow-50/60 to-white",
      badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black",
      button:
        "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-black shadow-md shadow-yellow-500/20",
      tag: "text-yellow-800",
    },
  };

  return (
    <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto space-y-10">
      <Head>
        <title>Subscription Plans - YourTube Premium</title>
      </Head>

      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-2.5">
          {user && (
            <Link href="/subscription/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-bold gap-1.5 border-gray-300 hover:bg-gray-100 text-gray-800"
              >
                <Sliders className="w-3.5 h-3.5" />
                Subscription Dashboard
              </Button>
            </Link>
          )}

          {!user ? (
            <Link href="/signin?redirect=/subscriptions">
              <Button size="sm" variant="default" className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700">
                Sign In
              </Button>
            </Link>
          ) : (
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
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-red-50 text-red-600 border border-red-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Razorpay Test Mode Integration</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
          Choose Your Perfect Plan
        </h1>
        <p className="text-sm md:text-base text-gray-600 max-w-xl mx-auto">
          Unlock high-definition 4K streaming, generous daily download quotas, exclusive premium videos, and ad-free viewing.
        </p>

        {/* Duration Selection Pill Tabs */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex p-1.5 bg-gray-100 border border-gray-200 rounded-full shadow-inner">
            {DURATIONS.map((dur) => (
              <button
                key={dur.key}
                type="button"
                onClick={() => setSelectedDuration(dur.key)}
                className={`relative px-4 sm:px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedDuration === dur.key
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span>{dur.name}</span>
                {dur.badge && (
                  <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black">
                    {dur.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active User Quota / Subscription Banner */}
      {user && activeSub && (
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-red-400">
                Your Current Plan
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white">
                {currentPlan} ({activeSub.duration || "Monthly"})
              </span>
            </div>
            <p className="text-sm text-gray-300">
              {activeSub.expiryDate ? (
                <>
                  Valid until:{" "}
                  <strong>{new Date(activeSub.expiryDate).toLocaleDateString()}</strong> (Auto-renew:{" "}
                  {activeSub.autoRenew ? "Enabled" : "Disabled"})
                </>
              ) : (
                "Free default plan - unlimited duration."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/subscription/dashboard">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full text-xs font-bold bg-white text-gray-900 hover:bg-gray-100"
              >
                Manage Subscription & Invoices
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(plans).map(([key, plan]) => {
            const isCurrent = user && currentPlan === key && activeSub?.status === "ACTIVE";
            const Icon = planIcons[key] || Shield;
            const style = planColorStyles[key] || planColorStyles.Free;
            const isProcessing = processingPlan === key;

            const totalPrice = getPlanPrice(key, selectedDuration);
            const monthlyEq = getMonthlyEquivalent(key, selectedDuration);

            return (
              <div
                key={key}
                className={`relative flex flex-col justify-between border rounded-3xl p-6 transition-all ${
                  style.border
                } ${style.bg} ${isCurrent ? "scale-[1.02] shadow-xl" : "hover:shadow-md"}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                    Active Plan
                  </div>
                )}

                <div className="space-y-4">
                  {/* Plan Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-xl text-gray-900 block">{plan.name}</span>
                      <span className="text-[11px] text-gray-500 font-medium">Tier {plan.tier}</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-white shadow-sm border border-gray-100">
                      <Icon className="w-5 h-5 text-gray-800" />
                    </div>
                  </div>

                  {/* Price Header */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-black text-gray-900">
                        {totalPrice === 0 ? "₹0" : `₹${totalPrice}`}
                      </span>
                      {totalPrice > 0 && (
                        <span className="text-xs text-gray-500 font-semibold">
                          /{selectedDuration === "monthly" ? "mo" : selectedDuration}
                        </span>
                      )}
                    </div>

                    {selectedDuration !== "monthly" && totalPrice > 0 && (
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                        Equivalent to ₹{monthlyEq}/month
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Daily Limits Summary Card */}
                  <div className="bg-white/80 border rounded-2xl p-3 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-semibold">Downloads:</span>
                      <span className="font-extrabold text-red-600">
                        {plan.dailyDownloadLimit} / day
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-semibold">Daily Watch:</span>
                      <span className="font-extrabold text-gray-900">
                        {plan.dailyWatchLimitMinutes >= 9999
                          ? "Unlimited"
                          : `${plan.dailyWatchLimitMinutes} mins`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-semibold">Quality:</span>
                      <span className="font-extrabold text-gray-900">
                        {plan.maxStreamingQuality}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2 pt-1 text-xs text-gray-700">
                    {plan.features?.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-6 mt-4 border-t border-gray-100">
                  <Button
                    onClick={() => handleSelectPlan(key)}
                    disabled={isCurrent || isProcessing}
                    className={`w-full py-5 rounded-full text-xs font-bold transition-all shadow-sm ${
                      isCurrent
                        ? "bg-gray-200 text-gray-500 cursor-default"
                        : style.button
                    }`}
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                    ) : isCurrent ? (
                      "Active Plan"
                    ) : !user ? (
                      `Sign in to Choose ${plan.name}`
                    ) : key === "Free" ? (
                      "Switch to Free"
                    ) : (
                      `Upgrade to ${plan.name} (${selectedDuration})`
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feature Comparison Matrix */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="text-center max-w-lg mx-auto space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-gray-900">
            Compare Tier Specifications
          </h2>
          <p className="text-xs text-gray-500">
            All plans include HMAC-SHA256 verified payments, automated invoices, and daily midnight UTC quota resets.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700 border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-900 text-sm">
                <th className="py-3 px-4 font-black">Plan Specification</th>
                <th className="py-3 px-4 font-bold text-center">Free</th>
                <th className="py-3 px-4 font-bold text-center text-amber-800">Bronze</th>
                <th className="py-3 px-4 font-bold text-center text-slate-800">Silver</th>
                <th className="py-3 px-4 font-bold text-center text-yellow-800">Gold VIP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4 font-bold text-gray-900">Monthly Base Price</td>
                <td className="py-3 px-4 text-center font-bold">₹0</td>
                <td className="py-3 px-4 text-center font-bold text-amber-800">₹199 / mo</td>
                <td className="py-3 px-4 text-center font-bold text-slate-800">₹499 / mo</td>
                <td className="py-3 px-4 text-center font-bold text-yellow-700">₹999 / mo</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-gray-900">Daily Video Downloads</td>
                <td className="py-3 px-4 text-center font-bold">1 Video / day</td>
                <td className="py-3 px-4 text-center font-bold text-amber-800">5 Videos / day</td>
                <td className="py-3 px-4 text-center font-bold text-slate-800">10 Videos / day</td>
                <td className="py-3 px-4 text-center font-bold text-yellow-700">25 Videos / day</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-gray-900">Daily Watch Time Allowance</td>
                <td className="py-3 px-4 text-center">30 Minutes</td>
                <td className="py-3 px-4 text-center font-semibold text-amber-800">2 Hours (120 min)</td>
                <td className="py-3 px-4 text-center font-semibold text-slate-800">6 Hours (360 min)</td>
                <td className="py-3 px-4 text-center font-bold text-yellow-700">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-gray-900">Maximum Video Quality</td>
                <td className="py-3 px-4 text-center">360p Standard</td>
                <td className="py-3 px-4 text-center font-semibold text-amber-800">720p HD</td>
                <td className="py-3 px-4 text-center font-semibold text-slate-800">1080p Full HD</td>
                <td className="py-3 px-4 text-center font-bold text-yellow-700">4K Ultra HD</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-gray-900">Ad Experience</td>
                <td className="py-3 px-4 text-center">Standard Ads</td>
                <td className="py-3 px-4 text-center">Limited Ads</td>
                <td className="py-3 px-4 text-center font-semibold text-slate-800">No Banner Ads</td>
                <td className="py-3 px-4 text-center font-bold text-yellow-700">100% Ad-Free</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-gray-900">Premium Video Access Level</td>
                <td className="py-3 px-4 text-center">Standard</td>
                <td className="py-3 px-4 text-center font-semibold text-amber-800">Bronze +</td>
                <td className="py-3 px-4 text-center font-semibold text-slate-800">Silver + Cinema</td>
                <td className="py-3 px-4 text-center font-bold text-yellow-700">Gold VIP Exclusive</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-gray-900">Automated Invoice & Email Receipt</td>
                <td className="py-3 px-4 text-center text-gray-400">—</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Included</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Included</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Razorpay Test Mode Checkout Modal */}
      {testModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                  R
                </div>
                <div>
                  <h3 className="font-black text-gray-900 leading-tight">Razorpay Test Checkout</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                    Test Mode Active
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestModalOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50/80 rounded-2xl p-4 space-y-2.5 text-xs border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Selected Tier:</span>
                <span className="font-black text-gray-900">{testModalOrder.plan} Plan</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Billing Period:</span>
                <span className="font-bold text-gray-900 capitalize">{testModalOrder.duration}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-bold">Total Amount:</span>
                <span className="font-black text-red-600 text-lg">
                  ₹{Number(testModalOrder.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                <span>Order ID:</span>
                <span className="font-mono text-gray-600">{testModalOrder.orderId}</span>
              </div>
            </div>

            {/* Simulated Razorpay Test Card Info */}
            <div className="border border-blue-100 bg-blue-50/60 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-blue-950 font-bold">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Razorpay Test Card Preloaded</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="col-span-2 bg-white rounded-lg p-2 border font-mono text-gray-800 text-center font-bold">
                  4111 •••• •••• 1111
                </div>
                <div className="bg-white rounded-lg p-2 border font-mono text-gray-800 text-center font-bold">
                  12/28
                </div>
              </div>
              <p className="text-[10px] text-blue-700 leading-tight">
                ✓ Valid Razorpay test mode simulated transaction. No actual bank charge will occur.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleSimulateTestPayment}
                disabled={verifyingTestPayment}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md"
              >
                {verifyingTestPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Authorize Payment (₹{Number(testModalOrder.amount).toFixed(2)})</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTestModalOrder(null)}
                className="py-5 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
