"use client";

import React, { useState, useRef, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  Quote,
  Eye,
  Edit3,
  Download,
  Loader2,
  ArrowLeft,
  Settings,
  FileCheck,
  RefreshCw,
  Sliders,
  Type,
  Layout,
  PenTool,
  FileType2,
  Table as TableIcon,
  CheckSquare,
  Sparkles,
  BookOpen,
  Share2,
  ShieldCheck,
  Clock,
  Strikethrough,
} from "lucide-react";
import { txtToPdf, type TextToPdfOptions } from "@/lib/client/pdf-tools";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";

interface MarkdownToPdfWorkspaceProps {
  tool: ToolDefinition;
}

const DEFAULT_MARKDOWN = `# Project Documentation

Welcome to the **Markdown to PDF Converter**! Write or upload your markdown content to generate clean, publication-ready PDF documents instantly.

## 🚀 Key Features
- **Real-Time Live Preview**: Watch your PDF update as you type.
- **Rich Syntax Support**: Headers, tables, lists, blockquotes, and code snippets.
- **100% Client-Side Privacy**: Fast conversion directly inside your browser.

### 📊 Performance Summary
| Metric | Before | After | Improvement |
| :--- | :--- | :--- | :--- |
| Render Time | 120ms | 18ms | **+85% Faster** |
| Memory Usage | 45MB | 12MB | **-73% Lighter** |

> "Simplicity is prerequisite for reliability." — Edsger W. Dijkstra

### 💻 Code Snippet
\`\`\`javascript
function calculateScore(items) {
  return items.reduce((acc, curr) => acc + curr.points, 0);
}
\`\`\`

### ✅ Task Checklist
- [x] Write structured project outline
- [x] Configure page margins & typography
- [ ] Export high-definition PDF

Start writing your document here...`;

