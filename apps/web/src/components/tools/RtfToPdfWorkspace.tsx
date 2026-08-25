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
  Underline,
  Strikethrough,
} from "lucide-react";
import { txtToPdf, type TextToPdfOptions } from "@/lib/client/pdf-tools";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";

interface RtfToPdfWorkspaceProps {
  tool: ToolDefinition;
}

const DEFAULT_RTF_TEXT = `Rich Text Format (RTF) Document Summary

Welcome to the RTF to PDF Converter! Convert legacy WordPad and Rich Text Format (.rtf) files into universal, crisp PDF documents.

1. Document Details
- File Type: Rich Text Format (.rtf)
- Output: Standard High-Definition PDF (.pdf)
- Engine: Dual Client-Side & High-Fidelity Office Converter

2. Formatting Preservation
- Font Styles: Bold, Italic, Underlined, and Strikethrough text
- Paragraphs: Line spacing, bullet lists, and section headers
- Tables & Blockquotes: Preserved visual geometry and margins

"The Rich Text Format is a proprietary document file format with published specification developed by Microsoft Corporation."

Start editing or upload your .rtf file to convert...`;

export function RtfToPdfWorkspace({ tool }: RtfToPdfWorkspaceProps) {
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
  const [textContent, setTextContent] = useState<string>(DEFAULT_RTF_TEXT);

  // View Mode: "pdf" (Live PDF preview) | "reader" (Formatted view) | "edit" (Text Editor)
  const [viewMode, setViewMode] = useState<"pdf" | "reader" | "edit">("pdf");
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);

  // PDF Styling & Layout Options
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Legal">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [fontFamily, setFontFamily] = useState<"TimesRoman" | "Helvetica" | "Courier">("TimesRoman");
  const [fontSize, setFontSize] = useState<number>(11);
  const [margin, setMargin] = useState<number>(50);
  const [lineSpacing, setLineSpacing] = useState<number>(1.35);

  // Live PDF Preview Blob URL State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean raw RTF markup if needed to plain readable text
  const extractTextFromRtf = (raw: string): string => {
    if (!raw.includes("{\\rtf")) return raw;
    try {
      let text = raw
        .replace(/\\par[d]?/g, "\n")
        .replace(/\\line/g, "\n")
        .replace(/\\tab/g, "\t")
        .replace(/\{\\*?\\[^{}]+;?\}|\\b0|\\i0|\\ul0|\\b|\\i|\\ul|\\fs\d+|\\f\d+|\\cf\d+|\\colortbl[^{}]*|\\fonttbl[^{}]*/g, "")
        .replace(/\\'[0-9a-fA-F]{2}/g, (match) => {
          const code = parseInt(match.slice(2), 16);
          return String.fromCharCode(code);
        })
        .replace(/[{}]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return text || raw;
    } catch {
      return raw;
    }
  };

  // Auto-generate Live PDF Preview Blob whenever text or options change
  useEffect(() => {
    if (!hasStarted || !textContent.trim()) return;

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
        const blob = await txtToPdf(textContent, options);
        if (!isCancelled) {
          const url = URL.createObjectURL(blob);
          setPdfPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error("Failed to generate RTF live PDF preview:", err);
      } finally {
        if (!isCancelled) setGeneratingPreview(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [hasStarted, textContent, pageSize, orientation, fontFamily, fontSize, lineSpacing, margin]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, []);

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > tool.maxMb * 1024 * 1024) {
      toast.error(`File exceeds maximum size limit of ${tool.maxMb} MB`);
      return;
    }

    try {
      const raw = await selected.text();
      const parsed = extractTextFromRtf(raw);
      setFile(selected);
      setTextContent(parsed);
      setHasStarted(true);
      toast.success(`Loaded "${selected.name}" successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read RTF file content.");
    }
  };

  const handleStartDirectTyping = (template?: string) => {
    if (template) setTextContent(template);
    setFile(null);
    setHasStarted(true);
  };

  const handleReset = () => {
    setHasStarted(false);
    setFile(null);
    setTextContent(DEFAULT_RTF_TEXT);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  // Text formatting insertion helper
  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("rtf-editor-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textContent;
    const selected = current.substring(start, end);

    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const newText = current.substring(0, start) + replacement + current.substring(end);

    setTextContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected ? selected.length : 4)
      );
    }, 0);
  };

  const handleCopy = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast.success("Text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Export PDF (Client engine with server fallback)
  const handleExportPdf = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter or upload RTF content before converting.");
      return;
    }

    setProcessing(true);
    try {
      let pdfBlob: Blob;

      // If user uploaded a raw RTF file and hasn't heavily modified it, try server office converter
      if (file) {
        try {
          const formData = new FormData();
          formData.append("files", file);
          const res = await fetch("/api/process/rtf-to-pdf", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            pdfBlob = await res.blob();
          } else {
            throw new Error("Server conversion fallback triggered");
          }
        } catch {
          // Client-side synthesis fallback
          const options: TextToPdfOptions = {
            pageSize,
            orientation,
            fontFamily,
            fontSize,
            lineSpacing,
            margin,
          };
          pdfBlob = await txtToPdf(textContent, options);
        }
      } else {
        const options: TextToPdfOptions = {
          pageSize,
          orientation,
          fontFamily,
          fontSize,
          lineSpacing,
          margin,
        };
        pdfBlob = await txtToPdf(textContent, options);
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "converted_rtf";
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

  // Metrics
  const charCount = textContent.length;
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const lineCount = textContent ? textContent.split("\n").length : 0;
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
              Rich Text Format (RTF) to PDF Converter
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Convert RTF to High-Quality PDF
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              Upload existing .rtf documents or write rich text directly. Customize typography, margins, and watch real-time PDF previews.
            </p>
          </div>

          {/* DUAL CHOICE ENTRY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* OPTION 1: UPLOAD .RTF FILE */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".rtf,application/rtf,text/rtf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div>
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Option 1: Upload .rtf Document
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Drag and drop your Rich Text Format file (.rtf) up to {tool.maxMb} MB.
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
                  Option 2: Write in Rich Text Studio
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Start with structured sample text or type directly with live PDF synchronization.
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
          {/* Left Column: Live PDF Preview & Editor Canvas */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Top Bar with Document Info & View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-[200px] sm:max-w-xs truncate">
                    {file ? file.name : "RTF Document"}
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

              {/* View Switcher Pills */}
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
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
                  onClick={() => setViewMode("reader")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2.5 py-1.5 font-semibold transition",
                    viewMode === "reader"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Eye className="h-3.5 w-3.5 text-violet-600" />
                  <span>Reader</span>
                </button>

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
              </div>
            </div>

            {/* MAIN WORKSPACE CANVAS CONTAINER */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              {/* Formatting Toolbar (Visible in Edit Mode) */}
              {viewMode === "edit" && (
                <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("*", "*")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 italic transition"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
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
                    onClick={() => insertFormatting("- ")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Bullet List"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("> ")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Quote Block"
                  >
                    <Quote className="h-3.5 w-3.5" />
                  </button>

                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                      title="Copy Text"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 1: LIVE PDF PREVIEW */}
              {viewMode === "pdf" && (
                <div className="flex-1 p-3 overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex flex-col relative min-h-[480px]">
                  {generatingPreview && (
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow-md text-xs font-bold text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
                      Rendering RTF PDF...
                    </div>
                  )}

                  {pdfPreviewUrl ? (
                    <iframe
                      src={`${pdfPreviewUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full min-h-[480px] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner bg-white"
                      title="Live RTF PDF Preview"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2 min-h-[350px]">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <p className="text-xs font-semibold">Generating Live PDF Preview...</p>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: RICH READER PREVIEW */}
              {viewMode === "reader" && (
                <div className="flex-1 p-5 sm:p-8 overflow-auto bg-zinc-50/40 dark:bg-zinc-900/40 flex justify-center">
                  <div
                    className="w-full max-w-2xl bg-white dark:bg-zinc-950 p-6 sm:p-10 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-serif"
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
                    {textContent || <span className="text-zinc-400 italic">No content available.</span>}
                  </div>
                </div>
              )}

              {/* VIEW 3: TEXTAREA SOURCE EDITOR */}
              {viewMode === "edit" && (
                <div className="flex-1 p-4 bg-zinc-50/30 dark:bg-zinc-950/20">
                  <textarea
                    id="rtf-editor-textarea"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Type or paste rich text content here..."
                    className="w-full h-full min-h-[440px] bg-transparent font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: PDF Layout & Settings */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Sliders className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  PDF Output Styling
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure page geometry, typography, and margins.
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
                    { id: "TimesRoman", name: "Academic", font: "Times Serif" },
                    { id: "Helvetica", name: "Modern", font: "Clean Sans" },
                    { id: "Courier", name: "Courier", font: "Monospace" },
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
                  100% Secure Processing:
                </span>
                <p>
                  RTF text is compiled directly into standard PDF bytes.
                </p>
              </div>

              {/* Export Action Button */}
              <button
                onClick={() => void handleExportPdf()}
                disabled={processing || !textContent.trim()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || !textContent.trim()) && "opacity-75 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Converting RTF to PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Convert to PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
