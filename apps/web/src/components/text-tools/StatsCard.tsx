"use client";

import React from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  description?: string;
}

export function StatsCard({ label, value, description }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/30 flex flex-col justify-between">
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-black text-white tracking-tight">
          {value}
        </span>
        {description && (
          <span className="text-xs text-zinc-500 font-medium">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
