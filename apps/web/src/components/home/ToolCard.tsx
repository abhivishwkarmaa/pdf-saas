import Link from "next/link";
import type { ToolDefinition } from "@pdf-saas/shared";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { ArrowRight } from "lucide-react";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const theme = CATEGORY_THEME[tool.category];
  const Icon = theme.icon;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${theme.accentBorder}`}
    >
      <span
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${theme.accentBg}`}
      >
        <Icon className={`h-6 w-6 ${theme.accent}`} />
      </span>
      <h3 className="font-semibold text-zinc-900 dark:text-white">{tool.name}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-zinc-500 line-clamp-2">
        {tool.description}
      </p>
      <span
        className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${theme.accent} opacity-0 transition group-hover:opacity-100`}
      >
        Open tool
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
