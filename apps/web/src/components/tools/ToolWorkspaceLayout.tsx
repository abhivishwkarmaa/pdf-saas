import type { ToolDefinition } from "@pdf-saas/shared";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolWorkspaceLayoutProps {
  tool: ToolDefinition;
  badge?: string;
  badgeTone?: "success" | "warning" | "info";
  children: React.ReactNode;
  preview?: React.ReactNode;
  editorLabel?: string;
  /** Wider single-column card (e.g. side-by-side code editors). */
  wide?: boolean;
}

const BADGE_STYLES = {
  success:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  warning:
    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  info: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
};

function WorkspaceCard({
  tool,
  badge,
  badgeTone,
  children,
  headerLabel,
  className,
}: {
  tool: ToolDefinition;
  badge?: string;
  badgeTone: "success" | "warning" | "info";
  children: React.ReactNode;
  headerLabel?: string;
  className?: string;
}) {
  const theme = CATEGORY_THEME[tool.category];
  const Icon = theme.icon;

  return (
    <section
      className={cn(
        `overflow-hidden rounded-2xl border shadow-sm ${theme.accentBorder} ${theme.sectionBg}`,
        className
      )}
    >
      <header
        className={`flex items-center gap-3 border-b px-5 py-4 ${theme.accentBorder} ${theme.accentBg}`}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white shadow-sm dark:bg-zinc-900 ${theme.accentBorder}`}
        >
          <Icon className={`h-5 w-5 ${theme.accent}`} />
        </span>
        <span className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${theme.accent}`}
          >
            {headerLabel ?? theme.label}
          </p>
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {tool.name}
          </p>
        </span>
      </header>

      <section className="space-y-5 p-5">
        {badge && (
          <p
            className={`rounded-lg border px-3 py-2.5 text-sm ${BADGE_STYLES[badgeTone]}`}
          >
            {badge}
          </p>
        )}
        {children}
      </section>
    </section>
  );
}

export function ToolWorkspaceLayout({
  tool,
  badge,
  badgeTone = "info",
  children,
  preview,
  editorLabel = "Editor",
  wide = false,
}: ToolWorkspaceLayoutProps) {
  const theme = CATEGORY_THEME[tool.category];
  const maxWidth = preview ? "max-w-6xl" : wide ? "max-w-5xl" : "max-w-2xl";

  return (
    <section className={cn("mx-auto w-full", maxWidth)}>
      <Link
        href={`/#${tool.category}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {theme.label} tools
      </Link>

      {preview ? (
        <section className="grid items-start gap-6 lg:grid-cols-2">
          <WorkspaceCard
            tool={tool}
            badge={badge}
            badgeTone={badgeTone}
            headerLabel={editorLabel}
          >
            {children}
          </WorkspaceCard>
          <aside className="lg:sticky lg:top-24">{preview}</aside>
        </section>
      ) : (
        <WorkspaceCard tool={tool} badge={badge} badgeTone={badgeTone}>
          {children}
        </WorkspaceCard>
      )}
    </section>
  );
}
