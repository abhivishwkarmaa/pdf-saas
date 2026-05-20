import type { ToolCategory, ToolDefinition } from "@pdf-saas/shared";
import { TOOL_CATEGORIES } from "@pdf-saas/shared";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { ToolCard } from "./ToolCard";
import { CategoryPreview } from "./CategoryPreview";

interface CategorySectionProps {
  category: ToolCategory;
  tools: ToolDefinition[];
  index: number;
}

export function CategorySection({ category, tools, index }: CategorySectionProps) {
  const meta = TOOL_CATEGORIES[category];
  const theme = CATEGORY_THEME[category];
  const Icon = theme.icon;
  const altBg = index % 2 === 1;

  return (
    <section
      id={category}
      className={
        altBg
          ? "scroll-mt-20 rounded-3xl border border-border bg-card px-4 py-10 shadow-sm sm:px-8"
          : "scroll-mt-20 py-10"
      }
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${theme.accentBg} ${theme.accentBorder}`}
          >
            <Icon className={`h-7 w-7 ${theme.accent}`} />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {meta.label}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {meta.description}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
        >
          {tools.length} {tools.length === 1 ? "tool" : "tools"}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(260px,320px)_1fr] lg:items-start">
        <CategoryPreview category={category} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
