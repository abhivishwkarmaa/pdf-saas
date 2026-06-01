"use client";

import React, { useState } from "react";
import { Type } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";

export default function CaseConverterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const convertTo = (type: string) => {
    if (!input) return;

    let res = "";
    switch (type) {
      case "upper":
        res = input.toUpperCase();
        break;
      case "lower":
        res = input.toLowerCase();
        break;
      case "title":
        res = input
          .toLowerCase()
          .replace(/\b[a-z]/g, (char) => char.toUpperCase());
        break;
      case "sentence":
        res = input
          .toLowerCase()
          .replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
        break;
      case "camel":
        res = input
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
          .replace(/^[A-Z]/, (char) => char.toLowerCase());
        break;
      case "pascal":
        res = input
          .toLowerCase()
          .replace(/(?:^|[^a-zA-Z0-9]+)(.)/g, (_, chr) => chr.toUpperCase());
        break;
      case "snake":
        res = input
          .toLowerCase()
          .trim()
          .replace(/[^a-zA-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        break;
      case "kebab":
        res = input
          .toLowerCase()
          .trim()
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        break;
      case "constant":
        res = input
          .toUpperCase()
          .trim()
          .replace(/[^a-zA-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        break;
      case "alternating":
        res = input
          .split("")
          .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
          .join("");
        break;
      default:
        res = input;
    }
    setOutput(res);
  };

  const caseButtons = [
    { label: "UPPERCASE", type: "upper" },
    { label: "lowercase", type: "lower" },
    { label: "Title Case", type: "title" },
    { label: "Sentence case", type: "sentence" },
    { label: "camelCase", type: "camel" },
    { label: "PascalCase", type: "pascal" },
    { label: "snake_case", type: "snake" },
    { label: "kebab-case", type: "kebab" },
    { label: "CONSTANT_CASE", type: "constant" },
    { label: "aLtErNaTiNg CaSe", type: "alternating" },
  ];

  return (
    <TextToolLayout
      title="Case Converter"
      description="Convert text formatting between uppercase, lowercase, title case, camelCase, snake_case and other styles instantly."
      icon={Type}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={input}
            onChange={(val) => {
              setInput(val);
              // Auto-run if already populated or clear output if cleared
              if (!val) setOutput("");
            }}
            label="Original Text"
            placeholder="Type or paste your text here to convert..."
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label="Converted Text"
            placeholder="Click one of the case conversion buttons below to see the result..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-3">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
          Convert Case Options
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {caseButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => convertTo(btn.type)}
              disabled={!input}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition disabled:opacity-50 disabled:hover:bg-zinc-900 disabled:hover:text-zinc-300"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </TextToolLayout>
  );
}
