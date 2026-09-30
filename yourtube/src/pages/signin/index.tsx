import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Download,
  Shield,
  Zap,
  ArrowRight,
  Mail,
  User,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const { redirect = "/", plan } = router.query;
  const { user, handlegooglesignin, loginWithEmail } = useUser();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      const destination = typeof redirect === "string" ? redirect : "/";
      router.push(destination);
    }
  }, [user, redirect, router]);

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      await handlegooglesignin();
      toast.success("Signed in successfully with Google!");
      const target = typeof redirect === "string" ? redirect : "/";
      router.push(target);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await loginWithEmail(email, name);
      toast.success(`Welcome to YourTube, ${name || email.split("@")[0]}!`);
      const target = typeof redirect === "string" ? redirect : "/";
      router.push(target);
    } catch (err: any) {
      toast.error("Sign-in failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoName: string) => {
    try {
      setLoading(true);
      await loginWithEmail(demoEmail, demoName);
      toast.success(`Logged in as ${demoName}!`);
      const target = typeof redirect === "string" ? redirect : "/";
      router.push(target);
    } catch (err: any) {
      toast.error("Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 min-h-[85vh] flex items-center justify-center p-4 bg-gray-50/50">
      <Head>
        <title>Sign In - YourTube</title>
      </Head>

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-red-600 text-white p-2.5 rounded-2xl shadow-sm mb-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Sign in to YourTube</h1>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Access subscription plans, offline video downloads, and personal watch history.
          </p>
        </div>

        {plan && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Sign in to proceed with activating the <strong>{plan}</strong> subscription plan!
            </span>
          </div>
        )}

        {/* Google Sign In */}
        <Button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          variant="outline"
          className="w-full flex items-center justify-center gap-3 py-5 rounded-full border-gray-300 hover:bg-gray-50 text-sm font-semibold shadow-sm transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.16z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Or quick demo sign-in
          </span>
          <div className="border-t border-gray-200 w-full" />
        </div>

        {/* Email / Instant Login Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div className="space-y-1">
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 rounded-xl h-10 text-xs bg-gray-50 focus-visible:ring-1"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 rounded-xl h-10 text-xs bg-gray-50 focus-visible:ring-1"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-semibold rounded-full py-2.5 text-xs shadow-sm"
          >
            Sign In with Email
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </form>

        {/* 1-Click Instant Demo User Buttons */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <span className="text-[11px] font-semibold text-gray-500 block text-center">
            One-Click Test Accounts:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDemo("free_tester@example.com", "Free Tester")}
              className="text-[11px] h-8 rounded-lg border-gray-200 hover:bg-gray-100 font-medium"
            >
              Free Plan
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDemo("bronze_user@example.com", "Bronze User")}
              className="text-[11px] h-8 rounded-lg border-amber-200 text-amber-800 hover:bg-amber-50 font-medium"
            >
              Bronze User
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDemo("gold_vip@example.com", "Gold VIP")}
              className="text-[11px] h-8 rounded-lg border-yellow-300 text-yellow-800 hover:bg-yellow-50 font-medium"
            >
              Gold VIP
            </Button>
          </div>
        </div>

        {/* Feature highlight */}
        <div className="bg-gray-50 rounded-2xl p-4 text-[11px] text-gray-500 space-y-1.5 border">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            <span>1 free download per day included</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Upgrade to Bronze, Silver, or Gold for up to 25/day</span>
          </div>
        </div>
      </div>
    </main>
  );
}
