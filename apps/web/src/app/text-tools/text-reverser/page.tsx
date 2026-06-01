"use client";

import React, { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";

export default function TextReverserPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chars" | "words">("chars");

  const output = useMemo(() => {
    if (!input) return "";

    if (mode === "chars") {
      return input.split("").reverse().join("");
    } else {
      // Reverse word-by-word but keep lines separate
      return input
        .split("\n")
        .map((line) => {
          return line.split(/\s+/).reverse().join(" ");
        })
        .join("\n");
    }
  }, [input, mode]);

  return (
    <TextToolLayout
      title="Text Reverser"
      description="Reverse your text instantly by character or word. Works in real-time."
      icon={RefreshCw}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={input}
            onChange={setInput}
            label="Original Text"
            placeholder="Type or paste your text here..."
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label="Reversed Text"
            placeholder="Reversed output will appear here as you type..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
          Reversal Mode
        </h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
            <input
              type="radio"
              name="mode"
              checked={mode === "chars"}
              onChange={() => setMode("chars")}
              className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
            />
            Reverse Characters (e.g. &quot;abc&quot; → &quot;cba&quot;)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
            <input
              type="radio"
              name="mode"
              checked={mode === "words"}
              onChange={() => setMode("words")}
              className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
            />
            Reverse Words (e.g. &quot;hello world&quot; → &quot;world hello&quot;)
          </label>
        </div>
      </div>
    </TextToolLayout>
  );
}
