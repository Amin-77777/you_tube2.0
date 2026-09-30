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
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import QuotaCard from "@/components/QuotaCard";
import { toast } from "sonner";

interface PlanInfo {
  name: string;
  dailyLimit: number;
  price: number;
  description: string;
  features: string[];
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { plan: targetQueryPlan } = router.query;
  const { user } = useUser();
  const [plans, setPlans] = useState<Record<string, PlanInfo>>({});
  const [currentPlan, setCurrentPlan] = useState<string>("Free");
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      // Fetch plan catalog
      const plansRes = await axiosInstance.get("/subscription/plans");
      if (plansRes.data.plans) {
        setPlans(plansRes.data.plans);
      }

      // Fetch user's active subscription and quota if signed in
      if (user) {
        const [currentRes, quotaRes] = await Promise.all([
          axiosInstance.get("/subscription/current"),
          axiosInstance.get("/download/quota"),
        ]);

        if (currentRes.data.subscription?.plan) {
          setCurrentPlan(currentRes.data.subscription.plan);
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
  }, [user]);

  // Handle automatic upgrade prompt if user navigated here with ?plan=...
  useEffect(() => {
    if (user && targetQueryPlan && typeof targetQueryPlan === "string" && plans[targetQueryPlan]) {
      if (targetQueryPlan !== currentPlan) {
        handleUpgrade(targetQueryPlan);
      }
    }
  }, [user, targetQueryPlan, plans]);

