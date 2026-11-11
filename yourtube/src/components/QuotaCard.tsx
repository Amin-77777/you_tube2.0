import React from "react";
import Link from "next/link";
import { Zap, Clock, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";

interface QuotaCardProps {
  quota: {
    plan: string;
    limit: number;
    used: number;
    remaining: number;
    resetAt: string | Date;
  } | null;
  loading?: boolean;
}

export const QuotaCard: React.FC<QuotaCardProps> = ({ quota, loading = false }) => {
  if (loading || !quota) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-3 bg-muted rounded w-full"></div>
      </div>
    );
  }

  const { plan, limit, used, remaining, resetAt } = quota;
  const percentUsed = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  const planColors: Record<string, { badge: string; text: string }> = {
    Free: { badge: "bg-muted text-muted-foreground border-border", text: "text-foreground" },
    Bronze: { badge: "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700", text: "text-amber-600" },
    Silver: { badge: "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700", text: "text-slate-600" },
    Gold: { badge: "bg-yellow-100 dark:bg-yellow-950/80 text-yellow-900 dark:text-yellow-300 border-yellow-400 dark:border-yellow-600", text: "text-yellow-600" },
  };

  const currentTheme = planColors[plan] || planColors.Free;
  const resetDate = new Date(resetAt);
  const formattedReset = isNaN(resetDate.getTime())
    ? "Tomorrow at 00:00 UTC"
    : resetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Download Quota
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentTheme.badge}`}
            >
              <Zap className="w-3 h-3 mr-1 fill-current" />
              {plan} Plan
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">
            {remaining} <span className="text-base font-normal text-muted-foreground">of {limit} remaining today</span>
          </h2>
        </div>

        <Link href="/subscriptions">
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-full px-4 shadow-sm"
          >
            Upgrade Plan
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>Used today: {used} video(s)</span>
          <span>{percentUsed}% consumed</span>
        </div>
        <Progress value={percentUsed} className="h-2 bg-muted" />
      </div>

      <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Resets daily at midnight ({formattedReset})</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Duplicates within 60 min don't count toward quota</span>
        </div>
      </div>
    </div>
  );
};

export default QuotaCard;
