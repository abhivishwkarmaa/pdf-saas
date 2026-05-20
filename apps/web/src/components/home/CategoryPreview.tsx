import Link from "next/link";
import type { ToolCategory } from "@pdf-saas/shared";
import { ArrowRight, Upload, FileText, Image, Code } from "lucide-react";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { CATEGORY_PREVIEW } from "@/lib/category-preview";
import { cn } from "@/lib/utils";

interface CategoryPreviewProps {
  category: ToolCategory;
}

export function CategoryPreview({ category }: CategoryPreviewProps) {
  const theme = CATEGORY_THEME[category];
  const meta = CATEGORY_PREVIEW[category];
  const Icon = theme.icon;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border shadow-sm lg:sticky lg:top-24",
        theme.accentBorder,
        "bg-white dark:bg-zinc-900"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-3",
          theme.accentBorder,
          theme.accentBg
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Preview
        </span>
      </div>

      <div className="p-4">
        <PreviewMock category={category} />
      </div>

      <div className="space-y-3 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <ul className="space-y-1.5">
          {meta.highlights.map((h) => (
            <li
              key={h}
              className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", theme.button)} />
              {h}
            </li>
          ))}
        </ul>
        <Link
          href={`/tools/${meta.featuredSlug}`}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition",
            theme.button
          )}
        >
          <Icon className="h-4 w-4" />
          Try {meta.featuredLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function PreviewMock({ category }: { category: ToolCategory }) {
  switch (category) {
    case "pdf":
      return <PdfPreview />;
    case "image":
      return <ImagePreview />;
    case "text":
      return <TextPreview />;
    case "developer":
      return <DeveloperPreview />;
    case "calculator":
      return <CalculatorPreview />;
    default:
      return null;
  }
}

function PdfPreview() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50/50 px-4 py-6 text-center dark:border-red-900/60 dark:bg-red-950/20">
        <Upload className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Drop PDF files here
        </p>
      </div>
      <div className="space-y-1.5">
        {["report.pdf", "invoice.pdf"].map((name) => (
          <div
            key={name}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800"
          >
            <FileText className="h-4 w-4 text-red-500" />
            <span className="truncate text-zinc-700 dark:text-zinc-300">{name}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-red-600 py-2 text-center text-xs font-semibold text-white">
        Merge PDF
      </div>
    </div>
  );
}

function ImagePreview() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 w-10 rounded-md bg-gradient-to-br from-blue-200 to-blue-400 dark:from-blue-900 dark:to-blue-700"
          />
        ))}
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-blue-500" />
      <div className="flex flex-col items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
        <Image className="h-8 w-8 text-blue-500" />
        <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
          output.webp
        </span>
      </div>
    </div>
  );
}

function TextPreview() {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-violet-500" />
        <span className="text-xs font-semibold text-violet-800 dark:text-violet-200">
          document.md
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full rounded bg-violet-200/80 dark:bg-violet-800/50" />
        <div className="h-2 w-4/5 rounded bg-violet-200/60 dark:bg-violet-800/40" />
        <div className="h-2 w-3/5 rounded bg-violet-200/40 dark:bg-violet-800/30" />
      </div>
      <div className="mt-4 rounded-lg bg-violet-600 py-2 text-center text-xs font-semibold text-white">
        Convert to PDF
      </div>
    </div>
  );
}

function DeveloperPreview() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-amber-200 bg-zinc-950 p-3 dark:border-amber-900">
        <p className="mb-2 text-[10px] font-semibold uppercase text-amber-500">Input</p>
        <pre className="font-mono text-[10px] leading-relaxed text-emerald-400">
          {`{"name":\n  "app"\n}`}
        </pre>
      </div>
      <div className="rounded-lg border border-amber-200 bg-zinc-50 p-3 dark:border-amber-900 dark:bg-zinc-800">
        <p className="mb-2 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">
          Output
        </p>
        <pre className="font-mono text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-300">
          {`{\n  "name": "app"\n}`}
        </pre>
      </div>
    </div>
  );
}

function CalculatorPreview() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-teal-200 bg-white px-3 py-2 dark:border-teal-800 dark:bg-zinc-800">
          <p className="text-[10px] text-zinc-500">Weight (kg)</p>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">70</p>
        </div>
        <div className="rounded-lg border border-teal-200 bg-white px-3 py-2 dark:border-teal-800 dark:bg-zinc-800">
          <p className="text-[10px] text-zinc-500">Height (cm)</p>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">175</p>
        </div>
      </div>
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950/40">
        <p className="text-[10px] font-semibold uppercase text-teal-700 dark:text-teal-300">
          BMI Result
        </p>
        <p className="text-xl font-bold text-teal-900 dark:text-teal-100">22.9</p>
        <p className="text-xs text-teal-700/80 dark:text-teal-300/80">Normal weight</p>
      </div>
    </div>
  );
}
