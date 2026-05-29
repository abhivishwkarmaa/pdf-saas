import Link from "next/link";
import {
  TOOLS,
  TOOL_CATEGORIES,
  getPopularTools,
  type ToolCategory,
} from "@pdf-saas/shared";
import { ToolSearch } from "@/components/home/ToolSearch";
import { ToolCard } from "@/components/home/ToolCard";
import { CategorySection } from "@/components/home/CategorySection";
import { PopularPreview } from "@/components/home/PopularPreview";

export default function HomePage() {
  const popular = getPopularTools();
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-gradient-to-b from-card to-background px-4 py-16 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Free · Private · No signup
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
          Free Online File Converter
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Convert files between different formats instantly. PDF, images,
          documents, and more — {TOOLS.filter((t) => t.enabled).length}+ free
          tools, no signup required.
        </p>
        <ToolSearch />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-2 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Popular Tools
          </h2>
          <p className="mt-2 text-sm text-muted">
            Most used conversions and editors
          </p>
        </div>
        <PopularPreview />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {popular.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section id="all-tools" className="mx-auto max-w-6xl space-y-2 px-4 pb-20">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            All Tools
          </h2>
          <p className="mt-2 text-sm text-muted">
            Browse by category — each section includes a live UI preview
          </p>
        </div>
        {categories.map((cat, i) => {
          const tools = TOOLS.filter((t) => t.category === cat && t.enabled);
          return (
            <CategorySection
              key={cat}
              category={cat}
              tools={tools}
              index={i}
            />
          );
        })}
      </section>
    </div>
  );
}

