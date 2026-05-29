"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Twitter,
  Linkedin,
  Github,
  Instagram,
  Youtube,
  MessageCircle,
  Shield,
  Zap,
  Lock,
  Cloud,
  Cpu,
  Trash2,
  CheckCircle2,
  Building2,
  Mail,
  ArrowRight,
  Globe,
  FileText,
  Image,
  Video,
  Type,
  Code2,
  Sparkles,
  Calculator,
  Music,
  ExternalLink,
} from "lucide-react";

// ─── Data ──────────────────────────────────────────────────────────────────────

const FOOTER_LINKS = {
  "PDF Tools": [
    { label: "PDF to Word", href: "/tools/pdf-to-word" },
    { label: "PDF to JPG", href: "/tools/pdf-to-jpg" },
    { label: "Merge PDF", href: "/tools/merge-pdf" },
    { label: "Compress PDF", href: "/tools/compress-pdf" },
    { label: "Split PDF", href: "/tools/split-pdf" },
    { label: "Protect PDF", href: "/tools/protect-pdf" },
    { label: "Unlock PDF", href: "/tools/unlock-pdf" },
    { label: "OCR PDF", href: "/tools/ocr-pdf" },
  ],
  "Image Tools": [
    { label: "Image Converter", href: "/tools/jpg-to-png" },
    { label: "Image Compressor", href: "/tools/compress-image" },
    { label: "Background Remover", href: "/tools/image-editor" },
    { label: "Image Editor", href: "/tools/image-editor" },
    { label: "Resize Image", href: "/tools/resize-image" },
    { label: "Crop Image", href: "/tools/crop-image" },
    { label: "AI Image Enhancer", href: "/tools/image-editor" },
    { label: "Image to PDF", href: "/tools/jpg-to-pdf" },
  ],
  "Video Tools": [
    { label: "Video Converter", href: "/tools/video-converter" },
    { label: "Video Compressor", href: "/tools/compress-video" },
    { label: "Video Editor", href: "/tools/video-editor" },
    { label: "Video Trimmer", href: "/tools/video-editor" },
    { label: "Merge Videos", href: "/tools/video-editor" },
    { label: "Video to GIF", href: "/tools/video-to-gif" },
    { label: "AI Subtitle Generator", href: "/tools/video-editor" },
    { label: "Audio Extractor", href: "/tools/extract-audio" },
  ],
  "AI Tools": [
    { label: "AI Image Enhancer", href: "/tools/image-editor" },
    { label: "AI Video Enhancer", href: "/tools/video-editor" },
    { label: "AI Caption Generator", href: "/tools/video-editor" },
    { label: "AI Compression", href: "/tools/compress-image" },
    { label: "AI Thumbnail Generator", href: "/tools/image-editor" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Press Kit", href: "/press" },
    { label: "Contact", href: "/contact" },
  ],
  Support: [
    { label: "Help Center", href: "/faq" },
    { label: "FAQ", href: "/faq" },
    { label: "Report Issue", href: "/contact" },
    { label: "Community", href: "/contact" },
    { label: "Status Page", href: "/status" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "DMCA Policy", href: "/dmca" },
    { label: "Data Protection", href: "/privacy" },
  ],
};

const TRUST_BADGES = [
  { icon: Shield, label: "SSL Secured", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { icon: Lock, label: "End-to-End Encrypted", color: "text-blue-400", bg: "bg-blue-400/10" },
  { icon: Trash2, label: "Auto File Deletion", color: "text-orange-400", bg: "bg-orange-400/10" },
  { icon: Cpu, label: "AI-Powered", color: "text-violet-400", bg: "bg-violet-400/10" },
  { icon: Cloud, label: "Cloud Processing", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  { icon: Zap, label: "Fast Conversion", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { icon: CheckCircle2, label: "No Watermark", color: "text-pink-400", bg: "bg-pink-400/10" },
  { icon: Building2, label: "Enterprise-grade", color: "text-indigo-400", bg: "bg-indigo-400/10" },
];

const TOOL_CATEGORIES = [
  { icon: FileText, label: "PDF Tools", href: "/#pdf", color: "text-rose-400" },
  { icon: Image, label: "Image Tools", href: "/#image", color: "text-sky-400" },
  { icon: Video, label: "Video Tools", href: "/#video", color: "text-violet-400" },
  { icon: Music, label: "Audio Tools", href: "/#audio", color: "text-amber-400" },
  { icon: Type, label: "Text Tools", href: "/#text", color: "text-emerald-400" },
  { icon: Code2, label: "Developer Tools", href: "/#developer", color: "text-cyan-400" },
  { icon: Sparkles, label: "AI Tools", href: "/#ai", color: "text-fuchsia-400" },
  { icon: Calculator, label: "Calculators", href: "/#calculator", color: "text-orange-400" },
];

const SOCIALS = [
  { icon: Twitter, label: "Twitter / X", href: "https://twitter.com", color: "hover:text-sky-400" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com", color: "hover:text-blue-400" },
  { icon: Github, label: "GitHub", href: "https://github.com", color: "hover:text-white" },
  { icon: Instagram, label: "Instagram", href: "https://instagram.com", color: "hover:text-pink-400" },
  { icon: Youtube, label: "YouTube", href: "https://youtube.com", color: "hover:text-red-400" },
  { icon: MessageCircle, label: "Discord", href: "https://discord.com", color: "hover:text-indigo-400" },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="relative bg-zinc-950 text-white overflow-hidden">
      {/* Top gradient glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Trust badges strip */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
            {TRUST_BADGES.map(({ icon: Icon, label, color, bg }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-full ${bg} border border-white/5 px-3 py-1.5 transition-transform hover:scale-105`}
              >
                <Icon className={`h-3.5 w-3.5 ${color} shrink-0`} />
                <span className="text-xs font-medium text-zinc-300 whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer body */}
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-8">

        {/* Top section: Brand + Newsletter */}
        <div className="mb-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/30 group-hover:shadow-violet-600/40 transition-shadow">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                CONVERTHUB
              </span>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mb-5">
              The all-in-one file conversion platform. 70+ free tools for PDF, images, video, audio, and more. 
              No signup. No watermark. Privacy first.
            </p>
            {/* Socials */}
            <div className="flex items-center gap-2">
              {SOCIALS.map(({ icon: Icon, label, href, color }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 ${color} transition-all duration-200 hover:scale-110 hover:-translate-y-0.5`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Tool categories quick nav */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Product Tools
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {TOOL_CATEGORIES.map(({ icon: Icon, label, href, color }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all duration-200 group"
                >
                  <Icon className={`h-3.5 w-3.5 ${color} shrink-0 group-hover:scale-110 transition-transform`} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Newsletter
            </p>
            <h3 className="mb-2 text-base font-bold text-white">
              Get updates & new tools
            </h3>
            <p className="mb-4 text-sm text-zinc-400">
              We&apos;ll notify you when new tools, features, and AI upgrades are released.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-300 font-medium">You&apos;re subscribed!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none text-sm text-white placeholder-zinc-600 pl-9 pr-3 py-2.5 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-violet-600/25 flex items-center gap-1.5"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
            <p className="mt-2 text-xs text-zinc-600">No spam. Unsubscribe anytime.</p>
          </div>
        </div>

        {/* Links grid */}
        <div className="border-t border-zinc-800/60 pt-10 mb-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-7">
            {Object.entries(FOOTER_LINKS).map(([section, links]) => (
              <div key={section}>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  {section}
                </p>
                <ul className="space-y-2">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        onMouseEnter={() => setHoveredLink(`${section}-${label}`)}
                        onMouseLeave={() => setHoveredLink(null)}
                        className={`text-sm transition-all duration-150 flex items-center gap-1 group ${
                          hoveredLink === `${section}-${label}`
                            ? "text-white"
                            : "text-zinc-500 hover:text-zinc-200"
                        }`}
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform duration-150">
                          {label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-zinc-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} ConvertHub. All rights reserved.
            </p>
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400">All systems operational</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <Link href="/privacy" className="hover:text-zinc-400 transition">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-zinc-400 transition">Terms</Link>
            <span>·</span>
            <Link href="/cookies" className="hover:text-zinc-400 transition">Cookies</Link>
            <span>·</span>
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              <span>English</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
