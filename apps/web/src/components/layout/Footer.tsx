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
  return (
    <footer className="relative w-full bg-zinc-50 dark:bg-[#060608] text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-white/5 px-[5vw] pt-20 pb-8 overflow-hidden">
      {/* Top gradient glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent dark:via-purple-500/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-purple-500/5 dark:bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main footer grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-8 mb-16">
        {/* Brand column — takes 2 cols */}
        <div className="col-span-2">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-900/30 group-hover:shadow-purple-500/50 transition-shadow">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
              CONVERTHUB
            </span>
          </Link>
          <p className="text-sm text-zinc-600 dark:text-zinc-500 leading-relaxed max-w-sm mb-6">
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
                className={`flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-200/50 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 ${color} transition-all duration-200 hover:scale-110 hover:-translate-y-0.5`}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Links columns */}
        {Object.entries(FOOTER_LINKS).map(([section, links]) => (
          <div key={section} className="col-span-1">
            <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
              {section}
            </h4>
            <ul className="space-y-3">
              {links.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-500 dark:hover:text-white text-sm transition-colors block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Trust badges strip — full width */}
      <div className="border-t border-zinc-200 dark:border-white/5 py-8 mb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {TRUST_BADGES.map(({ icon: Icon, label, color, bg }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-full ${bg} border border-zinc-200 dark:border-white/5 px-4 py-1.5 transition-transform hover:scale-105`}
            >
              <Icon className={`h-4 w-4 ${color} shrink-0`} />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-200 dark:border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-600">
            © {new Date().getFullYear()} ConvertHub. All rights reserved.
          </p>
          <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-400">All systems operational</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-600">
          <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-400 transition">Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-400 transition">Terms</Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-zinc-800 dark:hover:text-zinc-400 transition">Cookies</Link>
          <span>·</span>
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <span>English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
