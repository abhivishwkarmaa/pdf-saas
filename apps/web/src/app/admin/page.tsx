"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  Mail,
  Lightbulb,
  TrendingUp,
  Globe,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard metrics");
        }

        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Stats fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <span className="h-8 w-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-2" />
        <p className="text-zinc-500 text-sm">Loading metrics summaries...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-10 w-10 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Failed to Load Dashboard</h3>
        <p className="text-zinc-500 text-sm max-w-xs">
          An error occurred while loading server statistics. Please ensure the backend database is running.
        </p>
      </div>
    );
  }

  const METRIC_CARDS = [
    {
      title: "Total Subscribers",
      value: stats.subscribers.total,
      sub: `${stats.subscribers.active} active • ${stats.subscribers.pending} pending`,
      icon: Users,
      color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-400",
    },
    {
      title: "Unread Messages",
      value: stats.messages.unread,
      sub: `${stats.messages.total - stats.messages.unread - stats.messages.resolved} read • ${stats.messages.resolved} resolved`,
      icon: Mail,
      color: "from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-400",
    },
    {
      title: "Pending Suggestions",
      value: stats.suggestions.pending,
      sub: `${stats.suggestions.planned} planned • ${stats.suggestions.inProgress} in progress`,
      icon: Lightbulb,
      color: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Overview</h1>
        <p className="text-zinc-500 text-sm mt-1">Real-time statistics for the ConvertHub communications hub.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {METRIC_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`rounded-2xl border bg-zinc-900/40 p-6 backdrop-blur-sm bg-gradient-to-br ${card.color.split(" ").slice(0, 2).join(" ")} ${card.color.split(" ")[2]}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl bg-white/5 border border-white/5`}>
                  <Icon className={`h-5 w-5 ${card.color.split(" ")[3]}`} />
                </div>
              </div>
              <p className="text-4xl font-extrabold text-white tracking-tight mb-2">
                {card.value}
              </p>
              <p className="text-xs text-zinc-500 font-medium">
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Analytics breakdown lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Suggestion Categories */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-sm">
          <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
            <Lightbulb className="h-4.5 w-4.5 text-violet-400" />
            Suggestions by Category
          </h3>
          <div className="space-y-3">
            {stats.breakdowns.suggestionsByCategory.length === 0 ? (
              <p className="text-zinc-600 text-xs py-4 text-center">No suggestions recorded yet.</p>
            ) : (
              stats.breakdowns.suggestionsByCategory.map((cat: any) => (
                <div key={cat._id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-400">{cat._id}</span>
                    <span className="text-white">{cat.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className="h-full bg-violet-600 rounded-full"
                      style={{
                        width: `${Math.min(100, (cat.count / Math.max(1, stats.suggestions.total)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Newsletter Signup Sources */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-sm">
          <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
            <Globe className="h-4.5 w-4.5 text-emerald-400" />
            Subscribers by Source
          </h3>
          <div className="space-y-3">
            {stats.breakdowns.subscribersBySource.length === 0 ? (
              <p className="text-zinc-600 text-xs py-4 text-center">No newsletter signups yet.</p>
            ) : (
              stats.breakdowns.subscribersBySource.map((src: any) => (
                <div key={src._id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-400 capitalise">{src._id}</span>
                    <span className="text-white">{src.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (src.count / Math.max(1, stats.subscribers.total)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
