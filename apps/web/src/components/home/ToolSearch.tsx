"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { TOOLS } from "@pdf-saas/shared";

export function ToolSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim().toLowerCase();
    if (!query) return;
    const match = TOOLS.find(
      (t) =>
        t.enabled &&
        (t.name.toLowerCase().includes(query) ||
          t.slug.includes(query.replace(/\s+/g, "-")))
    );
    if (match) router.push(`/tools/${match.slug}`);
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for a tool... (e.g., PDF to Word, Compress Image)"
          className="w-full rounded-full border border-border bg-card py-4 pl-12 pr-4 text-sm text-foreground shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
        />
      </div>
    </form>
  );
}
