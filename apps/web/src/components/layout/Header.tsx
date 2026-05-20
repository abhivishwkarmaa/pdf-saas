import Link from "next/link";
import { FileText } from "lucide-react";
import { TOOL_CATEGORIES, type ToolCategory } from "@pdf-saas/shared";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const NAV_CATEGORIES: ToolCategory[] = [
  "pdf",
  "image",
  "text",
  "calculator",
  "developer",
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 text-zinc-900 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-bold text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <FileText className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">CONVERTHUB</span>
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/#${cat}`}
              className="rounded-lg px-2.5 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {TOOL_CATEGORIES[cat].label.replace(" Tools", "").replace(" Converter", "")}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/#all-tools"
            className="hidden shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 sm:inline-flex"
          >
            All Tools
          </Link>
        </div>
      </div>
    </header>
  );
}
