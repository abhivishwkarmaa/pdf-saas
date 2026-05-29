import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, AlertCircle, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "System Status — ConvertHub",
  description: "Real-time status of ConvertHub platform services.",
};

const SERVICES = [
  { name: "Web Application", status: "operational" as const, latency: "42ms" },
  { name: "PDF Processing Engine", status: "operational" as const, latency: "380ms" },
  { name: "Image Conversion", status: "operational" as const, latency: "210ms" },
  { name: "Video Processing", status: "operational" as const, latency: "1.2s" },
  { name: "AI Background Removal", status: "operational" as const, latency: "890ms" },
  { name: "AI Caption Generator", status: "operational" as const, latency: "1.5s" },
  { name: "File Storage (S3)", status: "operational" as const, latency: "95ms" },
  { name: "CDN (Cloudflare)", status: "operational" as const, latency: "18ms" },
  { name: "API Gateway", status: "operational" as const, latency: "55ms" },
];

const STATUS_META = {
  operational: { label: "Operational", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  degraded: { label: "Degraded", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  outage: { label: "Outage", icon: Circle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export default function StatusPage() {
  const allOperational = SERVICES.every(s => s.status === "operational");
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="relative border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.1),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <div className={`inline-flex items-center gap-2 rounded-full ${allOperational ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"} border px-4 py-1.5 text-sm font-medium mb-4`}>
            <span className={`h-2 w-2 rounded-full ${allOperational ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {allOperational ? "All Systems Operational" : "Partial Degradation"}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">System Status</h1>
          <p className="text-zinc-400">Last updated: {new Date().toUTCString()}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Core Services</h2>
        <div className="space-y-2">
          {SERVICES.map(({ name, status, latency }) => {
            const meta = STATUS_META[status];
            return (
              <div key={name} className={`flex items-center justify-between rounded-xl border ${meta.border} ${meta.bg} px-4 py-3`}>
                <div className="flex items-center gap-3">
                  <meta.icon className={`h-4 w-4 ${meta.color}`} />
                  <span className="text-sm font-medium text-white">{name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">{latency}</span>
                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h3 className="font-bold text-white mb-3">Recent Incidents</h3>
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            No incidents in the last 90 days.
          </div>
        </div>

        <p className="mt-6 text-xs text-zinc-600 text-center">
          Subscribe to status updates at <a href="mailto:status@converthub.io" className="text-violet-400 hover:underline">status@converthub.io</a>
        </p>
      </div>
    </div>
  );
}
