"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText, Image, Video, Type, Calculator, Code2, Sparkles,
  Music, Zap, Search, Menu, X, ChevronDown, ArrowRight,
  Layers, Wand2, Shield, Globe,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TOOLS, type ToolCategory } from "@pdf-saas/shared";

// ─── Nav Config ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "PDF",
    href: "/pdf-tools",
    icon: FileText,
    color: "text-rose-400",
    tools: TOOLS.filter(t => t.category === "pdf" && t.enabled).slice(0, 8),
  },
  {
    label: "Image",
    href: "/image-tools",
    icon: Image,
    color: "text-sky-400",
    tools: TOOLS.filter(t => t.category === "image" && t.enabled).slice(0, 8),
  },
  {
    label: "Video",
    href: "/video-tools",
    icon: Video,
    color: "text-violet-400",
    tools: TOOLS.filter(t => t.category === "video" && t.enabled).slice(0, 8),
  },
  {
    label: "Text",
    href: "/text-tools",
    icon: Type,
    color: "text-emerald-400",
    tools: TOOLS.filter(t => t.category === "text" && t.enabled).slice(0, 8),
  },
  {
    label: "AI Tools",
    href: "/ai-tools",
    icon: Sparkles,
    color: "text-fuchsia-400",
    tools: TOOLS.filter(t => t.enabled).slice(0, 8),
  },
  {
    label: "Dev",
    href: "/developer-tools",
    icon: Code2,
    color: "text-cyan-400",
    tools: TOOLS.filter(t => t.category === "developer" && t.enabled).slice(0, 8),
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [pathname]);

  // keyboard shortcut: Ctrl+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") { setSearchOpen(false); setMobileOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const searchResults = searchQuery.length > 1
    ? TOOLS.filter(t => t.enabled && (
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )).slice(0, 6)
    : [];

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setActiveDropdown(label);
  };
  const handleDropdownLeave = () => {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-zinc-200/80 bg-white/95 dark:border-zinc-800/80 dark:bg-zinc-950/95 shadow-sm"
            : "border-b border-transparent bg-white/80 dark:bg-zinc-950/80"
        } backdrop-blur-xl text-zinc-900 dark:text-white`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="flex shrink-0 items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/20 group-hover:shadow-violet-600/40 transition-shadow">
              <Zap className="h-4.5 w-4.5" />
            </span>
            <span className="hidden sm:inline font-extrabold text-lg tracking-tight">
              CONVERT<span className="text-violet-600 dark:text-violet-400">HUB</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => handleDropdownEnter(item.label)}
                onMouseLeave={handleDropdownLeave}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-white"
                  }`}
                >
                  <item.icon className={`h-3.5 w-3.5 ${isActive(item.href) ? "text-violet-600 dark:text-violet-400" : item.color}`} />
                  {item.label}
                  {item.tools.length > 0 && (
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${activeDropdown === item.label ? "rotate-180" : ""}`} />
                  )}
                </Link>

                {/* Mega Dropdown */}
                {activeDropdown === item.label && item.tools.length > 0 && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 rounded-2xl border border-zinc-200/80 bg-white/95 backdrop-blur-xl shadow-xl dark:border-zinc-700/80 dark:bg-zinc-900/95 overflow-hidden"
                    onMouseEnter={() => handleDropdownEnter(item.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <div className="p-1.5">
                      <div className={`flex items-center gap-2 px-3 py-2 mb-1 rounded-lg ${item.color.replace("text-", "bg-").replace("-400", "-50")} dark:bg-zinc-800`}>
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{item.label}</span>
                      </div>
                      {item.tools.map((tool) => (
                        <Link
                          key={tool.slug}
                          href={`/tools/${tool.slug}`}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <span className="truncate">{tool.name}</span>
                          <ArrowRight className="h-3 w-3 ml-auto text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ))}
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors mt-1 border-t border-zinc-100 dark:border-zinc-800 pt-2"
                      >
                        View all {item.label} tools <ArrowRight className="h-3 w-3 ml-auto" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Search button */}
            <button
              onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 transition"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search tools...</span>
              <kbd className="ml-2 rounded bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500">⌘K</kbd>
            </button>

            <ThemeToggle />

            <Link
              href="/tools"
              className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-violet-600/25 sm:inline-flex"
            >
              <Layers className="h-3.5 w-3.5" />
              All Tools
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 lg:hidden transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 lg:hidden">
            <div className="mx-auto max-w-7xl px-4 py-4 space-y-1">
              {/* Mobile search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>
              {searchQuery.length > 1 && searchResults.length > 0 && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden mb-2">
                  {searchResults.map(tool => (
                    <Link key={tool.slug} href={`/tools/${tool.slug}`}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                      <Search className="h-3.5 w-3.5 text-zinc-400" />
                      {tool.name}
                    </Link>
                  ))}
                </div>
              )}
              {NAV_ITEMS.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive(item.href)
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    {item.label} Tools
                  </Link>
                </div>
              ))}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Link href="/faq" className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm text-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">FAQ</Link>
                <Link href="/contact" className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm text-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">Contact</Link>
              </div>
              <Link href="/tools" className="flex items-center justify-center gap-2 w-full mt-1 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition">
                <Layers className="h-4 w-4" />
                All Tools
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search 70+ tools…"
                className="flex-1 bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none"
              />
              <button onClick={() => setSearchOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-[10px] font-mono">ESC</kbd>
              </button>
            </div>
            {searchQuery.length > 1 ? (
              searchResults.length > 0 ? (
                <div>
                  {searchResults.map(tool => (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition group"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800">
                        <Wand2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{tool.name}</p>
                        <p className="text-xs text-zinc-500">{tool.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 ml-auto text-zinc-400 opacity-0 group-hover:opacity-100 transition" />
                    </Link>
                  ))}
                  <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{searchResults.length} results</span>
                    <Link href="/tools" onClick={() => setSearchOpen(false)} className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline">
                      Browse all tools →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No tools found for &quot;<strong>{searchQuery}</strong>&quot;
                </div>
              )
            ) : (
              <div className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-semibold">Quick Links</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {NAV_ITEMS.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    >
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      {item.label} Tools
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
