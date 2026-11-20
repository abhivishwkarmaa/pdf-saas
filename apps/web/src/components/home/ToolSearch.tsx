"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, Sparkles } from "lucide-react";
import { TOOLS, type ToolDefinition } from "@pdf-saas/shared";
import { CATEGORY_THEME } from "@/lib/category-theme";

const POPULAR_SUGGESTIONS = [
  { name: "Merge PDF", slug: "merge-pdf" },
  { name: "Compress PDF", slug: "compress-pdf" },
  { name: "PDF to Word", slug: "pdf-to-word" },
  { name: "Resize Image", slug: "resize-image" },
  { name: "Word to PDF", slug: "word-to-pdf" },
  { name: "Image to PDF", slug: "image-to-pdf" },
];

export function ToolSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = q.trim().toLowerCase();
  const results: ToolDefinition[] = trimmed.length > 0
    ? TOOLS.filter(
        (t) =>
          t.enabled &&
          (t.name.toLowerCase().includes(trimmed) ||
            t.description.toLowerCase().includes(trimmed) ||
            t.slug.includes(trimmed.replace(/\s+/g, "-")))
      ).slice(0, 7)
    : [];

  useEffect(() => {
    setSelectedIndex(0);
    setIsOpen(trimmed.length > 0);
  }, [trimmed]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        setIsOpen(false);
        router.push(`/tools/${selected.slug}`);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      setIsOpen(false);
      router.push(`/tools/${results[selectedIndex || 0].slug}`);
    }
  };

  return (
    <div ref={containerRef} className="relative mx-auto max-w-2xl text-left">
      <form onSubmit={onSubmit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              if (trimmed.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search for a tool... (e.g., PDF to Word, Compress Image, OCR)"
            className="w-full rounded-full border border-border bg-card py-4 pl-12 pr-12 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:focus:ring-violet-500/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Live Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
          {results.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <span>Matching Tools ({results.length})</span>
                <span className="text-[10px] text-zinc-400">↑↓ to navigate · Enter to open</span>
              </div>
              {results.map((tool, idx) => {
                const theme = CATEGORY_THEME[tool.category] || CATEGORY_THEME.pdf;
                const Icon = theme.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                      isSelected
                        ? "bg-violet-50 dark:bg-violet-950/40 text-foreground"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${theme.accentBg} ${theme.accentBorder}`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${theme.accent}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate text-zinc-900 dark:text-white">
                          {tool.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${theme.accentBg} ${theme.accent}`}
                        >
                          {tool.category}
                        </span>
                        {tool.popular && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted mt-0.5">
                        {tool.description}
                      </p>
                    </div>
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isSelected
                          ? "translate-x-0.5 text-violet-600 dark:text-violet-400"
                          : "text-zinc-300 dark:text-zinc-600"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted">
              No tools found matching &quot;{q}&quot;. Try searching for &quot;PDF&quot;, &quot;Resize&quot;, or &quot;Word&quot;.
            </div>
          )}
        </div>
      )}

      {/* Popular Quick Suggestions Chips */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
        <span className="text-zinc-500 flex items-center gap-1 mr-1 text-[11px] font-medium">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Popular:
        </span>
        {POPULAR_SUGGESTIONS.map((item) => (
          <Link
            key={item.slug}
            href={`/tools/${item.slug}`}
            className="rounded-full border border-border bg-card/60 px-3 py-1 font-medium text-zinc-600 transition hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 shadow-2xs"
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
