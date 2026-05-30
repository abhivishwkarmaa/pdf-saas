"use client";

import { useState, useEffect } from "react";
import { 
  Key, Plus, Trash2, Copy, Check, ShieldAlert, Zap, 
  HelpCircle, RefreshCw, Terminal, CheckCircle2 
} from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  requests: number;
  rateLimit: number;
  active: boolean;
  createdAt: string;
  lastUsed: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");

  const fetchKeys = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/v1/keys/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUserPlan(u.plan || "free");
      } catch {}
    }
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key.");
      return;
    }

    if (userPlan !== "pro") {
      toast.error("API access requires a Pro subscription.");
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/v1/keys/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!res.ok) throw new Error("Failed to create API key");
      toast.success("API key generated successfully.");
      setNewKeyName("");
      fetchKeys();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Applications using this key will immediately fail.")) return;

    const token = localStorage.getItem("token");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/v1/keys/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to revoke API key");
      toast.success("API key revoked.");
      fetchKeys();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke key");
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success("API Key copied to clipboard.");
    } catch {
      toast.error("Failed to copy API key.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 text-white space-y-8 min-h-screen">
      <Toaster position="top-right" richColors />

      {/* Header section */}
      <div className="border-b border-zinc-900 pb-6 space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-gradient-to-r from-white via-zinc-100 to-cyan-300 bg-clip-text text-transparent">
          Developer API Keys
        </h1>
        <p className="text-zinc-400 text-sm">
          Generate API credentials to automate your file conversions and document processing pipelines.
        </p>
      </div>

      {userPlan !== "pro" ? (
        /* Gated State for Free Users */
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center max-w-xl mx-auto space-y-6">
          <div className="mx-auto w-16 h-16 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-zinc-100">API Access Locked</h3>
            <p className="text-xs text-zinc-400 leading-relaxed px-4">
              Building programmatic file integrations requires a ConvertHub Pro plan. Get API access with 100 requests per day, unlimited web conversions, and priority processing queues.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3.5 text-xs font-extrabold shadow shadow-cyan-500/5 transition-all"
          >
            Upgrade to Pro
            <Zap className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        /* API keys management dashboard for Pro Users */
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Create Key Card */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-zinc-100">Create New Key</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Name your key to easily track its usage in your developer projects.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Key Label</label>
                <input
                  type="text"
                  placeholder="e.g. Production Backend"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs outline-none focus:border-zinc-700 text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black py-3 text-xs font-extrabold shadow transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generate API Key
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Keys list */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Your Active API Credentials</h3>

            {loading ? (
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950/40 p-12 text-center text-zinc-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-cyan-500 mb-2" />
                <p className="text-xs font-semibold">Loading API keys...</p>
              </div>
            ) : keys.length === 0 ? (
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950/40 p-12 text-center text-zinc-500 italic space-y-1">
                <Terminal className="h-8 w-8 mx-auto text-zinc-800 mb-2" />
                <p className="text-xs font-semibold">No active API keys found</p>
                <p className="text-[10px] text-zinc-600">Create a key on the left to start automating conversions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {keys.map(item => (
                  <div 
                    key={item.id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">{item.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Created {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevoke(item.id)}
                        className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-950/10 transition"
                        title="Revoke Key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Copyable Key value */}
                    <div className="flex items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-850 p-3 rounded-2xl font-mono text-xs text-zinc-300">
                      <span className="truncate pr-4">{item.key}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.key)}
                        className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition shrink-0"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 border-t border-zinc-900 pt-4 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Usage Today</p>
                        <p className="font-semibold text-zinc-200 mt-0.5">{item.requests} / {item.rateLimit}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Rate Limit</p>
                        <p className="font-semibold text-zinc-200 mt-0.5">100 req/day</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Last Used</p>
                        <p className="font-semibold text-zinc-200 mt-0.5 truncate">
                          {item.lastUsed ? new Date(item.lastUsed).toLocaleTimeString() : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