export function MarkdownToPdfWorkspace({ tool }: MarkdownToPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20",
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/20",
    icon: FileText,
  };

  // State
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [originalFileText, setOriginalFileText] = useState<string>("");
  const [markdownValue, setMarkdownValue] = useState<string>(DEFAULT_MARKDOWN);

  // Views: "edit" (Editor) | "preview" (HTML Reader View) | "pdf" (Live PDF Document View)
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "pdf">("pdf");
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);

  // PDF Layout & Typography Options
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Legal">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [fontFamily, setFontFamily] = useState<"Helvetica" | "TimesRoman" | "Courier">("Helvetica");
  const [fontSize, setFontSize] = useState<number>(11);
  const [margin, setMargin] = useState<number>(45);
  const [lineSpacing, setLineSpacing] = useState<number>(1.35);

  // Live PDF Preview Blob State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate Live PDF Preview Blob when text or options change
  useEffect(() => {
    if (!hasStarted || !markdownValue.trim()) return;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setGeneratingPreview(true);
        const options: TextToPdfOptions = {
          pageSize,
          orientation,
          fontFamily,
          fontSize,
          lineSpacing,
          margin,
        };
        const blob = await txtToPdf(markdownValue, options);
        if (!isCancelled) {
          const url = URL.createObjectURL(blob);
          setPdfPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error("Failed to generate PDF preview:", err);
      } finally {
        if (!isCancelled) setGeneratingPreview(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [hasStarted, markdownValue, pageSize, orientation, fontFamily, fontSize, lineSpacing, margin]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, []);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > tool.maxMb * 1024 * 1024) {
      toast.error(`File exceeds maximum size limit of ${tool.maxMb} MB`);
      return;
    }

    try {
      const text = await selected.text();
      setFile(selected);
      setOriginalFileText(text);
      setMarkdownValue(text);
      setHasStarted(true);
      toast.success(`Loaded "${selected.name}" successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read markdown file content.");
    }
  };

  const handleStartDirectTyping = (template?: string) => {
    if (template) setMarkdownValue(template);
    setFile(null);
    setOriginalFileText("");
    setHasStarted(true);
  };

  const handleReset = () => {
    setHasStarted(false);
    setFile(null);
    setOriginalFileText("");
    setMarkdownValue(DEFAULT_MARKDOWN);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  // Text formatting insertion helper
  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("markdown-editor-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = markdownValue;
    const selected = current.substring(start, end);

    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const newText = current.substring(0, start) + replacement + current.substring(end);

    setMarkdownValue(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected ? selected.length : 4)
      );
    }, 0);
  };

  const insertTable = () => {
    const tableTemplate = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data A | Data B | Data C |\n| Data D | Data E | Data F |\n\n`;
    insertFormatting(tableTemplate);
  };

  const handleCopy = () => {
    if (!markdownValue) return;
    navigator.clipboard.writeText(markdownValue);
    setCopied(true);
    toast.success("Markdown copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate & Download final PDF
  const handleExportPdf = async () => {
    if (!markdownValue.trim()) {
      toast.error("Please enter some markdown content before converting.");
      return;
    }

    setProcessing(true);
    try {
      const options: TextToPdfOptions = {
        pageSize,
        orientation,
        fontFamily,
        fontSize,
        lineSpacing,
        margin,
      };

      const pdfBlob = await txtToPdf(markdownValue, options);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "document";
      a.download = `${baseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF document.");
    } finally {
      setProcessing(false);
    }
  };

  // Download .md source file
  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownValue], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "document";
    a.download = `${baseName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded .md source file!");
  };

  // Metrics
  const charCount = markdownValue.length;
  const wordCount = markdownValue.trim() ? markdownValue.trim().split(/\s+/).length : 0;
  const lineCount = markdownValue ? markdownValue.split("\n").length : 0;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const Icon = theme.icon;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <Toaster position="top-center" richColors />

      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/#text"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Text Tools
        </Link>

        {hasStarted && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            New Document
          </button>
        )}
      </div>

      {/* Header (When on Start Screen) */}
      {!hasStarted && (
        <div className="mx-auto max-w-3xl space-y-8 py-4">
          <div className="text-center space-y-2.5">
            <span
              className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
            >
              <Icon className="h-3.5 w-3.5" />
              Markdown to PDF Publishing Studio
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Convert Markdown to Publication-Ready PDF
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              Upload existing .md files or write directly with real-time PDF previews, custom formatting, and zero server uploads.
            </p>
          </div>

          {/* DUAL CHOICE ENTRY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* OPTION 1: UPLOAD .MD FILE */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div>
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Option 1: Upload .md File
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Drag and drop your Markdown file (.md, .markdown) or click to browse.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Upload document</span>
                <span>→</span>
              </div>
            </div>

            {/* OPTION 2: WRITE FROM SCRATCH */}
            <div
              onClick={() => handleStartDirectTyping()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <div>
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <PenTool className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Option 2: Write in Markdown Editor
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Start with rich sample template or write custom documentation with live PDF rendering.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Open Live Studio</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE WORKSPACE */}
      {hasStarted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Markdown Editor & Live PDF View */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Top Bar with Document Info & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-[200px] sm:max-w-xs truncate">
                    {file ? file.name : "Untitled Document.md"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{lineCount} lines</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {readTimeMin} min read
                    </span>
                  </div>
                </div>
              </div>

              {/* View Mode Switcher Pills */}
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2.5 py-1.5 font-semibold transition",
                    viewMode === "edit"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Edit3 className="h-3.5 w-3.5 text-violet-600" />
                  <span>Editor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("pdf")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2.5 py-1.5 font-semibold transition",
                    viewMode === "pdf"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <FileType2 className="h-3.5 w-3.5 text-violet-600" />
                  <span>Live PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2.5 py-1.5 font-semibold transition",
                    viewMode === "preview"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Eye className="h-3.5 w-3.5 text-violet-600" />
                  <span>Reader</span>
                </button>
              </div>
            </div>

            {/* MAIN WORKSPACE CANVAS CONTAINER */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              {/* Markdown Formatting Toolbar (Visible in Edit Mode) */}
              {viewMode === "edit" && (
                <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="Bold (**text**)"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("*", "*")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 italic transition"
                    title="Italic (*text*)"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("~~", "~~")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Strikethrough (~~text~~)"
                  >
                    <Strikethrough className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

                  <button
                    onClick={() => insertFormatting("# ")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="H1 Title"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => insertFormatting("## ")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="H2 Subtitle"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => insertFormatting("### ")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="H3 Section"
                  >
                    H3
                  </button>

                  <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

                  <button
                    onClick={() => insertFormatting("- ")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Bullet List (- item)"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("- [ ] ")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Task Checkbox (- [ ] task)"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={insertTable}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Insert Markdown Table"
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("```\n", "\n```")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono transition"
                    title="Code Block"
                  >
                    <Code className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("> ")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Blockquote"
                  >
                    <Quote className="h-3.5 w-3.5" />
                  </button>

                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                      title="Copy Markdown"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 1: MARKDOWN TEXTAREA EDITOR */}
              {viewMode === "edit" && (
                <div className="flex-1 p-4 bg-zinc-50/30 dark:bg-zinc-950/20">
                  <textarea
                    id="markdown-editor-textarea"
                    value={markdownValue}
                    onChange={(e) => setMarkdownValue(e.target.value)}
                    placeholder="Type or paste your markdown text here..."
                    className="w-full h-full min-h-[440px] bg-transparent font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* VIEW 2: LIVE PDF PREVIEW */}
              {viewMode === "pdf" && (
                <div className="flex-1 p-3 overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex flex-col relative min-h-[460px]">
                  {generatingPreview && (
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow-md text-xs font-bold text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
                      Live PDF Updating...
                    </div>
                  )}

                  {pdfPreviewUrl ? (
                    <iframe
                      src={`${pdfPreviewUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full min-h-[480px] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner bg-white"
                      title="Live PDF Document Preview"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2 min-h-[350px]">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <p className="text-xs font-semibold">Synthesizing Live PDF Preview...</p>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 3: HTML READER PREVIEW */}
              {viewMode === "preview" && (
                <div className="flex-1 p-5 overflow-auto bg-zinc-50/30 dark:bg-zinc-950/20">
                  <div
                    className="prose dark:prose-invert max-w-none text-xs leading-relaxed p-6 font-sans whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
                    style={{
                      fontFamily:
                        fontFamily === "TimesRoman"
                          ? "'Times New Roman', Times, serif"
                          : fontFamily === "Courier"
                          ? "'Courier New', Courier, monospace"
                          : "system-ui, -apple-system, sans-serif",
                      fontSize: `${fontSize}pt`,
                      lineHeight: lineSpacing,
                    }}
                  >
                    {markdownValue ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderSimpleMarkdown(markdownValue),
                        }}
                      />
                    ) : (
                      <span className="text-zinc-400 italic">No markdown content available.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: PDF Layout, Typography & Export Options */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Sliders className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  PDF Styling & Layout
                </h3>
                <p className="text-xs text-zinc-500">
                  Customize page geometry, margins, and typography.
                </p>
              </div>

              {/* Page Geometry (Size & Orientation) */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Page Size:
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  >
                    <option value="A4">A4 (Standard)</option>
                    <option value="Letter">US Letter</option>
                    <option value="Legal">US Legal</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Orientation:
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  >
                    <option value="portrait">Portrait (Vertical)</option>
                    <option value="landscape">Landscape (Wide)</option>
                  </select>
                </div>
              </div>

              {/* Font Family Selection */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Document Typography:
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: "Helvetica", name: "Modern", font: "Sans-Serif" },
                    { id: "TimesRoman", name: "Academic", font: "Serif" },
                    { id: "Courier", name: "Monospace", font: "Code" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id as any)}
                      className={cn(
                        "p-2 rounded-lg border text-center transition flex flex-col items-center gap-0.5",
                        fontFamily === f.id
                          ? "border-violet-500 bg-violet-50/60 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 font-bold"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      <span className="text-[11px]">{f.name}</span>
                      <span className="text-[9px] text-zinc-400 font-mono">{f.font}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Line Spacing Sliders */}
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Base Font Size:</span>
                    <span className="font-mono text-violet-600">{fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="9"
                    max="16"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Line Spacing:</span>
                    <span className="font-mono text-violet-600">{lineSpacing}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.1"
                    max="1.8"
                    step="0.05"
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Page Margins:</span>
                    <span className="font-mono text-violet-600">{margin} px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  100% Client-Side Privacy:
                </span>
                <p>
                  Documents are formatted and compiled directly in your browser. No markdown data is sent to external servers.
                </p>
              </div>

              {/* Export Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => void handleExportPdf()}
                  disabled={processing || !markdownValue.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                    theme.button,
                    (processing || !markdownValue.trim()) && "opacity-75 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating PDF Document...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Export to PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="w-full py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition"
                >
                  Download .md Source File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Markdown parser helper for Reader view
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
      result.push(`<h1 class="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1.5 mt-4 mb-2">${formatInline(l.slice(2))}</h1>`);
    } else if (l.startsWith("## ")) {
      result.push(`<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1 mt-3 mb-1.5">${formatInline(l.slice(3))}</h2>`);
    } else if (l.startsWith("### ")) {
      result.push(`<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-2 mb-1">${formatInline(l.slice(4))}</h3>`);
    } else if (l.startsWith("> ")) {
      result.push(`<blockquote class="border-l-4 border-violet-500 pl-3 py-1 my-2 italic text-zinc-600 dark:text-zinc-400 bg-violet-500/5 rounded-r-lg">${formatInline(l.slice(2))}</blockquote>`);
    } else if (l.startsWith("- [x] ") || l.startsWith("- [X] ")) {
      result.push(`<div class="flex items-center gap-2 my-1 text-zinc-800 dark:text-zinc-200"><span class="h-4 w-4 rounded bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span> <span class="line-through text-zinc-500">${formatInline(l.slice(6))}</span></div>`);
    } else if (l.startsWith("- [ ] ")) {
      result.push(`<div class="flex items-center gap-2 my-1 text-zinc-800 dark:text-zinc-200"><span class="h-4 w-4 rounded border border-zinc-400 dark:border-zinc-600"></span> <span>${formatInline(l.slice(6))}</span></div>`);
    } else if (l.startsWith("- ") || l.startsWith("* ")) {
      result.push(`<li class="ml-4 list-disc text-zinc-800 dark:text-zinc-200 my-0.5">${formatInline(l.slice(2))}</li>`);
    } else if (l.startsWith("|") && l.endsWith("|")) {
      // Simple table row rendering
      const cells = l.split("|").filter((c, i, a) => i !== 0 && i !== a.length - 1);
      if (cells.some((c) => c.includes("---"))) {
        continue;
      }
      const isHeader = result.length > 0 && !result[result.length - 1].includes("</tr>");
      result.push(
        `<div class="grid grid-cols-${cells.length} gap-2 p-1.5 rounded text-xs ${
          isHeader ? "font-bold bg-zinc-100 dark:bg-zinc-800" : "border-b border-zinc-100 dark:border-zinc-800/50"
        }">${cells.map((c) => `<div class="truncate">${formatInline(c.trim())}</div>`).join("")}</div>`
      );
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
    .replace(/~~(.*?)~~/g, '<span class="line-through text-zinc-500">$1</span>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[11px] text-violet-600 dark:text-violet-400">$1</code>');
}
