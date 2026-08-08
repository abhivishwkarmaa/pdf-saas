"use client";

import { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import {
  FileText,
  Eye,
  Edit3,
  Copy,
  Check,
  RotateCcw,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  Quote,
} from "lucide-react";
import { toast } from "sonner";

interface TextToolPreviewEditorProps {
  tool: ToolDefinition;
  files: File[];
  textValue: string;
  onTextChange: (val: string) => void;
  originalText?: string;
  onResetText?: () => void;
}

export function TextToolPreviewEditor({
  tool,
  files,
  textValue,
  onTextChange,
  originalText = "",
  onResetText,
}: TextToolPreviewEditorProps) {
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");
  const [copied, setCopied] = useState(false);

  const fileName = files[0]?.name || (tool.slug.includes("markdown") ? "document.md" : "document.txt");
  const isMarkdown = tool.slug.includes("markdown");

  // Word and character counts
  const charCount = textValue.length;
  const wordCount = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;
  const isModified = Boolean(originalText && textValue !== originalText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textValue);
      setCopied(true);
      toast.success("Text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const insertFormatting = (prefix: string, suffix = "") => {
    const textarea = document.getElementById("text-tool-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textValue.substring(start, end) || "text";
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newText = textValue.substring(0, start) + replacement + textValue.substring(end);
    onTextChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Top Bar with Mode Toggles & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[160px] sm:max-w-[240px]">
            {fileName}
          </span>
          {isModified && (
            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
              Edited
            </span>
          )}
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-xl bg-zinc-200/80 p-0.5 dark:bg-zinc-800">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                viewMode === "preview"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                viewMode === "edit"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Text
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
            title="Copy Text"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>

          {isModified && onResetText && (
            <button
              onClick={onResetText}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-500 transition"
              title="Reset to Original Uploaded Content"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Formatting Toolbar (visible in Edit Mode) */}
      {viewMode === "edit" && (
        <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-100/60 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950/60 text-xs overflow-x-auto">
          <button
            onClick={() => insertFormatting("**", "**")}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold"
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => insertFormatting("*", "*")}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 italic"
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          {isMarkdown && (
            <>
              <button
                onClick={() => insertFormatting("# ")}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Heading"
              >
                <Heading className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => insertFormatting("- ")}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Bullet List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => insertFormatting("`", "`")}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Code"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => insertFormatting("> ")}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Quote"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <span className="ml-auto text-[11px] font-mono text-zinc-500">
            {wordCount} words | {charCount} chars
          </span>
        </div>
      )}

      {/* Main Content Area: Editor OR Live Preview */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === "edit" ? (
          <textarea
            id="text-tool-textarea"
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Type or edit your text content here..."
            className="w-full h-full min-h-[300px] bg-transparent font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
          />
        ) : (
          <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
            {isMarkdown ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: renderSimpleMarkdown(textValue),
                }}
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {textValue || "No text content to preview."}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderSimpleMarkdown(markdown: string): string {
  if (!markdown.trim()) return '<p class="text-zinc-400 italic">No text content to preview.</p>';

  const lines = markdown.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const l = line.trim();
    if (!l) {
      result.push('<div class="h-2"></div>');
      continue;
    }

    if (l.startsWith("# ")) {
      result.push(`<h1 class="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1 mt-4 mb-2">${formatInline(l.slice(2))}</h1>`);
    } else if (l.startsWith("## ")) {
      result.push(`<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1 mt-3 mb-1.5">${formatInline(l.slice(3))}</h2>`);
    } else if (l.startsWith("### ")) {
      result.push(`<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-2 mb-1">${formatInline(l.slice(4))}</h3>`);
    } else if (l.startsWith("> ")) {
      result.push(`<blockquote class="border-l-4 border-emerald-500 pl-3 py-1 my-1.5 italic text-zinc-600 dark:text-zinc-400 bg-emerald-500/5 rounded-r-lg">${formatInline(l.slice(2))}</blockquote>`);
    } else if (l.startsWith("- ") || l.startsWith("* ")) {
      result.push(`<li class="ml-4 list-disc text-zinc-800 dark:text-zinc-200">${formatInline(l.slice(2))}</li>`);
    } else {
      result.push(`<p class="mb-1 text-zinc-800 dark:text-zinc-200">${formatInline(l)}</p>`);
    }
  }

  return result.join("");
}

function formatInline(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-zinc-900 dark:text-zinc-100">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[11px] text-violet-500">$1</code>');
}
