import Link from "next/link";
import type { ToolDefinition } from "@pdf-saas/shared";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { ArrowRight, Sparkles } from "lucide-react";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const theme = CATEGORY_THEME[tool.category] ?? CATEGORY_THEME.pdf;
  const Icon = theme.icon;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-zinc-400 dark:hover:border-zinc-600 ${theme.accentBorder}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${theme.accentBg} ${theme.accentBorder}`}
        >
          <Icon className={`h-5 w-5 ${theme.accent}`} />
        </span>
        {tool.popular && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Sparkles className="h-2.5 w-2.5" />
            Popular
          </span>
        )}
      </div>

      <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
        {tool.name}
      </h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted line-clamp-2">
        {tool.description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
          {tool.category}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${theme.accent} transition-transform group-hover:translate-x-0.5`}
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
