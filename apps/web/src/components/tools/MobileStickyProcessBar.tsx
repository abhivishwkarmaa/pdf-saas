"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileStickyProcessBarProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  loadingLabel?: string;
  icon?: React.ReactNode;
  themeButtonClass?: string;
  className?: string;
}

export function MobileStickyProcessBar({
  title,
  subtitle,
  actionLabel = "Process Now",
  onAction,
  loading = false,
  disabled = false,
  loadingLabel = "Processing...",
  icon,
  themeButtonClass,
  className,
}: MobileStickyProcessBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 p-3.5 backdrop-blur-xl md:hidden shadow-lg animate-in slide-in-from-bottom duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
            {title}
          </p>
          {subtitle && (
            <p className="truncate text-[10px] text-muted">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || loading}
          className={cn(
            "flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-[0.98]",
            themeButtonClass || "bg-violet-600 hover:bg-violet-500",
            (disabled || loading) && "opacity-75 cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{loadingLabel}</span>
            </>
          ) : (
            <>
              {icon}
              <span>{actionLabel}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