  const handleUpgrade = async (targetPlan: string) => {
    if (!user) {
      toast.info(`Please sign in to select the ${targetPlan} plan.`);
      router.push(`/signin?redirect=/subscriptions&plan=${targetPlan}`);
      return;
    }

    if (targetPlan === currentPlan) {
      toast.info(`You are currently on the ${targetPlan} plan.`);
      return;
    }

    try {
      setUpgradingPlan(targetPlan);
      const res = await axiosInstance.post("/subscription/upgrade", { plan: targetPlan });
      toast.success(res.data.message || `Successfully activated ${targetPlan} plan!`);
      setCurrentPlan(targetPlan);
      await fetchSubscriptionData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to update subscription";
      toast.error(msg);
    } finally {
      setUpgradingPlan(null);
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
    { border: string; bg: string; text: string; button: string }
  > = {
    Free: {
      border: "border-gray-200",
      bg: "bg-white",
      text: "text-gray-900",
      button: "bg-gray-100 hover:bg-gray-200 text-gray-800",
    },
    Bronze: {
      border: "border-amber-300",
      bg: "bg-gradient-to-b from-amber-50/50 to-white",
      text: "text-amber-900",
      button: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    Silver: {
      border: "border-slate-300",
      bg: "bg-gradient-to-b from-slate-50/60 to-white",
      text: "text-slate-900",
      button: "bg-slate-800 hover:bg-slate-900 text-white",
    },
    Gold: {
      border: "border-yellow-400 shadow-md ring-2 ring-yellow-400/30",
      bg: "bg-gradient-to-b from-yellow-50/70 to-white",
      text: "text-yellow-900",
      button:
        "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white",
    },
  };

  return (
    <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto space-y-10">
      <Head>
        <title>Subscription Plans & Download Limits - YourTube</title>
      </Head>

      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-2">
          {!user ? (
            <Link href="/signin?redirect=/subscriptions">
              <Button size="sm" variant="outline" className="rounded-full text-xs font-semibold">
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
                <Download className="w-3.5 h-3.5 text-red-600" />
                My Downloads & Quota
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-widest text-red-600">
          Controlled Video Download System
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          Subscription Tiers & Offline Quotas
        </h1>
        <p className="text-sm text-gray-500">
          Select a subscription plan below to increase your daily video download limit. Daily quotas automatically reset every 24 hours at midnight UTC.
        </p>
      </div>

      {/* Active User Quota Status (if logged in) */}
      {user && quota && (
        <div className="max-w-4xl mx-auto">
          <QuotaCard quota={quota} loading={loading} />
        </div>
      )}

      {/* Pricing Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(plans).map(([key, plan]) => {
            const isCurrent = user && currentPlan === key;
            const Icon = planIcons[key] || Shield;
            const style = planColorStyles[key] || planColorStyles.Free;
            const isUpgrading = upgradingPlan === key;

            return (
              <div
                key={key}
                className={`relative flex flex-col justify-between border rounded-3xl p-6 transition-all ${
                  style.border
                } ${style.bg} ${isCurrent ? "shadow-lg scale-[1.02]" : "hover:shadow-md"}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    Active Plan
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-gray-900">{plan.name}</span>
                    <div className="p-2 rounded-xl bg-white shadow-sm border border-gray-100">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">
                        {plan.price === 0 ? "Free" : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs text-gray-500 font-medium">/month</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                  </div>

                  {/* Daily Quota Counter Highlight */}
                  <div className="bg-white/80 border rounded-2xl p-3.5 text-center shadow-xs">
                    <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Daily Download Quota
                    </span>
                    <span className="text-xl font-black text-red-600">
                      {plan.dailyLimit} {plan.dailyLimit === 1 ? "Video" : "Videos"} / day
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2 pt-2 text-xs text-gray-600">
                    {plan.features?.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-4 border-t border-gray-100">
                  <Button
                    onClick={() => handleUpgrade(key)}
                    disabled={isCurrent || isUpgrading}
                    className={`w-full rounded-full text-xs font-bold transition-all shadow-sm ${
                      isCurrent
                        ? "bg-gray-200 text-gray-500 cursor-default"
                        : style.button
                    }`}
                  >
                    {isUpgrading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : !user ? (
                      `Sign in & Choose ${plan.name}`
                    ) : (
                      `Switch to ${plan.name}`
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
          <h2 className="text-xl font-bold text-gray-900">Compare Plan Specifications</h2>
          <p className="text-xs text-gray-500">
            Every plan includes secure file delivery, verified token URLs, and anti-abuse protection.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-900 text-sm">
                <th className="py-3 px-4 font-bold">Feature</th>
                <th className="py-3 px-4 font-semibold text-center">Free</th>
                <th className="py-3 px-4 font-semibold text-center text-amber-700">Bronze</th>
                <th className="py-3 px-4 font-semibold text-center text-slate-800">Silver</th>
                <th className="py-3 px-4 font-semibold text-center text-yellow-700">Gold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4 font-medium text-gray-900">Daily Download Quota</td>
                <td className="py-3 px-4 text-center font-bold text-gray-900">1 Video / day</td>
                <td className="py-3 px-4 text-center font-bold text-amber-700">5 Videos / day</td>
                <td className="py-3 px-4 text-center font-bold text-slate-800">10 Videos / day</td>
                <td className="py-3 px-4 text-center font-bold text-yellow-700">25 Videos / day</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-gray-900">Duplicate Download Grace Period</td>
                <td className="py-3 px-4 text-center">60 Minutes</td>
                <td className="py-3 px-4 text-center">60 Minutes</td>
                <td className="py-3 px-4 text-center">60 Minutes</td>
                <td className="py-3 px-4 text-center">60 Minutes</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-gray-900">Download Token Expiration</td>
                <td className="py-3 px-4 text-center">15 Minutes</td>
                <td className="py-3 px-4 text-center">15 Minutes</td>
                <td className="py-3 px-4 text-center">15 Minutes</td>
                <td className="py-3 px-4 text-center">15 Minutes</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-gray-900">Midnight Quota Reset (UTC)</td>
                <td className="py-3 px-4 text-center text-green-600 font-bold">✓</td>
                <td className="py-3 px-4 text-center text-green-600 font-bold">✓</td>
                <td className="py-3 px-4 text-center text-green-600 font-bold">✓</td>
                <td className="py-3 px-4 text-center text-green-600 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-gray-900">Failed Download Quota Refund</td>
                <td className="py-3 px-4 text-center text-green-600 font-bold">✓</td>
                <td className="py-3 px-4 text-center text-green-600 font-bold">✓</td>
                <td className="py-3 px-4 text-center text-green-600 font-bold">✓</td>
                <td className="py-3 px-4 text-center text-green-600 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-gray-900">Download Speed</td>
                <td className="py-3 px-4 text-center">Standard</td>
                <td className="py-3 px-4 text-center">Priority</td>
                <td className="py-3 px-4 text-center">High Speed</td>
                <td className="py-3 px-4 text-center font-bold text-yellow-700">Instant Max</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600">
          <div className="space-y-1 bg-white p-4 rounded-2xl border">
            <h3 className="font-bold text-gray-900">How does the daily download limit work?</h3>
            <p>
              Each account has a daily quota depending on its tier (Free: 1, Bronze: 5, Silver: 10, Gold: 25). Every time you authorize a new video download, 1 quota unit is safely reserved on the server.
            </p>
          </div>

          <div className="space-y-1 bg-white p-4 rounded-2xl border">
            <h3 className="font-bold text-gray-900">What if I download the same video again?</h3>
            <p>
              Our anti-abuse policy includes a 60-minute duplicate grace window. If you download or refresh the same video within 60 minutes, it does <strong>not</strong> consume extra quota.
            </p>
          </div>

          <div className="space-y-1 bg-white p-4 rounded-2xl border">
            <h3 className="font-bold text-gray-900">When does my download quota reset?</h3>
            <p>
              Quotas reset automatically every 24 hours at 00:00 UTC (midnight). You can view the exact countdown to your next reset in your Downloads section.
            </p>
          </div>

          <div className="space-y-1 bg-white p-4 rounded-2xl border">
            <h3 className="font-bold text-gray-900">What happens if a download fails?</h3>
            <p>
              If your connection drops or an interruption occurs, the server releases your reserved quota automatically, and you can retry without penalty from the Downloads page.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
