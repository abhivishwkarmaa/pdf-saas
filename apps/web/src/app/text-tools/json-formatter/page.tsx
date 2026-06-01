"use client";

import React, { useState } from "react";
import { Braces } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";

export default function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [indentSize, setIndentSize] = useState<2 | 4>(2);

  const getLineNumberFromIndex = (str: string, index: number) => {
    const sub = str.substring(0, index);
    return sub.split("\n").length;
  };

  const getParseErrorDetails = (err: Error, source: string) => {
    // Attempt to extract position from error message (e.g. "at position 45")
    const posMatch = err.message.match(/at position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const line = getLineNumberFromIndex(source, pos);
      return `Line ${line}: ${err.message}`;
    }

    // Try to extract line number directly (e.g. "line 3")
    const lineMatch = err.message.match(/line (\d+)/i);
    if (lineMatch) {
      return `Line ${lineMatch[1]}: ${err.message}`;
    }

    return err.message;
  };

  const handleFormat = () => {
    if (!input.trim()) return;
    setErrorMsg("");
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, indentSize);
      setOutput(formatted);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(getParseErrorDetails(err, input));
      } else {
        setErrorMsg("Invalid JSON data format");
      }
      setOutput("");
    }
  };

  const handleMinify = () => {
    if (!input.trim()) return;
    setErrorMsg("");
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(getParseErrorDetails(err, input));
      } else {
        setErrorMsg("Invalid JSON data format");
      }
      setOutput("");
    }
  };

  const handleValidate = () => {
    if (!input.trim()) return;
    setErrorMsg("");
    try {
      JSON.parse(input);
      setOutput("Valid JSON ✅");
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(getParseErrorDetails(err, input));
      } else {
        setErrorMsg("Invalid JSON data format");
      }
      setOutput("");
    }
  };

  // Syntax highlighting for HTML output
  const highlightedHtml = React.useMemo(() => {
    if (!output || output === "Valid JSON ✅") return null;

    // Escape basic HTML
    let escaped = output
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Matches strings, keys, numbers, booleans, nulls
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

    const formatted = escaped.replace(regex, (match) => {
      let cls = "text-amber-400"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-sky-400 font-semibold"; // key
        } else {
          cls = "text-emerald-400"; // string value
        }
      } else if (/true|false/.test(match)) {
        cls = "text-purple-400 font-semibold"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-zinc-500 italic"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    });

    return { __html: formatted };
  }, [output]);

  return (
    <TextToolLayout
      title="JSON Formatter & Validator"
      description="Format (pretty print), minify, validate, and syntax-highlight JSON data. Debug parsing errors with exact line numbers."
      icon={Braces}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          <TextInput
            value={input}
            onChange={(val) => {
              setInput(val);
              if (!val) {
                setOutput("");
                setErrorMsg("");
              }
            }}
            label="Raw JSON Input"
            placeholder='Paste raw JSON here (e.g. {"name":"ConvertHub","active":true,"version":2026})'
            rows={14}
          />
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          <TextOutput
            value={output}
            label="Formatted Output"
            placeholder="Formatted or validated result will appear here..."
            rows={14}
            customRender={
              highlightedHtml ? (
                <pre
                  className="font-mono text-xs sm:text-sm whitespace-pre-wrap break-all leading-relaxed"
                  dangerouslySetInnerHTML={highlightedHtml}
                />
              ) : undefined
            }
            downloadFileName="formatted.json"
          />
        </div>
      </div>

      {/* Error Message banner */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-900/40 bg-rose-500/10 p-4 text-rose-400 font-semibold text-sm">
          ⚠️ JSON Error — {errorMsg}
        </div>
      )}

      {/* Formatting controls */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleFormat}
            disabled={!input.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 font-bold text-sm transition disabled:opacity-50"
          >
            Format JSON
          </button>
          <button
            onClick={handleMinify}
            disabled={!input.trim()}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl font-bold text-sm transition disabled:opacity-50"
          >
            Minify JSON
          </button>
          <button
            onClick={handleValidate}
            disabled={!input.trim()}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl font-bold text-sm transition disabled:opacity-50"
          >
            Validate JSON
          </button>
        </div>

        {/* Indent selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Tab Spacing
          </span>
          <button
            onClick={() => setIndentSize(2)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
              indentSize === 2
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-white"
            }`}
          >
            2 Spaces
          </button>
          <button
            onClick={() => setIndentSize(4)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
              indentSize === 4
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-white"
            }`}
          >
            4 Spaces
          </button>
        </div>
      </div>
    </TextToolLayout>
  );
}
