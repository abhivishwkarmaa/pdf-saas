"use client";

import React, { useState, useMemo } from "react";
import { SortAsc } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";
import { OptionToggle } from "@/components/text-tools/OptionToggle";

type SortMethod = "az" | "za" | "lengthAsc" | "lengthDesc" | "shuffle";

export default function SortLinesPage() {
  const [input, setInput] = useState("");
  const [sortMethod, setSortMethod] = useState<SortMethod>("az");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [shuffleKey, setShuffleKey] = useState(0); // to force shuffle recalculation

  const output = useMemo(() => {
    if (!input) return "";

    let lines = input.split(/\r?\n/);

    if (removeEmpty) {
      lines = lines.filter((line) => line.trim().length > 0);
    }

    if (sortMethod === "shuffle") {
      // Fisher-Yates shuffle
      const shuffled = [...lines];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.join("\n");
    }

    lines.sort((a, b) => {
      let valA = a;
      let valB = b;
      if (!caseSensitive) {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (sortMethod === "az") {
        return valA.localeCompare(valB);
      } else if (sortMethod === "za") {
        return valB.localeCompare(valA);
      } else if (sortMethod === "lengthAsc") {
        return valA.length - valB.length || valA.localeCompare(valB);
      } else if (sortMethod === "lengthDesc") {
        return valB.length - valA.length || valA.localeCompare(valB);
      }
      return 0;
    });

    return lines.join("\n");
  }, [input, sortMethod, caseSensitive, removeEmpty, shuffleKey]);

  return (
    <TextToolLayout
      title="Sort Lines"
      description="Organize list items or text rows alphabetically, by character length, or shuffle them randomly."
      icon={SortAsc}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={input}
            onChange={setInput}
            label="Original List/Text"
            placeholder="Enter lines to sort..."
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label="Sorted Result"
            placeholder="Sorted text will appear here..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-5">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
          Sorting Rules & Controls
        </h3>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {/* Radio methods */}
          <div className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold text-zinc-400 block uppercase">
              Sorting Criteria
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                <input
                  type="radio"
                  name="sortMethod"
                  checked={sortMethod === "az"}
                  onChange={() => setSortMethod("az")}
                  className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                />
                Alphabetical (A → Z)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                <input
                  type="radio"
                  name="sortMethod"
                  checked={sortMethod === "za"}
                  onChange={() => setSortMethod("za")}
                  className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                />
                Reverse Alphabetical (Z → A)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                <input
                  type="radio"
                  name="sortMethod"
                  checked={sortMethod === "lengthAsc"}
                  onChange={() => setSortMethod("lengthAsc")}
                  className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                />
                Length (Shortest First)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                <input
                  type="radio"
                  name="sortMethod"
                  checked={sortMethod === "lengthDesc"}
                  onChange={() => setSortMethod("lengthDesc")}
                  className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                />
                Length (Longest First)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
                <input
                  type="radio"
                  name="sortMethod"
                  checked={sortMethod === "shuffle"}
                  onChange={() => setSortMethod("shuffle")}
                  className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                />
                Randomize / Shuffle
              </label>
            </div>
          </div>

          {/* Recalculate button for shuffle */}
          {sortMethod === "shuffle" && (
            <div className="flex items-end h-full">
              <button
                type="button"
                onClick={() => setShuffleKey((k) => k + 1)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition"
              >
                Re-Shuffle Lines
              </button>
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div className="grid sm:grid-cols-2 gap-3 border-t border-zinc-900 pt-4">
          <OptionToggle
            label="Case Sensitive Sort"
            checked={caseSensitive}
            onChange={setCaseSensitive}
            description="Forces uppercase letters to sort separately from lowercase"
          />
          <OptionToggle
            label="Remove Empty Lines"
            checked={removeEmpty}
            onChange={setRemoveEmpty}
            description="Excludes empty or whitespace-only lines from the result"
          />
        </div>
      </div>
    </TextToolLayout>
  );
}
