import Link from "next/link";
import type { ToolDefinition } from "@pdf-saas/shared";
import { getToolIcon } from "@/lib/tool-icons";
import { THEME_CONFIG } from "@/lib/theme-config";
import { ArrowRight } from "lucide-react";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = getToolIcon(tool.slug, tool.category);
  const theme = THEME_CONFIG[tool.category] || THEME_CONFIG.pdf;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`group flex flex-col justify-between rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-card p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${theme.hoverBorder}`}
    >
      <div>
        <div className="flex items-center justify-between mb-3.5">
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
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border ${theme.badge}`}
            >
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
