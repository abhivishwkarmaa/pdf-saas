"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import type { ToolCategory, ToolDefinition } from "@pdf-saas/shared";
import { TOOL_CATEGORIES } from "@pdf-saas/shared";
import { BreadcrumbNav } from "@/components/navigation/BreadcrumbNav";
import { getToolIcon } from "@/lib/tool-icons";
import { THEME_CONFIG } from "@/lib/theme-config";
import {
  Search,
  X,
  ArrowRight,
  ArrowUpRight,
  Grid,
  List,
  SearchX,
  SlidersHorizontal,
  Zap,
  Shield,
  FileText,
  Image as ImageIcon,
  Type,
  Code2,
  Calculator,
} from "lucide-react";

interface ToolsDirectoryProps {
  tools: ToolDefinition[];
  categories: ToolCategory[];
}

export { THEME_CONFIG };

export function ToolsDirectory({ tools, categories }: ToolsDirectoryProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | ToolCategory>("all");
  const [popularOnly, setPopularOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut to focus search (/ or Cmd/Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" &&
          (e.target as HTMLElement).tagName !== "INPUT" &&
          (e.target as HTMLElement).tagName !== "TEXTAREA") ||
        (e.key === "k" && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const trimmedQuery = search.trim().toLowerCase();

  // Filter tools
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      if (activeCategory !== "all" && tool.category !== activeCategory) {
        return false;
      }
      if (popularOnly && !tool.popular) {
        return false;
      }
      if (!trimmedQuery) {
        return true;
      }
      return (
        tool.name.toLowerCase().includes(trimmedQuery) ||
        tool.description.toLowerCase().includes(trimmedQuery) ||
        tool.slug.toLowerCase().includes(trimmedQuery) ||
        tool.category.toLowerCase().includes(trimmedQuery) ||
        (tool.accept && tool.accept.some((ext) => ext.toLowerCase().includes(trimmedQuery)))
      );
    });
  }, [tools, activeCategory, popularOnly, trimmedQuery]);

  // Frequently used utilities (Top 8 for a well-proportioned 4-col grid)
  const frequentlyUsed = useMemo(() => {
    return tools.filter((t) => t.popular).slice(0, 8);
  }, [tools]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tools.length };
    for (const cat of categories) {
      counts[cat] = tools.filter((t) => t.category === cat).length;
    }
    return counts;
  }, [tools, categories]);

  // Group filtered tools by category if on "all" and not actively searching
  const groupedByCategory = useMemo(() => {
    if (activeCategory !== "all" || trimmedQuery.length > 0) return null;
    return categories
      .map((cat) => ({
        category: cat,
        meta: TOOL_CATEGORIES[cat],
        tools: filteredTools.filter((t) => t.category === cat),
      }))
      .filter((g) => g.tools.length > 0);
  }, [activeCategory, trimmedQuery, categories, filteredTools]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* 1. Header with Subtle Glow Background */}
      <div className="relative border-b border-border bg-gradient-to-b from-violet-50/70 via-background to-background dark:from-violet-950/20 dark:via-background dark:to-background overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(139,92,246,0.12),transparent)] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4">
            <BreadcrumbNav
              items={[
                { label: "Home", href: "/" },
                { label: "All Tools" },
              ]}
              showHomeIcon
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pt-2 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-900/60 bg-violet-50/80 dark:bg-violet-950/40 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-3 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">{tools.length} Utilities Active</span>
                <span className="text-violet-300 dark:text-violet-700">·</span>
                <span>Client-Side WASM</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                All Tools{" "}
                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Directory
                </span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                Direct access to client-side document, image, and developer utilities. Fast, private, and executed locally in your browser memory.
              </p>
            </div>

            {/* Visual Spec Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-violet-200/80 dark:border-violet-900/60 bg-card/80 backdrop-blur-xs px-3.5 py-2 shadow-2xs">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none">
                    Zero Cloud Uploads
                  </p>
                  <p className="text-[10px] text-muted mt-1 leading-none">100% In-Browser RAM</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-card/80 backdrop-blur-xs px-3.5 py-2 shadow-2xs">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none">
                    Unrestricted
                  </p>
                  <p className="text-[10px] text-muted mt-1 leading-none">No Signups or Quotas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Command & Control Bar (Sticky) */}
        <div className="sticky top-16 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 bg-background/95 backdrop-blur-md border-b border-border mb-8 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input Box with Theme Focus */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools by name, format, or keyword (e.g. compress, webp, json)..."
                className="w-full h-10 rounded-xl border border-border bg-card pl-9 pr-20 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {search ? (
                  <button
                    onClick={() => setSearch("")}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Quick Controls: Popular toggle & View switcher */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                onClick={() => setPopularOnly(!popularOnly)}
                className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  popularOnly
                    ? "border-amber-400 bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-2xs"
                    : "border-border bg-card text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Popular Only</span>
              </button>

              <div className="flex items-center border border-border rounded-lg bg-card p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md text-xs transition ${
                    viewMode === "grid"
                      ? "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  }`}
                  title="Grid view"
                >
                  <Grid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={`p-1.5 rounded-md text-xs transition ${
                    viewMode === "compact"
                      ? "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  }`}
                  title="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter Tabs with Exact Theme Accents */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 scrollbar-none">
            {/* All Utilities Tab */}
            <button
              onClick={() => setActiveCategory("all")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "all"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25"
                  : "bg-card border border-border text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300"
              }`}
            >
              <Zap className={`h-3.5 w-3.5 ${activeCategory === "all" ? "text-white" : "text-violet-600 dark:text-violet-400"}`} />
              <span>All Utilities</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeCategory === "all"
                    ? "bg-white/20 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {categoryCounts.all}
              </span>
            </button>

            {/* Category-Specific Colored Tabs */}
            {categories.map((cat) => {
              const theme = THEME_CONFIG[cat];
              const CatIcon = theme.icon;
              const count = categoryCounts[cat] || 0;
              const isActive = activeCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? `${theme.activeTab} text-white shadow-md`
                      : `bg-card ${theme.border} ${theme.accent} hover:bg-zinc-50 dark:hover:bg-zinc-800/60`
                  }`}
                >
                  <CatIcon className={`h-3.5 w-3.5 ${isActive ? "text-white" : theme.accent}`} />
                  <span>{theme.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : `${theme.bg} ${theme.accent}`
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Frequently Used Spotlight (4-Col Grid with vibrant theme icons) */}
        {!search && activeCategory === "all" && !popularOnly && (
          <div className="mb-14">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-mono flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                  Frequently Used Utilities
                </h2>
                <p className="text-xs text-muted mt-0.5">High-frequency document, image, and code operations</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {frequentlyUsed.map((tool) => (
                <ToolCardItem key={tool.slug} tool={tool} />
              ))}
            </div>
          </div>
        )}

        {/* Active Results Status */}
        <div className="flex items-center justify-between mb-5 text-xs text-muted">
          <div>
            Showing <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filteredTools.length}</span>{" "}
            {filteredTools.length === 1 ? "tool" : "tools"}
            {search && (
              <span>
                {" "}
                for query <span className="font-mono text-zinc-800 dark:text-zinc-200">"{search}"</span>
              </span>
            )}
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Reset Search
            </button>
          )}
        </div>

        {/* No Results Empty State */}
        {filteredTools.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-16 px-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 text-violet-600 dark:text-violet-400 mb-4">
              <SearchX className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              No matching tools found
            </h3>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              No utilities match your search "{search}". Try searching for another format like "pdf", "image", or "json".
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
                setPopularOnly(false);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 px-4 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* 4. Render By Category Sections */}
        {groupedByCategory ? (
          <div className="space-y-14">
            {groupedByCategory.map(({ category, meta, tools: catTools }) => {
              const theme = THEME_CONFIG[category];
              const CatIcon = theme.icon;

              return (
                <section key={category} id={category} className="scroll-mt-32">
                  <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${theme.bg} ${theme.border} ${theme.accent}`}>
                        <CatIcon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          {meta.label}
                          <span className="text-xs font-mono font-normal text-muted">
                            ({catTools.length})
                          </span>
                        </h2>
                        <p className="text-xs text-muted">{meta.description}</p>
                      </div>
                    </div>

                    <Link
                      href={`/${category === "calculator" ? "calculators" : category + "-tools"}`}
                      className={`text-xs font-semibold ${theme.accent} hover:underline transition flex items-center gap-1 shrink-0`}
                    >
                      Dedicated View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {viewMode === "grid" ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {catTools.map((tool) => (
                        <ToolCardItem key={tool.slug} tool={tool} />
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border bg-card">
                      {catTools.map((tool) => (
                        <ToolRowItem key={tool.slug} tool={tool} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          /* Flat list for Search / Filtered Views */
          filteredTools.length > 0 && (
            <div>
              {viewMode === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredTools.map((tool) => (
                    <ToolCardItem key={tool.slug} tool={tool} />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border bg-card">
                  {filteredTools.map((tool) => (
                    <ToolRowItem key={tool.slug} tool={tool} />
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Theme-Accented Card Component ──────────────────────────────────────────
function ToolCardItem({ tool }: { tool: ToolDefinition }) {
  const Icon = getToolIcon(tool.slug, tool.category);
  const theme = THEME_CONFIG[tool.category];

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`group flex flex-col justify-between rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-card p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${theme.hoverBorder}`}
    >
      <div>
        <div className="flex items-center justify-between mb-3.5">
          {/* Distinct category-colored icon container */}
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${theme.bg} ${theme.border} ${theme.accent} shadow-2xs group-hover:scale-105 transition-transform`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.popular && (
              <span className="rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                Popular
              </span>
            )}
            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border ${theme.badge}`}>
              {theme.shortLabel}
            </span>
          </div>
        </div>

        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {tool.name}
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {tool.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted">
        <span className="font-mono text-[10px] uppercase text-zinc-400">
          WASM · Local
        </span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${theme.accent} transition-transform group-hover:translate-x-0.5`}
        >
          Launch
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ─── Compact Row View for Power Users ───────────────────────────────────────
function ToolRowItem({ tool }: { tool: ToolDefinition }) {
  const Icon = getToolIcon(tool.slug, tool.category);
  const theme = THEME_CONFIG[tool.category];

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex items-center justify-between gap-4 p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${theme.bg} ${theme.border} ${theme.accent}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400">
              {tool.name}
            </span>
            <span className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${theme.badge}`}>
              {theme.shortLabel}
            </span>
            {tool.popular && (
              <span className="rounded px-1.5 py-0.2 text-[9px] font-mono font-bold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                Popular
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 max-w-xl">
            {tool.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline font-mono text-[10px] text-zinc-400 uppercase">
          WASM
        </span>
        <ArrowRight className={`h-3.5 w-3.5 ${theme.accent} group-hover:translate-x-0.5 transition-all`} />
      </div>
    </Link>
  );
}
