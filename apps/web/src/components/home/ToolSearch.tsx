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
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <div className="relative">
        <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-zinc-400 group-focus-within:text-purple-400 transition-colors" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 70+ free tools... (e.g., PDF to Word, Compress Image)"
          className="w-full px-14 py-5 rounded-2xl bg-white/5 border border-white/10 text-white text-lg placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 backdrop-blur-sm transition-all focus:ring-4 focus:ring-purple-500/10 shadow-2xl"
        />
      </div>
    </form>
  );
}
