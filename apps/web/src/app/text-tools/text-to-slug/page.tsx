"use client";

import React, { useState, useMemo } from "react";
import { Link2 } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";
import { OptionToggle } from "@/components/text-tools/OptionToggle";

export default function TextToSlugPage() {
  const [input, setInput] = useState("");
  const [separator, setSeparator] = useState<"-" | "_">("-");
  const [lowercaseOnly, setLowercaseOnly] = useState(true);

  const output = useMemo(() => {
    if (!input) return "";

    let text = input;

    // Convert case
    if (lowercaseOnly) {
      text = text.toLowerCase();
    }

    // Replace non-alphanumeric characters with the separator
    // Keep letters, digits, and replace other characters
    const escapedSeparator = separator === "-" ? "\\-" : "_";
    const regex = new RegExp(`[^a-zA-Z0-9${escapedSeparator}]+`, "g");
    
    // Replace multiple spaces or punctuation with a single space first
    text = text
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, separator) // replace symbols with separator
      .replace(new RegExp(`${escapedSeparator}+`, "g"), separator) // collapse double separators
      .replace(new RegExp(`^${escapedSeparator}+|${escapedSeparator}+$`, "g"), ""); // trim trailing

    return text;
  }, [input, separator, lowercaseOnly]);

  return (
    <TextToolLayout
      title="Text to Slug Generator"
      description="Convert any headline or text into a clean, URL-friendly slug slugified instantly."
      icon={Link2}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={input}
            onChange={setInput}
            label="Original Phrase"
            placeholder="Type a headline or sentence (e.g. Hello World! This is a test...)"
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label="Slug Output"
            placeholder="Slug will be displayed here in real-time..."
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Configurations */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Slug Preferences
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <OptionToggle
              label="Lowercase Only"
              checked={lowercaseOnly}
              onChange={setLowercaseOnly}
              description="Forces all characters in the slug to be lowercase"
            />

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/10 flex flex-col justify-between">
              <div>
                <span className="text-sm font-semibold text-zinc-200 block">
                  Separator Character
                </span>
                <span className="text-xs text-zinc-500 mt-0.5 block leading-normal">
                  Character to replace spaces & symbols
                </span>
              </div>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-zinc-300 select-none">
                  <input
                    type="radio"
                    name="separator"
                    checked={separator === "-"}
                    onChange={() => setSeparator("-")}
                    className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                  />
                  Hyphen (-)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-zinc-300 select-none">
                  <input
                    type="radio"
                    name="separator"
                    checked={separator === "_"}
                    onChange={() => setSeparator("_")}
                    className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                  />
                  Underscore (_)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-3">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
            Example Slugs
          </span>
          <div className="text-xs space-y-2 text-zinc-400 font-mono">
            <div>
              <p className="text-zinc-500">Original:</p>
              <p className="text-zinc-300">Hello World!</p>
              <p className="text-zinc-500 mt-1">Slug:</p>
              <p className="text-emerald-400">hello-world</p>
            </div>
            <div className="border-t border-zinc-900 pt-2">
              <p className="text-zinc-500">Original:</p>
              <p className="text-zinc-300">ConvertHub SEO Tools 2026</p>
              <p className="text-zinc-500 mt-1">Slug:</p>
              <p className="text-emerald-400">converthub-seo-tools-2026</p>
            </div>
          </div>
        </div>
      </div>
    </TextToolLayout>
  );
}
