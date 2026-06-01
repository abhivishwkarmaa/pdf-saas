"use client";

import React, { useState, useMemo } from "react";
import { Replace } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";
import { OptionToggle } from "@/components/text-tools/OptionToggle";

export default function FindReplacePage() {
  const [input, setInput] = useState("");
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  
  // Options
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regexMode, setRegexMode] = useState(false);

  // Helper to escape regex special characters
  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Compile search regex
  const searchRegex = useMemo(() => {
    if (!findQuery) return null;

    try {
      let flags = "g";
      if (!caseSensitive) flags += "i";

      let pattern = regexMode ? findQuery : escapeRegExp(findQuery);

      if (wholeWord) {
        // If query starts/ends with alphanumeric, apply word boundary
        pattern = `\\b${pattern}\\b`;
      }

      return new RegExp(pattern, flags);
    } catch (e) {
      // Invalid regex pattern
      return null;
    }
  }, [findQuery, caseSensitive, wholeWord, regexMode]);

  // Execute replace and count matches
  const { output, replacementCount } = useMemo(() => {
    if (!input) return { output: "", replacementCount: 0 };
    if (!findQuery || !searchRegex) return { output: input, replacementCount: 0 };

    let count = 0;
    try {
      const matches = input.match(searchRegex);
      count = matches ? matches.length : 0;
      
      const outputText = input.replace(searchRegex, replaceQuery);
      return { output: outputText, replacementCount: count };
    } catch (err) {
      return { output: input, replacementCount: 0 };
    }
  }, [input, findQuery, replaceQuery, searchRegex]);

  // Generate highlighted input HTML
  const highlightedInputHtml = useMemo(() => {
    if (!input) return { __html: "" };
    if (!findQuery || !searchRegex) {
      // Escape HTML entities to prevent XSS
      return { __html: input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") };
    }

    try {
      // Escape HTML in the base text
      let escaped = input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // We need a modified regex that accounts for HTML entity conversions or simply highlights on the original text
      // To keep it simple and safe from breaking entity tags, we can run a custom highlighter.
      // A standard replace on clean text with mark tags is easiest, but we must escape HTML first.
      // So let's run the searchRegex on the HTML-escaped string!
      // Wait, if the findQuery contains HTML characters like <, we need to adjust, but for general cases this is excellent.
      
      let htmlFlags = "g";
      if (!caseSensitive) htmlFlags += "i";
      
      let htmlPattern = regexMode ? findQuery : escapeRegExp(findQuery);
      if (wholeWord) htmlPattern = `\\b${htmlPattern}\\b`;
      const escapedRegex = new RegExp(htmlPattern, htmlFlags);

      const highlighted = escaped.replace(
        escapedRegex,
        (match) => `<mark class="bg-emerald-500/30 text-emerald-300 px-0.5 rounded border border-emerald-500/20">${match}</mark>`
      );
      
      return { __html: highlighted };
    } catch (err) {
      return { __html: input };
    }
  }, [input, findQuery, searchRegex, caseSensitive, wholeWord, regexMode]);

  return (
    <TextToolLayout
      title="Find & Replace"
      description="Find specific words, patterns, or regular expressions in your text and swap them out instantly."
      icon={Replace}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Input and Highlight Preview */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
            <TextInput
              value={input}
              onChange={setInput}
              label="Original Text"
              placeholder="Paste your source text here..."
              rows={8}
            />
          </div>

          {/* Highlight Viewer */}
          {input && findQuery && (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-2">
              <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider block">
                Match Highlights
              </span>
              <div
                className="w-full min-h-[120px] max-h-[240px] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300 font-mono whitespace-pre-wrap break-all leading-relaxed"
                dangerouslySetInnerHTML={highlightedInputHtml}
              />
            </div>
          )}
        </div>

        {/* Right Column: Output */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label="Modified Text"
            placeholder="Modified text will appear here once query is matches..."
            rows={12}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Query Controls */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Pattern Queries
          </h3>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">
                Find Text
              </label>
              <input
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="String or regex to search..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white placeholder-zinc-600 focus:border-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">
                Replace With
              </label>
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replacement string..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white placeholder-zinc-600 focus:border-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-900">
            <OptionToggle
              label="Case Sensitive"
              checked={caseSensitive}
              onChange={setCaseSensitive}
              description="A vs a"
            />
            <OptionToggle
              label="Whole Word Only"
              checked={wholeWord}
              onChange={setWholeWord}
              description="Exact word bounds"
            />
            <OptionToggle
              label="Regex Mode"
              checked={regexMode}
              onChange={setRegexMode}
              description="Use regular expressions"
            />
          </div>
        </div>

        {/* Counter Display */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 flex flex-col justify-center items-center text-center">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Match Statistics
          </span>
          <span className={`text-5xl font-black mt-4 ${replacementCount > 0 ? "text-emerald-400" : "text-zinc-600"}`}>
            {replacementCount}
          </span>
          <span className="text-sm text-zinc-300 mt-2 font-medium">
            Replacements made
          </span>
          {regexMode && findQuery && !searchRegex && (
            <span className="text-[10px] text-rose-400 mt-2">
              Invalid Regex Pattern
            </span>
          )}
        </div>
      </div>
    </TextToolLayout>
  );
}
