import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Shield,
  ArrowRight,
  Mail,
  User,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  KeyRound,
  ArrowLeft,
  Smartphone,
  Laptop,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const { redirect = "/", plan } = router.query;
  const {
    user,
    pendingOtpChallenge,
    setPendingOtpChallenge,
    handlegooglesignin,
    loginWithEmail,
    verifyOtp,
    resendOtp,
    cancelOtp,
  } = useUser();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP Verification state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [trustDevice, setTrustDevice] = useState(true);
  const [deviceName, setDeviceName] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresSecondsLeft, setExpiresSecondsLeft] = useState(300);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      const destination = typeof redirect === "string" ? redirect : "/";
      router.push(destination);
    }
  }, [user, redirect, router]);

  // Handle countdowns when in OTP challenge mode
  useEffect(() => {
    if (!pendingOtpChallenge) return;

    if (pendingOtpChallenge.resendCooldown) {
      setResendCooldown(pendingOtpChallenge.resendCooldown);
    }

    if (pendingOtpChallenge.expiresAt) {
      const diff = Math.max(
        0,
        Math.floor((new Date(pendingOtpChallenge.expiresAt).getTime() - Date.now()) / 1000)
      );
      setExpiresSecondsLeft(diff);
    }

    // Default friendly device name based on browser heuristic
    if (typeof window !== "undefined") {
      const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      setDeviceName(isMobile ? "My Mobile Device" : "My Personal Computer");
    }
  }, [pendingOtpChallenge]);

  // Timers
  useEffect(() => {
    if (!pendingOtpChallenge) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setExpiresSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingOtpChallenge]);

  // Google sign in
  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const res = await handlegooglesignin();
      if (res?.otpRequired) {
        if (res.devOtp) {
          toast.info(`Security code: ${res.devOtp}`);
        } else {
          toast.info(`Verification code sent to ${res.maskedDestination || "your registered email"}`);
        }
        return;
      }
      toast.success("Signed in successfully with Google!");
      const target = typeof redirect === "string" ? redirect : "/";
      router.push(target);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      let msg = err.message || "Failed to sign in with Google.";
      if (err.code === "auth/unauthorized-domain" || err.code === "auth/configuration-not-found" || err.code === "auth/invalid-api-key") {
        msg = "Firebase Google Auth is not configured for this project. Please sign in using your email address below!";
        setTimeout(() => document.querySelector<HTMLInputElement>('input[type="email"]')?.focus(), 200);
      } else if (err.code === "auth/popup-blocked") {
        msg = "Browser popup was blocked. Please allow popups or use Email sign-in below.";
      } else if (err.code === "auth/popup-closed-by-user") {
        msg = "Google sign-in popup was closed.";
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Email sign in
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await loginWithEmail(email, name);
      if (res?.otpRequired) {
        if (res.devOtp) {
          toast.info(`Security code: ${res.devOtp}`);
        } else {
          toast.info(`Verification code sent to ${res.maskedDestination || "your email"}.`);
        }
        return;
      }
      toast.success(`Welcome to YourTube, ${name || email.split("@")[0]}!`);
      const target = typeof redirect === "string" ? redirect : "/";
      router.push(target);
    } catch (err: any) {
      console.error("Email login error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Sign-in failed. Please verify connection.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Quick demo sign-in
  const handleQuickDemo = async (demoEmail: string, demoName: string) => {
    try {
      setLoading(true);
      const res = await loginWithEmail(demoEmail, demoName);
      if (res?.otpRequired) {
        if (res.devOtp) {
          toast.info(`Test code for ${demoName}: ${res.devOtp}`);
        } else {
          toast.info("Security code sent. Please verify below.");
        }
        return;
      }
      toast.success(`Logged in as ${demoName}!`);
      const target = typeof redirect === "string" ? redirect : "/";
      router.push(target);
    } catch (err: any) {
      console.error("Demo login error:", err);
      const msg = err.response?.data?.message || err.message || "Demo login failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // OTP Input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(5, pasted.length);
    inputRefs.current[nextIndex]?.focus();
  };

  // Verify OTP submission
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      await verifyOtp({
        challengeId: pendingOtpChallenge.challengeId,
        otp,
        trustDevice,
        deviceName,
      });
      toast.success("Identity verified! Welcome to YourTube.");
      const target = typeof redirect === "string" ? redirect : "/";
      router.push(target);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Invalid verification code. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      const res = await resendOtp(pendingOtpChallenge.challengeId, pendingOtpChallenge.channel);
      toast.success(res.message || "A new code has been sent!");
      setResendCooldown(res.cooldown || 60);
      setExpiresSecondsLeft(300);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  // Cancel OTP
  const handleCancelChallenge = async () => {
    if (pendingOtpChallenge?.challengeId) {
      await cancelOtp(pendingOtpChallenge.challengeId);
    }
    setPendingOtpChallenge(null);
    setOtpDigits(["", "", "", "", "", ""]);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <main className="flex-1 min-h-[85vh] flex items-center justify-center p-4 bg-muted/20">
      <Head>
        <title>{pendingOtpChallenge ? "Verify Identity" : "Sign In"} - YourTube</title>
      </Head>

      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
        {/* VIEW 1: TWO-FACTOR OTP CHALLENGE VIEW */}
        {pendingOtpChallenge ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center bg-red-600 text-white p-3 rounded-2xl shadow-sm mb-1">
                <Shield className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-extrabold text-card-foreground">
                Two-Factor Verification
              </h1>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                We noticed a sign-in from a new device or environment. We sent a 6-digit code to:
              </p>
              <div className="inline-block bg-muted px-3 py-1 rounded-full text-xs font-semibold text-foreground tracking-wide border border-border">
                {pendingOtpChallenge.maskedDestination}
              </div>

              {pendingOtpChallenge.devOtp && (
                <div
                  onClick={() => {
                    const chars = String(pendingOtpChallenge.devOtp).split("").slice(0, 6);
                    setOtpDigits(chars);
                    inputRefs.current[5]?.focus();
                  }}
                  className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-2.5 rounded-2xl text-center cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors mt-2"
                >
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 block font-medium">
                    Test Mode Code: <strong className="font-mono text-xs font-bold">{pendingOtpChallenge.devOtp}</strong>
                    <span className="ml-1.5 text-[10px] underline font-semibold">(Click to auto-fill)</span>
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-5">
              {/* 6 Digit Inputs */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground text-center mb-2">
                  Enter 6-Digit Security Code
                </label>
                <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoFocus={index === 0}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold bg-muted/40 border border-border focus:border-red-600 focus:ring-2 focus:ring-red-600/20 rounded-xl outline-none text-foreground transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Expiry indicator */}
              <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Code expires in{" "}
                  <strong className={expiresSecondsLeft < 60 ? "text-red-600" : "text-foreground"}>
                    {formatTimer(expiresSecondsLeft)}
                  </strong>
                </span>
              </div>

              {/* Trust This Device Checkbox */}
              <div className="bg-muted/40 p-3.5 rounded-2xl border border-border space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-card-foreground block">
                      Trust this device for 30 days
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Skip OTP prompts on this browser during future sign-ins.
                    </span>
                  </div>
                </label>

                {trustDevice && (
                  <div className="pt-2 border-t border-border/60">
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Device label:
                    </label>
                    <Input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g. Work MacBook, Home PC"
                      className="h-8 text-xs bg-card"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <Button
                type="submit"
                disabled={loading || otpDigits.join("").length !== 6 || expiresSecondsLeft === 0}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full py-2.5 text-xs shadow-sm transition-all"
              >
                {loading ? "Verifying Code..." : "Verify & Sign In"}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Security Code"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelChallenge}
                  className="text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* VIEW 2: STANDARD SIGN IN VIEW */
          <>
            {/* Brand Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center bg-red-600 text-white p-2.5 rounded-2xl shadow-sm mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-card-foreground">Sign in to YourTube</h1>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Access subscription plans, offline downloads, automatic IST theme, and account security.
              </p>
            </div>

            {plan && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl p-3 text-xs flex items-center gap-2">
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
              className="w-full flex items-center justify-center gap-3 py-5 rounded-full border-border hover:bg-accent text-sm font-semibold shadow-sm transition-all"
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
              <div className="border-t border-border w-full" />
              <span className="bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Or email sign-in
              </span>
              <div className="border-t border-border w-full" />
            </div>

            {/* Email / Instant Login Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 rounded-xl h-10 text-xs bg-muted/40 focus-visible:ring-1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 rounded-xl h-10 text-xs bg-muted/40 focus-visible:ring-1"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full py-2.5 text-xs shadow-sm transition-all"
              >
                Sign In with Email
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </form>

            {/* 1-Click Instant Demo User Buttons */}
            <div className="pt-2 border-t border-border space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground block text-center">
                One-Click Test Accounts:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDemo("free_tester@example.com", "Free Tester")}
                  className="text-[11px] h-8 rounded-lg border-border hover:bg-accent font-medium"
                >
                  Free Plan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDemo("bronze_user@example.com", "Bronze User")}
                  className="text-[11px] h-8 rounded-lg border-amber-200 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 font-medium"
                >
                  Bronze User
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDemo("gold_vip@example.com", "Gold VIP")}
                  className="text-[11px] h-8 rounded-lg border-yellow-300 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950 font-medium"
                >
                  Gold VIP
                </Button>
              </div>
            </div>

            {/* Feature highlight */}
            <div className="bg-muted/40 rounded-2xl p-4 text-[11px] text-muted-foreground space-y-1.5 border border-border">
              <div className="flex items-center gap-2 text-card-foreground font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span>Automatic Theme selection based on IST</span>
              </div>
              <div className="flex items-center gap-2 text-card-foreground font-medium">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Risk-based login activity tracking & trusted devices</span>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
