"use client";

import React, { useState, useMemo } from "react";
import { ListMinus } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";
import { OptionToggle } from "@/components/text-tools/OptionToggle";

export default function RemoveDuplicatesPage() {
  const [input, setInput] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [trimLines, setTrimLines] = useState(true);
  const [keepMode, setKeepMode] = useState<"first" | "last">("first");

  const { output, removedCount } = useMemo(() => {
    if (!input) {
      return { output: "", removedCount: 0 };
    }

    const lines = input.split(/\r?\n/);
    const seen = new Set<string>();
    const finalLines: string[] = [];

    if (keepMode === "first") {
      for (const line of lines) {
        let processedLine = line;
        if (trimLines) processedLine = processedLine.trim();

        const matchKey = caseSensitive ? processedLine : processedLine.toLowerCase();

        if (!seen.has(matchKey)) {
          seen.add(matchKey);
          finalLines.push(line); // keep original casing
        }
      }
    } else {
      // Keep last occurrence: process from end to start, then reverse
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        let processedLine = line;
        if (trimLines) processedLine = processedLine.trim();

        const matchKey = caseSensitive ? processedLine : processedLine.toLowerCase();

        if (!seen.has(matchKey)) {
          seen.add(matchKey);
          finalLines.unshift(line);
        }
      }
    }

    const removedCount = lines.length - finalLines.length;

    return {
      output: finalLines.join("\n"),
      removedCount,
    };
  }, [input, caseSensitive, trimLines, keepMode]);

  return (
    <TextToolLayout
      title="Remove Duplicate Lines"
      description="Clean up repetitive rows or list items from your text instantly."
      icon={ListMinus}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={input}
            onChange={setInput}
            label="Original Text"
            placeholder="Enter list or text with duplicate lines here..."
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label="Cleaned Text"
            placeholder="Deduplicated result will appear here as you type..."
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Options */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Configuration Options
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <OptionToggle
              label="Case Sensitive"
              checked={caseSensitive}
              onChange={setCaseSensitive}
              description="Distinguishes between uppercase and lowercase lines"
            />
            <OptionToggle
              label="Trim Whitespace"
              checked={trimLines}
              onChange={setTrimLines}
              description="Removes leading and trailing spaces before comparison"
            />
          </div>
          <div className="space-y-2 pt-2 border-t border-zinc-900">
            <span className="text-xs font-semibold text-zinc-400 block uppercase">
              Duplicate Retainment Rule
            </span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                <input
                  type="radio"
                  name="keepMode"
                  checked={keepMode === "first"}
                  onChange={() => setKeepMode("first")}
                  className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                />
                Keep First Occurrence
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                <input
                  type="radio"
                  name="keepMode"
                  checked={keepMode === "last"}
                  onChange={() => setKeepMode("last")}
                  className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                />
                Keep Last Occurrence
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 flex flex-col justify-center items-center text-center">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Deduplication Stats
          </span>
          <span className="text-5xl font-black text-emerald-400 mt-4">
            {removedCount}
          </span>
          <span className="text-sm text-zinc-300 mt-2 font-medium">
            Duplicate lines removed
          </span>
          <span className="text-xs text-zinc-500 mt-1">
            ({input ? input.split(/\r?\n/).length : 0} original lines)
          </span>
        </div>
      </div>
    </TextToolLayout>
  );
}
