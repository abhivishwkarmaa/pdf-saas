"use client";

import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, ShieldCheck, Zap, RefreshCw } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: "free" | "pro";
  stripeCustomerId?: string;
  planExpiresAt?: string;
}

export default function BillingPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // We can create a simple /auth/me or profile route, or read profile from database.
      // Let's call /api/auth/me to refresh profile fields.
      const res = await fetch(`${apiUrl}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    } catch {}
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }
    fetchProfile();
  }, []);

  const handlePortal = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/billing/portal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to launch billing portal");
      }

      const { url } = await res.json();
      window.location.href = url; // Redirect to Stripe portal
    } catch (err: any) {
      toast.error(err.message || "Failed to load portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 text-white space-y-8 min-h-screen">
      <Toaster position="top-right" richColors />

      {/* Header section */}
      <div className="border-b border-zinc-900 pb-6 space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-gradient-to-r from-white via-zinc-100 to-cyan-300 bg-clip-text text-transparent">
          Billing & Subscriptions
        </h1>
        <p className="text-zinc-400 text-sm">
          Manage your subscription plans, view billing history, and configure payments on Stripe.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Plan Summary Card */}
        <div className="md:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Subscription Plan</h3>
                <p className="text-xs text-zinc-500">Current tier settings</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black capitalize text-white">
                  {user?.plan || "free"} Plan
                </span>
                {user?.plan === "pro" && (
                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                    PRO MEMBER
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {user?.plan === "pro"
                  ? "You have full access to high-speed processing, Whisper AI captions, watermark controls, batch conversions, and developer tools."
                  : "You are currently on the Free tier. Unlock large files, watermark removal, AI tools, and faster queues by upgrading."}
              </p>
            </div>

            {user?.planExpiresAt && (
              <div className="text-xs text-zinc-500 font-mono">
                Subscription renews/expires on:{" "}
                <span className="text-zinc-300">
                  {new Date(user.planExpiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-900 flex flex-wrap gap-3">
            {user?.plan === "pro" && user.stripeCustomerId ? (
              <button
                type="button"
                onClick={handlePortal}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 px-5 py-3 text-xs font-bold text-zinc-200 hover:text-white transition disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" />
                ) : (
                  <>
                    Manage Billing on Stripe
                    <ExternalLink className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            ) : (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-3 text-xs font-extrabold shadow-md shadow-cyan-500/5 active:scale-[0.98] transition-all"
              >
                Upgrade to Pro Plan
                <Zap className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Payment Profile Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Payment Profile</h3>
                <p className="text-xs text-zinc-500">Method & status</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Customer ID</p>
              <p className="text-xs font-mono text-zinc-300 truncate">
                {user?.stripeCustomerId || "No billing profile active"}
              </p>
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-900 pt-4">
            All subscriptions are processed securely via Stripe. Cancel or change plans at any time.
          </div>
        </div>
      </div>
    </div>
  );
}
