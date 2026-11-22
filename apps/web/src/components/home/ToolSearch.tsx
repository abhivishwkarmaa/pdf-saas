"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X, ArrowRight } from "lucide-react";
import { TOOLS, type ToolDefinition } from "@pdf-saas/shared";
import { getToolIcon } from "@/lib/tool-icons";

const POPULAR_SUGGESTIONS = [
  { name: "Merge PDF", slug: "merge-pdf" },
  { name: "Compress PDF", slug: "compress-pdf" },
  { name: "PDF to Word", slug: "pdf-to-word" },
  { name: "Resize Image", slug: "resize-image" },
  { name: "Word to PDF", slug: "word-to-pdf" },
  { name: "Image to PDF", slug: "image-to-pdf" },
  { name: "JSON Formatter", slug: "json-formatter" },
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
      ).slice(0, 8)
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

  // Keyboard shortcut '/' to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") ||
          (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              if (trimmed.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search 67+ tools... (e.g. Merge PDF, WebP to PNG, JSON, Format)"
            className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-20 text-sm text-foreground shadow-2xs outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/20"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {q ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                /
              </kbd>
            )}
          </div>
        </div>
      </form>

      {/* Live Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-xl">
          {results.length > 0 ? (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted">
                <span>Matching Tools ({results.length})</span>
                <span>↑↓ to navigate · Enter to open</span>
              </div>
              {results.map((tool, idx) => {
                const Icon = getToolIcon(tool.slug, tool.category);
                const isSelected = idx === selectedIndex;
                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800 text-foreground"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-zinc-700 dark:text-zinc-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                          {tool.name}
                        </span>
                        <span className="rounded px-1.5 py-0.2 text-[9px] font-mono uppercase border border-border text-zinc-500 bg-background">
                          {tool.category}
                        </span>
                        {tool.popular && (
                          <span className="rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted mt-0.5">
                        {tool.description}
                      </p>
                    </div>
                    <ArrowRight
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                        isSelected
                          ? "translate-x-0.5 text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-300 dark:text-zinc-600"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-muted">
              No tools matching &quot;{q}&quot;. Try searching for &quot;PDF&quot;, &quot;Resize&quot;, or &quot;JSON&quot;.
            </div>
          )}
        </div>
      )}

      {/* Popular Quick Suggestions Chips */}
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 text-xs">
        <span className="text-zinc-400 font-mono text-[11px] mr-1">
          Frequent:
        </span>
        {POPULAR_SUGGESTIONS.map((item) => (
          <Link
            key={item.slug}
            href={`/tools/${item.slug}`}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 transition hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
