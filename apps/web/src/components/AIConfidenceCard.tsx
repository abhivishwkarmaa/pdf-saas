"use client";

import React from "react";
import { Sparkles, AlertTriangle, CheckCircle, RefreshCcw } from "lucide-react";
import { ParsedCommand } from "@pdf-saas/shared";

interface AIConfidenceCardProps {
  command: ParsedCommand;
  onRephrase: () => void;
}

export function AIConfidenceCard({ command, onRephrase }: AIConfidenceCardProps) {
  const percentage = Math.round(command.confidence * 100);

  // Determine colors based on confidence score (using dark glassmorphic styles)
  let barColor = "bg-red-500";
  let textColor = "text-red-400";
  let bgColor = "bg-red-950/20";
  let borderColor = "border-red-900/30";
  let statusIcon = <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />;

  if (command.confidence > 0.8) {
    barColor = "bg-emerald-500";
    textColor = "text-emerald-400";
    bgColor = "bg-emerald-950/20";
    borderColor = "border-emerald-900/30";
    statusIcon = <CheckCircle className="h-4 w-4 shrink-0 text-emerald-450" />;
  } else if (command.confidence >= 0.6) {
    barColor = "bg-amber-500";
    textColor = "text-amber-400";
    bgColor = "bg-amber-950/20";
    borderColor = "border-amber-900/30";
    statusIcon = <AlertTriangle className="h-4 w-4 shrink-0 text-amber-450" />;
  }

  // Format action name for readability
  const formattedAction = command.action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className={`rounded-2xl border p-5 space-y-4 shadow-sm transition-all bg-zinc-900 border-zinc-800`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-400 animate-pulse" />
            </span>
            <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">
              AI Action Detected
            </p>
          </div>
          <h4 className="text-sm font-bold text-white mt-1">
            {command.explanation}
          </h4>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-850 shadow-sm border border-zinc-800 ${textColor} ${bgColor} ${borderColor}`}>
          {statusIcon}
          {percentage}% Confidence
        </span>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Parameters list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-zinc-800 pt-4 text-xs">
        <div>
          <span className="text-zinc-400 block font-medium">Action Badge</span>
          <span className="font-semibold text-zinc-200 mt-1.5 inline-block px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px]">
            {formattedAction}
          </span>
        </div>
        {command.pages && command.pages.length > 0 && (
          <div>
            <span className="text-zinc-400 block font-medium">Pages</span>
            <span className="font-semibold text-zinc-200 mt-1.5 inline-block">
              {command.pages.join(", ")}
            </span>
          </div>
        )}
        {command.pageRange && (
          <div>
            <span className="text-zinc-400 block font-medium">Page Range</span>
            <span className="font-semibold text-zinc-200 mt-1.5 inline-block">
              {command.pageRange.from} to {command.pageRange.to}
            </span>
          </div>
        )}
        {command.rotationDegrees && (
          <div>
            <span className="text-zinc-400 block font-medium">Rotation</span>
            <span className="font-semibold text-zinc-200 mt-1.5 inline-block">
              {command.rotationDegrees}°
            </span>
          </div>
        )}
        {command.splitAfterPage && (
          <div>
            <span className="text-zinc-400 block font-medium">Split After Page</span>
            <span className="font-semibold text-zinc-200 mt-1.5 inline-block">
              {command.splitAfterPage}
            </span>
          </div>
        )}
        {command.watermarkText && (
          <div>
            <span className="text-zinc-400 block font-medium">Watermark Text</span>
            <span className="font-semibold text-zinc-200 mt-1.5 truncate max-w-[120px] inline-block" title={command.watermarkText}>
              &quot;{command.watermarkText}&quot;
            </span>
          </div>
        )}
        {command.password && (
          <div>
            <span className="text-zinc-400 block font-medium">Password</span>
            <span className="font-semibold text-zinc-200 mt-1.5 inline-block font-mono">
              •••••••• ({command.password})
            </span>
          </div>
        )}
        {command.reorderMap && command.reorderMap.length > 0 && (
          <div>
            <span className="text-zinc-400 block font-medium">Reorder Map</span>
            <span className="font-semibold text-zinc-200 mt-1.5 inline-block font-mono text-[10px]">
              [{command.reorderMap.join(",")}]
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 pt-3.5">
        <div className="text-[11px] text-zinc-400">
          {command.confidence < 0.6 ? (
            <span className="text-red-400 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              AI confidence is low. Please review or rephrase the command.
            </span>
          ) : (
            <span>Double check detected options before running the command.</span>
          )}
        </div>
        <button
          type="button"
          onClick={onRephrase}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 transition-all hover:underline"
        >
          <RefreshCcw className="h-3 w-3" />
          Looks wrong? Rephrase
        </button>
      </div>
    </div>
  );
}
