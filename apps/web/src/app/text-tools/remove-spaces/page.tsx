"use client";

import React, { useState, useMemo } from "react";
import { Eraser } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";
import { OptionToggle } from "@/components/text-tools/OptionToggle";
import { StatsCard } from "@/components/text-tools/StatsCard";

export default function RemoveSpacesPage() {
  const [input, setInput] = useState("");
  
  // Options
  const [trimLines, setTrimLines] = useState(true);
  const [collapseSpaces, setCollapseSpaces] = useState(true);
  const [stripAll, setStripAll] = useState(false);
  const [removeBlank, setRemoveBlank] = useState(true);

  const { output, stats } = useMemo(() => {
    if (!input) {
      return {
        output: "",
        stats: {
          origLen: 0,
          newLen: 0,
          spacesRemoved: 0,
          blankLinesRemoved: 0,
        },
      };
    }

    let lines = input.split(/\r?\n/);
    const origLineCount = lines.length;
    let blankLinesRemoved = 0;

    // Process blank lines first
    if (removeBlank) {
      const filteredLines = lines.filter((line) => line.trim().length > 0);
      blankLinesRemoved = origLineCount - filteredLines.length;
      lines = filteredLines;
    }

    // Process space rules line-by-line
    const processedLines = lines.map((line) => {
      let temp = line;

      if (trimLines) {
        temp = temp.trim();
      }

      if (stripAll) {
        temp = temp.replace(/\s+/g, "");
      } else if (collapseSpaces) {
        // Replace multiple consecutive spaces with a single space
        temp = temp.replace(/ {2,}/g, " ");
        temp = temp.replace(/\t+/g, " ");
      }

      return temp;
    });

    const finalOutput = processedLines.join("\n");

    // Calculate space counts
    const origSpaces = (input.match(/\s/g) || []).length;
    const newSpaces = (finalOutput.match(/\s/g) || []).length;
    const spacesRemoved = Math.max(0, origSpaces - newSpaces);

    return {
      output: finalOutput,
      stats: {
        origLen: input.length,
        newLen: finalOutput.length,
        spacesRemoved,
        blankLinesRemoved,
      },
    };
  }, [input, trimLines, collapseSpaces, stripAll, removeBlank]);

  return (
    <TextToolLayout
      title="Remove Extra Spaces"
      description="Trim leading/trailing spacing, collapse redundant spaces, remove blank lines, or strip all spaces entirely."
      icon={Eraser}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={input}
            onChange={setInput}
            label="Original Text"
            placeholder="Type or paste messy text with extra spaces here..."
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label="Cleaned Result"
            placeholder="Cleaned output will appear here as you type..."
          />
        </div>
      </div>

      {/* Options and stats */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Options */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Whitespace Cleanup Rules
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <OptionToggle
              label="Trim Leading/Trailing"
              checked={trimLines}
              onChange={setTrimLines}
              description="Removes spaces from beginning and end of each line"
            />
            <OptionToggle
              label="Collapse Redundant Spaces"
              checked={collapseSpaces && !stripAll}
              onChange={(val) => {
                setCollapseSpaces(val);
                if (val) setStripAll(false);
              }}
              description="Converts multiple consecutive spaces to a single space"
            />
            <OptionToggle
              label="Remove All Spaces"
              checked={stripAll}
              onChange={(val) => {
                setStripAll(val);
                if (val) setCollapseSpaces(false);
              }}
              description="Strips all spacing, tabs, and indentation from characters"
            />
            <OptionToggle
              label="Remove Blank Lines"
              checked={removeBlank}
              onChange={setRemoveBlank}
              description="Deletes lines containing only whitespace"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Cleanup Impact Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatsCard label="Spaces Removed" value={stats.spacesRemoved} />
            <StatsCard label="Blank Lines Removed" value={stats.blankLinesRemoved} />
            <StatsCard label="Original Size" value={`${stats.origLen} ch`} />
            <StatsCard label="New Size" value={`${stats.newLen} ch`} />
          </div>
        </div>
      </div>
    </TextToolLayout>
  );
}
