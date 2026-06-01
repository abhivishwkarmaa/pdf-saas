"use client";

import React from "react";

interface OptionToggleProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  description?: string;
}

export function OptionToggle({
  label,
  checked,
  onChange,
  description,
}: OptionToggleProps) {
  return (
    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/30 cursor-pointer select-none transition hover:border-zinc-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4.5 w-4.5 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 focus:outline-none transition cursor-pointer accent-emerald-500"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-zinc-200 block">
          {label}
        </span>
        {description && (
          <span className="text-xs text-zinc-500 mt-0.5 block leading-normal">
            {description}
          </span>
        )}
      </div>
    </label>
  );
}
