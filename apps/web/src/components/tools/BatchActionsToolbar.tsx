"use client";

import React from "react";
import {
  CheckSquare,
  Square,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BatchCustomAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
}

interface BatchActionsToolbarProps {
  totalCount: number;
  selectedCount: number;
  itemLabel?: string;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onInvertSelection?: () => void;
  onRotateSelected?: () => void;
  onDeleteSelected?: () => void;
  deleteLabel?: string;
  customActions?: BatchCustomAction[];
  sticky?: boolean;
  className?: string;
}

export function BatchActionsToolbar({
  totalCount,
  selectedCount,
  itemLabel = "pages",
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onRotateSelected,
  onDeleteSelected,
  deleteLabel = "Delete Selected",
  customActions = [],
  sticky = true,
  className,
}: BatchActionsToolbarProps) {
  if (totalCount <= 1) return null;

  const hasSelection = selectedCount > 0;
  const isAllSelected = selectedCount === totalCount;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-zinc-200/90 bg-white/95 p-2.5 shadow-sm backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/95 transition-all animate-in fade-in-50 duration-200",
        sticky && "sticky top-2 z-20 shadow-md",
        className
      )}
    >
      {/* Live Selection Status Badge */}
      <div className="flex items-center gap-2 px-1">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold transition-colors",
            hasSelection
              ? "bg-violet-600 text-white dark:bg-violet-500"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          )}
        >
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          of {totalCount} {itemLabel} selected
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        {onSelectAll && !isAllSelected && (
          <button
            type="button"
            onClick={onSelectAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Select All
          </button>
        )}

        {onDeselectAll && hasSelection && (
          <button
            type="button"
            onClick={onDeselectAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
          >
            <Square className="h-3.5 w-3.5" />
            Deselect
          </button>
        )}

        {onInvertSelection && (
          <button
            type="button"
            onClick={onInvertSelection}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Invert
          </button>
        )}

        {onRotateSelected && hasSelection && (
          <button
            type="button"
            onClick={onRotateSelected}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Rotate 90°
          </button>
        )}

        {customActions.map((action, idx) => (
          <button
            key={idx}
            type="button"
            onClick={action.onClick}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
              action.variant === "primary"
                ? "bg-violet-600 text-white hover:bg-violet-500 shadow-xs"
                : action.variant === "danger"
                ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}

        {onDeleteSelected && hasSelection && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleteLabel}
          </button>
        )}
      </div>
    </div>
  );
}
