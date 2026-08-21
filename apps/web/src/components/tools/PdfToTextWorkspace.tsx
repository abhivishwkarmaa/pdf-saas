"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Check,
  CheckCircle2,
  ZoomIn,
  RefreshCw,
  ArrowLeft,
  Download,
  Copy,
  ShieldCheck,
  FileCheck,
  Sparkles,
  Layers,
  AlignLeft,
  FileCode,
  Sliders,
  Maximize2,
  Clock,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface PdfToTextWorkspaceProps {
  tool: ToolDefinition;
}

interface PageThumbnail {
  pageNumber: number;
  previewUrl: string;
  width: number;
  height: number;
  text: string;
}

type TextLayoutMode = "layout" | "flow" | "compact";

interface LayoutPreset {
  id: TextLayoutMode;
  title: string;
  description: string;
  badge: string;
  isPopular?: boolean;
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "layout",
    title: "Preserve Layout (Recommended)",
    description: "Maintains original line breaks, column spacing, tables, and paragraph indents.",
    badge: "Recommended",
    isPopular: true,
  },
  {
    id: "flow",
    title: "Continuous Reading Flow",
    description: "Smoothly joins broken lines into continuous paragraphs. Ideal for reading & AI prompts.",
    badge: "AI & Reading",
  },
  {
    id: "compact",
    title: "Compact Raw Text",
    description: "Strips repeated whitespaces and blank lines into a single, compact text stream.",
    badge: "Compact",
  },
];

