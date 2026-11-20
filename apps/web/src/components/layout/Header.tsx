"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Image,
  Type,
  Calculator,
  Code2,
  Zap,
  Search,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Layers,
  CornerDownLeft,
  History,
  Trash2,
  Shield,
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
    description: "Merge, compress, convert & secure PDFs",
    tools: TOOLS.filter((t) => t.category === "pdf" && t.enabled).slice(0, 10),
  },
  {
    label: "Image",
    href: "/image-tools",
    icon: Image,
    color: "text-sky-400",
    description: "Convert, resize, crop & compress images",
    tools: TOOLS.filter((t) => t.category === "image" && t.enabled).slice(0, 10),
  },
  {
    label: "Text",
    href: "/text-tools",
    icon: Type,
    color: "text-emerald-400",
    description: "Markdown, Word, OCR & text formatters",
    tools: TOOLS.filter((t) => t.category === "text" && t.enabled).slice(0, 10),
  },
  {
    label: "Dev",
    href: "/developer-tools",
    icon: Code2,
    color: "text-cyan-400",
    description: "JSON, Base64, UUID, URL & code utilities",
    tools: TOOLS.filter((t) => t.category === "developer" && t.enabled).slice(0, 10),
  },
  {
    label: "Calculators",
    href: "/calculators",
    icon: Calculator,
    color: "text-orange-400",
    description: "Financial, unit, percentage & math tools",
    tools: TOOLS.filter((t) => t.category === "calculator" && t.enabled).slice(0, 10),
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | "all">("all");
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [recentTools, setRecentTools] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Load recent tools from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("converthub_recent_tools");
      if (saved) {
        setRecentTools(JSON.parse(saved));
      }
    } catch {}
  }, [searchOpen]);

  const recordRecentTool = (slug: string) => {
    try {
      const updated = [slug, ...recentTools.filter((s) => s !== slug)].slice(0, 5);
      setRecentTools(updated);
      localStorage.setItem("converthub_recent_tools", JSON.stringify(updated));
    } catch {}
    setSearchOpen(false);
  };

  const clearRecentTools = () => {
    setRecentTools([]);
    try {
      localStorage.removeItem("converthub_recent_tools");
    } catch {}
  };

  // Keyboard shortcut: Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setSelectedCategory("all");
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const matchingTools = searchQuery.trim().length > 0
    ? TOOLS.filter(
        (t) =>
          t.enabled &&
          (selectedCategory === "all" || t.category === selectedCategory) &&
          (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.slug.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // Reset activeIndex when query or category changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery, selectedCategory]);

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (matchingTools.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % matchingTools.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + matchingTools.length) % matchingTools.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetTool = matchingTools[activeIndex];
      if (targetTool) {
        recordRecentTool(targetTool.slug);
        router.push(`/tools/${targetTool.slug}`);
      }
    }
  };

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setActiveDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const recentToolItems = recentTools
    .map((slug) => TOOLS.find((t) => t.slug === slug))
    .filter((t): t is (typeof TOOLS)[0] => Boolean(t && t.enabled));

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

                {/* Two-Column Mega Dropdown */}
                {activeDropdown === item.label && item.tools.length > 0 && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-[440px] rounded-2xl border border-zinc-200/90 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-zinc-800/90 dark:bg-zinc-900/95 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
                    onMouseEnter={() => handleDropdownEnter(item.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <div className="p-3.5">
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 shadow-xs border border-zinc-200/60 dark:border-zinc-700/60">
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 block">
                              {item.label} Suite
                            </span>
                            <span className="text-[10px] text-zinc-500 line-clamp-1">
                              {item.description}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={item.href}
                          className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-0.5 shrink-0"
                        >
                          View all <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>

                      {/* 2-Column Tools Grid */}
                      <div className="grid grid-cols-2 gap-1">
                        {item.tools.map((tool) => (
                          <Link
                            key={tool.slug}
                            href={`/tools/${tool.slug}`}
                            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-white transition group"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-violet-600 dark:group-hover:bg-violet-400 transition-colors shrink-0" />
                            <span className="truncate">{tool.name}</span>
                          </Link>
                        ))}
                      </div>

                      {/* Bottom Quick Feature Notice */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/70 flex items-center justify-between px-2 text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Shield className="h-3 w-3 text-emerald-500" />
                          Client & Server Sandbox
                        </span>
                        <span>Zero sign-in required</span>
                      </div>
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
              {searchQuery.length > 1 && matchingTools.length > 0 && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden mb-2">
                  {matchingTools.slice(0, 5).map(tool => (
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

      {/* Global Search Modal / Command Palette */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-14 sm:pt-20 px-4"
          onClick={() => setSearchOpen(false)}
          onKeyDown={handleModalKeyDown}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div
            className="relative w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleModalKeyDown}
                placeholder="Type a tool name or action (e.g. merge, compress, resize)..."
                className="flex-1 bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-[10px] font-mono border border-zinc-200 dark:border-zinc-700">
                  ESC
                </kbd>
              </button>
            </div>

            {/* Scope / Category Filter Pills */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-850 overflow-x-auto text-xs no-scrollbar bg-zinc-50/50 dark:bg-zinc-900/40">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  selectedCategory === "all"
                    ? "bg-violet-600 text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                All
              </button>
              {(["pdf", "image", "text", "developer", "calculator"] as const).map((cat) => {
                const labels: Record<string, string> = {
                  pdf: "PDF",
                  image: "Image",
                  text: "Text",
                  developer: "Developer",
                  calculator: "Calculators",
                };
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      isSelected
                        ? "bg-violet-600 text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {labels[cat]}
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {searchQuery.trim().length > 0 ? (
                matchingTools.length > 0 ? (
                  <div className="space-y-4 p-1">
                    {/* Render grouped by categories */}
                    {(["pdf", "image", "text", "developer", "calculator"] as const).map((cat) => {
                      const toolsInCat = matchingTools.filter((t) => t.category === cat);
                      if (toolsInCat.length === 0) return null;

                      const catLabels: Record<string, string> = {
                        pdf: "PDF Tools",
                        image: "Image Tools",
                        text: "Document & Text Tools",
                        developer: "Developer Utilities",
                        calculator: "Calculators",
                      };

                      return (
                        <div key={cat} className="space-y-1">
                          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            {catLabels[cat]}
                          </p>
                          <div className="space-y-1">
                            {toolsInCat.map((tool) => {
                              const itemIndex = matchingTools.findIndex(
                                (m) => m.slug === tool.slug
                              );
                              const isHighlighted = itemIndex === activeIndex;

                              return (
                                <Link
                                  key={tool.slug}
                                  href={`/tools/${tool.slug}`}
                                  onClick={() => recordRecentTool(tool.slug)}
                                  onMouseEnter={() => setActiveIndex(itemIndex)}
                                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition border ${
                                    isHighlighted
                                      ? "bg-violet-50/80 border-violet-200 text-violet-950 dark:bg-violet-950/40 dark:border-violet-800/80 dark:text-violet-100"
                                      : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate">
                                      {tool.name}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                      {tool.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    {isHighlighted ? (
                                      <span className="flex items-center gap-1 rounded bg-violet-200/60 dark:bg-violet-900/60 px-1.5 py-0.5 text-[10px] font-mono text-violet-800 dark:text-violet-200">
                                        <CornerDownLeft className="h-3 w-3" />
                                        <span>Select</span>
                                      </span>
                                    ) : (
                                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 opacity-40" />
                                    )}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-sm">
                    No matching tools found for &quot;
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {searchQuery}
                    </span>
                    &quot;
                  </div>
                )
              ) : (
                <div className="p-2 space-y-4">
                  {/* Recent Tools */}
                  {recentToolItems.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          <History className="h-3 w-3" />
                          Recently Used
                        </span>
                        <button
                          type="button"
                          onClick={clearRecentTools}
                          className="text-[10px] font-medium text-zinc-400 hover:text-red-500 transition"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-1">
                        {recentToolItems.map((tool) => (
                          <Link
                            key={tool.slug}
                            href={`/tools/${tool.slug}`}
                            onClick={() => recordRecentTool(tool.slug)}
                            className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition group"
                          >
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                              {tool.name}
                            </span>
                            <ArrowRight className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categories Quick Links */}
                  <div className="space-y-1">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Browse Categories
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {NAV_ITEMS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 p-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                        >
                          <item.icon className={`h-4 w-4 ${item.color}`} />
                          <span>{item.label} Suite</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Keyboard Navigation Hints Footer */}
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">↑↓</kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">↵</kbd>
                  <span>select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">esc</kbd>
                  <span>close</span>
                </span>
              </div>
              <Link
                href="/tools"
                onClick={() => setSearchOpen(false)}
                className="font-medium text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-0.5"
              >
                All 70+ Tools →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
