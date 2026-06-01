"use client";

import React, { useState, useMemo } from "react";
import { GitCompare } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { StatsCard } from "@/components/text-tools/StatsCard";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

export default function TextDiffPage() {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");

  const { diffResult, stats } = useMemo(() => {
    if (!original && !modified) {
      return { diffResult: [], stats: { added: 0, removed: 0, changed: 0 } };
    }

    const originalLines = original.split(/\r?\n/);
    const modifiedLines = modified.split(/\r?\n/);

    const m = originalLines.length;
    const n = modifiedLines.length;

    // LCS Table
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      Array(n + 1).fill(0)
    );

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (originalLines[i - 1] === modifiedLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtracking
    let i = m;
    let j = n;
    const diff: DiffLine[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
        diff.unshift({ type: "unchanged", text: originalLines[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ type: "added", text: modifiedLines[j - 1] });
        j--;
      } else {
        diff.unshift({ type: "removed", text: originalLines[i - 1] });
        i--;
      }
    }

    // Calculate stats
    let added = 0;
    let removed = 0;

    diff.forEach((line) => {
      if (line.type === "added") added++;
      else if (line.type === "removed") removed++;
    });

    // Approximate changed lines as the intersection of added and removed
    const changed = Math.min(added, removed);
    const finalAdded = added - changed;
    const finalRemoved = removed - changed;

    return {
      diffResult: diff,
      stats: {
        added: finalAdded,
        removed: finalRemoved,
        changed,
      },
    };
  }, [original, modified]);

  return (
    <TextToolLayout
      title="Text Diff Checker"
      description="Compare two documents line-by-line to see added, removed, or changed parts instantly."
      icon={GitCompare}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={original}
            onChange={setOriginal}
            label="Original Version"
            placeholder="Paste the original source text here..."
            rows={8}
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={modified}
            onChange={setModified}
            label="Modified Version"
            placeholder="Paste the modified text here to compare..."
            rows={8}
          />
        </div>
      </div>

      {/* Difference Output Panel */}
      {(original || modified) && (
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              Comparison Differences
            </h3>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2.5 w-2.5 rounded bg-emerald-500/25 border border-emerald-500/30" />
                Line Added
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="h-2.5 w-2.5 rounded bg-rose-500/25 border border-rose-500/30" />
                Line Removed
              </span>
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="h-2.5 w-2.5 rounded bg-zinc-800/40 border border-zinc-800" />
                Unchanged
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <StatsCard label="Lines Added" value={stats.added} />
            <StatsCard label="Lines Removed" value={stats.removed} />
            <StatsCard label="Lines Changed" value={stats.changed} />
          </div>

          {/* Output text box */}
          <div className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-4 overflow-y-auto max-h-[400px] font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-all">
            {diffResult.map((line, idx) => {
              let classNames = "px-2 py-0.5 border-l-2 my-0.5 ";
              if (line.type === "added") {
                classNames += "bg-emerald-950/30 border-emerald-500/70 text-emerald-350";
              } else if (line.type === "removed") {
                classNames += "bg-rose-950/30 border-rose-500/70 text-rose-350 line-through";
              } else {
                classNames += "border-transparent text-zinc-400 opacity-60";
              }
              return (
                <div key={idx} className={classNames}>
                  <span className="select-none inline-block w-6 text-zinc-650 text-right mr-3">
                    {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                  </span>
                  {line.text || " "}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </TextToolLayout>
  );
}