export function PdfToTextWorkspace({ tool }: PdfToTextWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: FileText,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");

  const [extractedText, setExtractedText] = useState<string>("");
  const [selectedLayout, setSelectedLayout] = useState<TextLayoutMode>("layout");
  const [includePageMarkers, setIncludePageMarkers] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // Zoom modal & thumb size
  const [previewModalPage, setPreviewModalPage] = useState<number | null>(null);
  const [thumbSize, setThumbSize] = useState<"sm" | "md" | "lg">("md");
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfjsLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Load PDF, render thumbnails and extract text per page
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;

    let isCancelled = false;

    const renderPdfAndExtract = async () => {
      setLoadingPdf(true);
      setLoadingProgress("Initializing document...");
      setPages([]);
      setExtractedText("");
      setResultBlob(null);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js library not loaded yet.");

        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages;
        setTotalPages(total);

        const loadedPages: PageThumbnail[] = [];
        const fullTextPieces: string[] = [];

        for (let i = 1; i <= total; i++) {
          if (isCancelled) return;
          setLoadingProgress(`Extracting page ${i} of ${total}...`);

          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.6 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");

          let previewUrl = "";
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            previewUrl = canvas.toDataURL("image/jpeg", 0.85);
          }

          // Extract text content
          const textContent = await page.getTextContent();
          let pageRawText = "";
          let lastY: number | null = null;

          for (const item of textContent.items as any[]) {
            const currentY = item.transform[5];
            if (lastY !== null && Math.abs(currentY - lastY) > 5) {
              pageRawText += "\n";
            } else if (lastY !== null) {
              pageRawText += " ";
            }
            pageRawText += item.str;
            lastY = currentY;
          }

          loadedPages.push({
            pageNumber: i,
            previewUrl,
            width: viewport.width,
            height: viewport.height,
            text: pageRawText,
          });

          if (includePageMarkers) {
            fullTextPieces.push(`--- Page ${i} ---\n${pageRawText.trim()}`);
          } else {
            fullTextPieces.push(pageRawText.trim());
          }
        }

        if (!isCancelled) {
          setPages(loadedPages);
          setExtractedText(fullTextPieces.join("\n\n"));
        }
      } catch (err) {
        console.error("Error reading PDF text:", err);
        toast.error("Could not extract text from this PDF file.");
      } finally {
        if (!isCancelled) {
          setLoadingPdf(false);
          setLoadingProgress("");
        }
      }
    };

    void renderPdfAndExtract();

    return () => {
      isCancelled = true;
    };
  }, [file, pdfjsLoaded, includePageMarkers]);

  // Reformat text when layout mode changes
  const getFormattedText = (): string => {
    if (!pages.length) return extractedText;

    return pages
      .map((p) => {
        let text = p.text;
        if (selectedLayout === "flow") {
          text = text.replace(/\n(?!\n)/g, " ").replace(/\s+/g, " ").trim();
        } else if (selectedLayout === "compact") {
          text = text.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
        } else {
          text = text.trim();
        }

        return includePageMarkers ? `--- Page ${p.pageNumber} ---\n${text}` : text;
      })
      .join("\n\n");
  };

  const currentDisplayText = getFormattedText();

  // Metrics
  const wordCount = currentDisplayText
    .replace(/--- Page \d+ ---/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const charCount = currentDisplayText.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a valid PDF file");
      return;
    }

    if (selected.size > tool.maxMb * 1024 * 1024) {
      toast.error(`File size exceeds limit of ${tool.maxMb} MB`);
      return;
    }

    setFile(selected);
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setTotalPages(0);
    setExtractedText("");
    setResultBlob(null);
    setResultFileName("");
  };

  const handleCopy = async () => {
    if (!currentDisplayText) return;
    await navigator.clipboard.writeText(currentDisplayText);
    setCopied(true);
    toast.success("Extracted text copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    if (!currentDisplayText || !file) return;
    const blob = new Blob([currentDisplayText], { type: "text/plain;charset=utf-8" });
    const fileName = `${file.name.replace(/\.[^/.]+$/, "")}.txt`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded plain text (.txt) file!");
  };

  const originalSizeMb = file ? (file.size / (1024 * 1024)).toFixed(2) : "0";
  const Icon = theme.icon;

  return (
    <>
      <Toaster position="top-center" richColors />

      {!file && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            Text Extraction
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            Extract clean, selectable plain text from PDF documents with layout preservation.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/#pdf"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to PDF Tools
          </Link>

          {file && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Extract Another PDF
            </button>
          )}
        </div>

        {/* Upload Dropzone */}
        {!file && (
          <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
            <span className="upload-icon-container group-hover:scale-105 transition-transform">
              <AlignLeft className="h-8 w-8 text-red-600 dark:text-red-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag a PDF file here to extract text
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Extract readable plain text from PDF pages with full layout preservation and copy/download tools.
              </p>
              <p className="mt-2 text-[11px] font-medium text-zinc-400">
                Max file size: {tool.maxMb} MB
              </p>
            </span>
          </label>
        )}

        {/* Workspace */}
        {file && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Area: Visual Document Inspection & Pages Gallery */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Header Document Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-xs">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs truncate">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {originalSizeMb} MB
                      </span>
                      <span>•</span>
                      <span>{totalPages} Pages</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                  <span className="px-2 text-[11px] font-medium text-zinc-500">Size:</span>
                  <button
                    onClick={() => setThumbSize("sm")}
                    className={cn(
                      "rounded px-2 py-0.5 font-medium transition",
                      thumbSize === "sm"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    S
                  </button>
                  <button
                    onClick={() => setThumbSize("md")}
                    className={cn(
                      "rounded px-2 py-0.5 font-medium transition",
                      thumbSize === "md"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setThumbSize("lg")}
                    className={cn(
                      "rounded px-2 py-0.5 font-medium transition",
                      thumbSize === "lg"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    L
                  </button>
                </div>
              </div>

              {/* Thumbnails Gallery */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[350px] max-h-[calc(100vh-250px)] overflow-y-auto">
                {loadingPdf && pages.length < totalPages ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Extracting document text...
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{loadingProgress}</p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-3",
                      thumbSize === "sm" && "grid-cols-3 sm:grid-cols-4",
                      thumbSize === "md" && "grid-cols-2 sm:grid-cols-3",
                      thumbSize === "lg" && "grid-cols-1 sm:grid-cols-2"
                    )}
                  >
                    {pages.map((p) => (
                      <div
                        key={p.pageNumber}
                        className="group relative flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/50 p-2 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 select-none"
                      >
                        <div className="relative mb-2 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 aspect-[3/4] w-full">
                          <img
                            src={p.previewUrl}
                            alt={`Page ${p.pageNumber}`}
                            className="h-full w-full object-contain pointer-events-none"
                            loading="lazy"
                          />

                          {/* Zoom Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewModalPage(p.pageNumber)}
                            className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white sm:opacity-0 transition sm:group-hover:opacity-100 hover:bg-black/80 shadow-sm"
                            title="Zoom Preview"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between px-1 text-xs">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            Page {p.pageNumber}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Area: Extracted Text Editor & Controls */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                {/* Header & Metrics */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-900">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <AlignLeft className="h-4 w-4 text-red-600 dark:text-red-400" />
                      Extracted Plain Text
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {wordCount.toLocaleString()} words
                      </span>
                      <span>•</span>
                      <span>{charCount.toLocaleString()} chars</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> ~{readTimeMinutes} min read
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleCopy()}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 transition active:scale-95"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadTxt}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download TXT</span>
                    </button>
                  </div>
                </div>

                {/* Layout Style Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Text Formatting Mode:
                  </label>
                  <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                    {LAYOUT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedLayout(preset.id)}
                        className={cn(
                          "rounded px-2.5 py-1 font-semibold transition",
                          selectedLayout === preset.id
                            ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        )}
                      >
                        {preset.badge}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    value={currentDisplayText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    placeholder="Extracting text from PDF pages..."
                    rows={14}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 font-mono text-xs text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 leading-relaxed"
                  />
                </div>

                {/* Page Markers Checkbox & Features */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePageMarkers}
                      onChange={(e) => setIncludePageMarkers(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Include Page Header Dividers (e.g. --- Page 1 ---)
                    </span>
                  </label>

                  <span className="text-[11px] text-zinc-400">
                    UTF-8 Plain Text Format
                  </span>
                </div>

                {/* Checklist */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Plain Text Export Features:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>100% Clean UTF-8 Plain Text</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Single-Click Copy to Clipboard</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>AI Prompt & LLM Ready</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Universal Notepad & Code Editor Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Full Page Zoom View */}
      {previewModalPage !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalPage(null)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] max-w-2xl w-full rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h4 className="font-bold text-zinc-900 dark:text-white">
                Page {previewModalPage} of {totalPages}
              </h4>
              <button
                onClick={() => setPreviewModalPage(null)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[400px]">
              {pages.find((p) => p.pageNumber === previewModalPage)?.previewUrl ? (
                <img
                  src={pages.find((p) => p.pageNumber === previewModalPage)?.previewUrl}
                  alt={`Page ${previewModalPage}`}
                  className="max-h-[70vh] max-w-full rounded shadow-md object-contain"
                />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              )}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800 text-xs">
              <button
                disabled={previewModalPage <= 1}
                onClick={() => setPreviewModalPage((prev) => Math.max(1, (prev || 1) - 1))}
                className="rounded-lg border px-3 py-1.5 font-semibold text-zinc-700 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
              >
                Previous Page
              </button>
              <button
                disabled={previewModalPage >= totalPages}
                onClick={() => setPreviewModalPage((prev) => Math.min(totalPages, (prev || 1) + 1))}
                className="rounded-lg border px-3 py-1.5 font-semibold text-zinc-700 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
              >
                Next Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
