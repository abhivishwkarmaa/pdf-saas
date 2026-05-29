import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Users, Globe, Award, ArrowRight, CheckCircle2, Sparkles, Shield, Clock, Cpu } from "lucide-react";

export const metadata: Metadata = {
  title: "About ConvertHub — Our Mission",
  description: "Learn about ConvertHub — the AI-powered file conversion platform built for everyone.",
};

const STATS = [
  { value: "70+", label: "Free Tools" },
  { value: "10M+", label: "Files Processed" },
  { value: "190+", label: "Countries" },
  { value: "99.9%", label: "Uptime SLA" },
];

const VALUES = [
  { icon: Shield, title: "Privacy First", desc: "Files are never stored permanently. Auto-deleted within 1 hour. We never sell your data." },
  { icon: Sparkles, title: "AI-Powered", desc: "Smart compression, background removal, auto-captions, and image enhancement powered by ML." },
  { icon: Globe, title: "Accessible to All", desc: "Free for everyone, everywhere. No signup required for most tools." },
  { icon: Cpu, title: "Enterprise-Grade", desc: "Built on enterprise cloud infrastructure with 99.9% uptime and bank-grade security." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative border-b border-zinc-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(124,58,237,0.2),transparent)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-sm text-violet-300 mb-6">
            <Zap className="h-3.5 w-3.5" />
            About ConvertHub
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-5 bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            Building the World&apos;s Best<br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">File Conversion Platform</span>
          </h1>
          <p className="text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed">
            ConvertHub is an AI-powered online platform offering 70+ free tools for PDF, images, video, audio, and more — 
            with privacy-first architecture and enterprise-grade reliability.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-extrabold text-white mb-1">{value}</p>
              <p className="text-sm text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              We believe powerful file tools should be accessible to everyone — not locked behind expensive software subscriptions. 
              ConvertHub was built to democratize file processing with modern AI, enterprise infrastructure, and an obsession with privacy.
            </p>
            <p className="text-zinc-400 leading-relaxed mb-6">
              Every tool runs on our secure cloud infrastructure. Files are encrypted in transit, processed in isolation, and auto-deleted 
              within 1 hour. No signup required. No watermarks. No catch.
            </p>
            <Link href="/tools" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 text-sm font-semibold transition">
              Explore All Tools <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <Icon className="h-6 w-6 text-violet-400 mb-3" />
                <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-5xl px-4 pb-20">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.1),transparent)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold mb-3">Ready to convert your files?</h2>
            <p className="text-zinc-400 mb-6">No signup required. 70+ tools. Completely free.</p>
            <Link href="/tools" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-8 py-3.5 font-semibold transition hover:shadow-xl hover:shadow-violet-600/25">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
