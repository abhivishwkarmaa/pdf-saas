"use client";

import React, { useState, useMemo } from "react";
import { FileEdit } from "lucide-react";
import { marked } from "marked";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";

export default function MarkdownToHtmlPage() {
  const [input, setInput] = useState("");
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");

  // Parse markdown to HTML string
  const htmlOutput = useMemo(() => {
    if (!input.trim()) return "";
    try {
      // Use marked.parseSync or marked.parse to render synchronously
      return marked.parse(input, { async: false }) as string;
    } catch (e) {
      return `<p class="text-rose-400">Error parsing Markdown: ${(e as Error).message}</p>`;
    }
  }, [input]);

  const htmlPreviewObj = useMemo(() => {
    return { __html: htmlOutput };
  }, [htmlOutput]);

  return (
    <TextToolLayout
      title="Markdown to HTML Converter"
      description="Convert Markdown syntax into valid HTML code or view a rendered preview of your document."
      icon={FileEdit}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .markdown-preview h1 { font-size: 1.8rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 1rem; border-bottom: 1px solid #27272a; padding-bottom: 0.5rem; color: #fff; }
        .markdown-preview h2 { font-size: 1.4rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #fff; }
        .markdown-preview h3 { font-size: 1.2rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #fff; }
        .markdown-preview p { margin-bottom: 1rem; line-height: 1.65; color: #d4d4d8; }
        .markdown-preview ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-preview ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-preview li { margin-bottom: 0.25rem; color: #d4d4d8; }
        .markdown-preview code { background-color: #18181b; padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-family: var(--font-geist-mono), monospace; font-size: 0.85em; color: #34d399; }
        .markdown-preview pre { background-color: #09090b; border: 1px solid #27272a; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
        .markdown-preview pre code { background-color: transparent; padding: 0; color: #e4e4e7; font-size: 0.9em; }
        .markdown-preview blockquote { border-left: 4px solid #10b981; padding-left: 1rem; color: #a1a1aa; font-style: italic; margin-bottom: 1rem; }
        .markdown-preview a { color: #34d399; text-decoration: underline; }
        .markdown-preview a:hover { color: #6ee7b7; }
        .markdown-preview hr { border-color: #27272a; margin: 1.5rem 0; }
        .markdown-preview table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
        .markdown-preview th { background-color: #18181b; padding: 0.5rem; border: 1px solid #27272a; font-weight: bold; text-align: left; }
        .markdown-preview td { padding: 0.5rem; border: 1px solid #27272a; }
      `}} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Markdown Input */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextInput
            value={input}
            onChange={setInput}
            label="Markdown Editor"
            placeholder="# Sample Header&#10;&#10;Write some **bold** or *italic* text here.&#10;&#10;- Bullet list item 1&#10;- Bullet list item 2&#10;&#10;> Blockquotes look great too!"
            rows={14}
          />
        </div>

        {/* Right Column: HTML Output / Preview */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={htmlOutput}
            label={viewMode === "preview" ? "Live Render Preview" : "Raw HTML Code"}
            placeholder="Rendered HTML will appear here..."
            rows={14}
            downloadFileName="document.html"
            customRender={
              viewMode === "preview" && htmlOutput ? (
                <div
                  className="markdown-preview leading-relaxed text-sm select-text"
                  dangerouslySetInnerHTML={htmlPreviewObj}
                />
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Mode Switches */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 flex gap-2">
        <button
          onClick={() => setViewMode("preview")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition ${
            viewMode === "preview"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
          }`}
        >
          Render HTML Preview
        </button>
        <button
          onClick={() => setViewMode("html")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition ${
            viewMode === "html"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
          }`}
        >
          Show HTML Code Source
        </button>
      </div>
    </TextToolLayout>
  );
}
