"use client";

import { useState, useEffect } from "react";
import { Check, HelpCircle, Sparkles, Shield, Zap, Info, RefreshCw } from "lucide-react";
import { toast, Toaster } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: "free" | "pro";
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  // Stripe Price IDs (standard placeholders, to be overridden by env vars)
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || "price_monthly_id_placeholder";
  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || "price_annual_id_placeholder";

  useEffect(() => {
    // Attempt to load user profile from API or localStorage
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }
  }, []);

  const handleCheckout = async (priceId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in or register to upgrade to Pro.");
      // Redirect to login or admin login after delay
      setTimeout(() => {
        window.location.href = "/admin/login";
      }, 1500);
      return;
    }

    setLoadingPriceId(priceId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start checkout session.");
      }

      const { url } = await res.json();
      window.location.href = url; // Redirect to Stripe Checkout page
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate upgrade.");
    } finally {
      setLoadingPriceId(null);
    }
  };

  const features = [
    { name: "Conversions per day", free: "10 files", pro: "Unlimited" },
    { name: "Max file size", free: "50 MB", pro: "500 MB" },
    { name: "AI Captions (Speech to Text)", free: "✕ Locked", pro: "✓ Enabled" },
    { name: "Custom Watermarks", free: "✕ Locked", pro: "✓ Enabled" },
    { name: "AI Upscaling & Enhancements", free: "✕ Locked", pro: "✓ Enabled" },
    { name: "Batch Upload & Conversion", free: "✕ Locked", pro: "✓ Enabled" },
    { name: "Developer API Access", free: "✕ Locked", pro: "✓ Enabled" },
    { name: "Priority Processing Queue", free: "Standard speed", pro: "Supercharged speed" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white space-y-12 relative min-h-screen">
      <Toaster position="top-right" richColors />

      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-zinc-100 to-cyan-300 bg-clip-text text-transparent">
          Simple, Fair Pricing
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
          Upgrade to unlock larger uploads, real Whisper AI captions, custom watermarks, batch processes, and public developer API integrations.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === "monthly"
                ? "bg-zinc-850 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              billingCycle === "annual"
                ? "bg-cyan-500 text-black"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Annual
            <span className="bg-black/10 text-black border border-black/5 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Cards container */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        
        {/* Free Plan */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950/40 p-8 flex flex-col justify-between relative space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-500">Starter</span>
              <h2 className="text-2xl font-bold">Free Plan</h2>
              <p className="text-zinc-400 text-xs">For basic files conversions and evaluation.</p>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-zinc-500 text-xs">/ month</span>
            </div>

            <div className="border-t border-zinc-900 pt-6">
              <button
                type="button"
                disabled
                className="w-full text-center rounded-2xl border border-zinc-800 bg-zinc-900/60 py-3.5 text-sm font-semibold text-zinc-500 cursor-default"
              >
                {user?.plan === "free" || !user ? "Current Plan" : "Downgrade"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Included Features</h3>
            <ul className="space-y-3 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-zinc-600 shrink-0" />
                <span>10 conversions per day limit</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-zinc-600 shrink-0" />
                <span>Max 50MB file upload size</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-zinc-600 shrink-0" />
                <span>Standard conversions queue</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="rounded-3xl border border-cyan-500 bg-gradient-to-b from-zinc-950 to-zinc-900/40 p-8 flex flex-col justify-between relative shadow-xl shadow-cyan-500/5 space-y-8">
          <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-[9px] font-extrabold uppercase px-3 py-1 rounded-full border border-cyan-300 shadow">
            Most Popular
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-cyan-400">Pro Upgrade</span>
              <h2 className="text-2xl font-bold">Pro Plan</h2>
              <p className="text-zinc-400 text-xs">For professionals, builders, and developers.</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">
                {billingCycle === "monthly" ? "$9.99" : "$7.99"}
              </span>
              <span className="text-zinc-400 text-xs">/ month</span>
            </div>

            <div className="border-t border-cyan-950 pt-6">
              <button
                type="button"
                onClick={() => handleCheckout(billingCycle === "monthly" ? monthlyPriceId : annualPriceId)}
                disabled={loadingPriceId !== null}
                className="w-full text-center rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black py-3.5 text-sm font-extrabold shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loadingPriceId ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-black" />
                ) : user?.plan === "pro" ? (
                  "Upgrade / Manage Plan"
                ) : (
                  "Upgrade to Pro"
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Premium Upgrades</h3>
            <ul className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Unlimited daily conversions</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Max 500MB file upload size</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Watermark removal and customization</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Real Speech-to-Text Whisper AI Captions</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Developer API keys and config panel</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* Comparison Table */}
      <div className="max-w-4xl mx-auto rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 overflow-hidden space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-3">
          Plan Comparison Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-zinc-500 font-bold border-b border-zinc-900/60">
                <th className="pb-3">Feature</th>
                <th className="pb-3">Free</th>
                <th className="pb-3 text-cyan-400">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/40">
              {features.map((feat, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/5">
                  <td className="py-3 font-semibold text-zinc-300">{feat.name}</td>
                  <td className="py-3 text-zinc-500">{feat.free}</td>
                  <td className="py-3 text-cyan-400 font-semibold">{feat.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
