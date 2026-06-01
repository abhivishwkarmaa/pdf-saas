"use client";

import React, { useState, useEffect } from "react";
import { Code } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";

export default function HtmlEncoderPage() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const htmlEncode = (str: string) => {
    const entityMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return str.replace(/[&<>"']/g, (char) => entityMap[char] || char);
  };

  const htmlDecode = (str: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(str, "text/html");
      return doc.documentElement.textContent || str;
    } catch (e) {
      // Fallback if DOMParser is unavailable or fails
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
  };

  useEffect(() => {
    if (!input) {
      setOutput("");
      return;
    }

    if (mode === "encode") {
      setOutput(htmlEncode(input));
    } else {
      setOutput(htmlDecode(input));
    }
  }, [input, mode]);

  return (
    <TextToolLayout
      title="HTML Entity Encoder / Decoder"
      description="Convert special characters (like &, <, >, and quotes) to safe HTML entities to prevent rendering issues, or decode entities back to raw code."
      icon={Code}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={input}
            onChange={setInput}
            label={mode === "encode" ? "Raw HTML / Text" : "HTML Entities Input"}
            placeholder={
              mode === "encode"
                ? "Enter markup (e.g. <div class='test'>Hello & Welcome</div>)..."
                : "Enter encoded entities (e.g. &lt;div class=&#39;test&#39;&gt;Hello &amp; Welcome&lt;/div&gt;)..."
            }
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label={mode === "encode" ? "Encoded Output" : "Decoded Output"}
            placeholder="Entity results will appear here as you type..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 flex gap-2">
        <button
          onClick={() => {
            setMode("encode");
            setInput("");
          }}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition ${
            mode === "encode"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
          }`}
        >
          HTML Entity Encode
        </button>
        <button
          onClick={() => {
            setMode("decode");
            setInput("");
          }}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition ${
            mode === "decode"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
          }`}
        >
          HTML Entity Decode
        </button>
      </div>
    </TextToolLayout>
  );
}
