"use client";

import React from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import {
  Download,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ToolTopNav } from "@/components/navigation/BreadcrumbNav";

interface ProcessingSuccessViewProps {
  tool: ToolDefinition;
  resultBlob: Blob;
  resultFileName: string;
  originalFileName?: string;
  originalSize?: number;
  itemCount?: number;
  customMessage?: string;
  onReset: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ProcessingSuccessView({
  tool,
  resultBlob,
  resultFileName,
  originalFileName,
  originalSize,
  itemCount,
  customMessage,
  onReset,
}: ProcessingSuccessViewProps) {
  const theme = CATEGORY_THEME[tool.category] || CATEGORY_THEME.pdf;
  const resultSize = resultBlob.size;

  // Calculate savings percentage if originalSize is available and greater than 0
  const hasSavings = originalSize && originalSize > 0 && resultSize < originalSize;
  const savingsBytes = hasSavings ? originalSize - resultSize : 0;
  const savingsPercent = hasSavings ? Math.round((savingsBytes / originalSize) * 100) : 0;

  const handleDownload = () => {
    try {
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resultFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started! Check your downloads folder.");
    } catch (err) {
      console.error("Download trigger failed:", err);
      toast.error("Could not trigger download. Please try again.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl text-left animate-in fade-in-50 duration-300">
      {/* Top Breadcrumb link */}
      <ToolTopNav tool={tool} className="mb-4" />

      {/* Main Success Container */}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-card p-6 sm:p-8 shadow-sm transition-all",
          theme.accentBorder
        )}
      >
        {/* Status Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            File Processed Successfully
          </h2>
          <p className="mt-1 text-sm text-muted max-w-md">
            {customMessage ||
              `Completed with ${tool.name}. Download started automatically.`}
          </p>
        </div>

        {/* File Card & Savings Readout */}
        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-border bg-zinc-50/80 dark:bg-zinc-900/50 p-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme.accentBg} ${theme.accentBorder}`}
              >
                <FileCheck className={`h-5 w-5 ${theme.accent}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                  {resultFileName}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                  <span>Output size: {formatBytes(resultSize)}</span>
                  {itemCount && itemCount > 1 && (
                    <>
                      <span>•</span>
                      <span>{itemCount} files bundled</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Before vs After Compression Comparison Bar */}
            {hasSavings && (
              <div className="mt-4 pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>Original: <span className="font-mono text-zinc-700 dark:text-zinc-300">{formatBytes(originalSize)}</span></span>
                  <ArrowRight className="h-3 w-3 text-zinc-400" />
                  <span>Output: <span className="font-mono text-zinc-700 dark:text-zinc-300">{formatBytes(resultSize)}</span></span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>Reduced by {savingsPercent}% ({formatBytes(savingsBytes)} saved)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Primary Call-to-Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className={cn(
              "flex w-full sm:flex-1 items-center justify-center gap-2 rounded-xl py-3 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.99]",
              theme.button
            )}
          >
            <Download className="h-4 w-4" />
            <span>Download File ({formatBytes(resultSize)})</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Process Another File</span>
          </button>
        </div>

        {/* Bottom Trust & Purge Notice */}
        <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-center gap-2 text-[11px] text-muted text-center">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Files are processed locally or in memory and are deleted automatically.</span>
        </div>
      </div>
    </div>
  );
}
