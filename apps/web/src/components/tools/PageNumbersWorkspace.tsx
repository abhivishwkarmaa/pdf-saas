"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Sliders,
  Type,
  Layout,
  Loader2,
  ZoomIn,
  ZoomOut,
  Layers,
  Palette,
  ArrowLeft,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Hash,
} from "lucide-react";
import Link from "next/link";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface PageNumbersWorkspaceProps {
  tool: ToolDefinition;
}

type PositionType =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type NumStyle = "1,2,3" | "i,ii,iii" | "I,II,III" | "a,b,c" | "A,B,C";
type PageRangeType = "all" | "odd" | "even" | "custom";
type FontFamilyType = "Helvetica" | "TimesRoman" | "Courier";

const POSITION_LABELS: Record<PositionType, string> = {
  "top-left": "Top Left",
  "top-center": "Top Center",
  "top-right": "Top Right",
  "middle-left": "Middle Left",
  "middle-center": "Center",
  "middle-right": "Middle Right",
  "bottom-left": "Bottom Left",
  "bottom-center": "Bottom Center",
  "bottom-right": "Bottom Right",
};

interface PresetFormat {
  id: string;
  label: string;
  prefix: string;
  suffix: string;
  style: NumStyle;
}

const FORMAT_PRESETS: PresetFormat[] = [
  { id: "simple", label: "1, 2, 3", prefix: "", suffix: "", style: "1,2,3" },
  { id: "page_n", label: "Page 1", prefix: "Page ", suffix: "", style: "1,2,3" },
  { id: "page_n_of_total", label: "Page 1 of N", prefix: "Page ", suffix: " of {total}", style: "1,2,3" },
  { id: "slash_total", label: "1 / N", prefix: "", suffix: " / {total}", style: "1,2,3" },
  { id: "hyphen", label: "- 1 -", prefix: "- ", suffix: " -", style: "1,2,3" },
  { id: "roman_lower", label: "i, ii, iii", prefix: "", suffix: "", style: "i,ii,iii" },
  { id: "roman_upper", label: "I, II, III", prefix: "", suffix: "", style: "I,II,III" },
  { id: "alpha_lower", label: "a, b, c", prefix: "", suffix: "", style: "a,b,c" },
];

const COLOR_SWATCHES = [
  { name: "Black", hex: "#0f172a" },
  { name: "Dark Gray", hex: "#475569" },
  { name: "Medium Gray", hex: "#94a3b8" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Emerald", hex: "#10b981" },
];

export function PageNumbersWorkspace({ tool }: PageNumbersWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: FileText,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPageNum, setPreviewPageNum] = useState(1);
  const [zoom, setZoom] = useState(1.0);

  // Position
  const [position, setPosition] = useState<PositionType>("bottom-center");

  // Format & Typography
  const [numStyle, setNumStyle] = useState<NumStyle>("1,2,3");
  const [startNumber, setStartNumber] = useState<number>(1);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [fontFamily, setFontFamily] = useState<FontFamilyType>("Helvetica");
  const [fontSize, setFontSize] = useState<number>(12);
  const [margin, setMargin] = useState<number>(30); // in points
  const [color, setColor] = useState<string>("#0f172a");

  // Page Targeting
  const [pageRangeType, setPageRangeType] = useState<PageRangeType>("all");
  const [customRange, setCustomRange] = useState("");

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // PDF.js script loader
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

  // Load PDF & render page preview
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;
    const currentFile = file;
    let active = true;

    async function loadPdf() {
      setLoading(true);
      setPreviewUrl(null);
      setResultBlob(null);

      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (active) {
          setTotalPages(pdfDoc.numPages);
          const page = await pdfDoc.getPage(previewPageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            if (active) {
              setPreviewUrl(canvas.toDataURL());
            }
          }
        }
      } catch (err) {
        console.error("PDF load error:", err);
        if (active) {
          toast.error("Could not load PDF page preview");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPdf();
    return () => {
      active = false;
    };
  }, [file, pdfjsLoaded, previewPageNum]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > tool.maxMb * 1024 * 1024) {
        toast.error(`File size exceeds limit of ${tool.maxMb} MB`);
        return;
      }
      setFile(selected);
      setPreviewPageNum(1);
      setResultBlob(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setPreviewPageNum(1);
    setResultBlob(null);
    setResultFileName("");
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const options: pdf.PageNumberOptions = {
        position,
        margin,
        style: numStyle,
        startNumber,
        prefix,
        suffix,
        fontFamily,
        fontSize,
        color,
        pageRangeType,
        customRange,
      };

      const outBlob = await pdf.addPageNumbers(file, options);
      const outName = `${file.name.replace(/\.[^/.]+$/, "")}_numbered.pdf`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      // Download
      pdf.downloadBlob(outBlob, outName);
      toast.success("Successfully added page numbers to PDF!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to add page numbers");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!resultBlob || !resultFileName) return;
    pdf.downloadBlob(resultBlob, resultFileName);
    toast.success("Downloaded numbered PDF!");
  };

  const applyFormatPreset = (preset: PresetFormat) => {
    setPrefix(preset.prefix);
    setSuffix(preset.suffix);
    setNumStyle(preset.style);
  };

  // Live preview mockup page numbering format helper
  const getPreviewText = () => {
    let formatted = "";
    const num = (previewPageNum - 1) + startNumber;
    if (numStyle === "1,2,3") formatted = String(num);
    else if (numStyle === "i,ii,iii") formatted = "i";
    else if (numStyle === "I,II,III") formatted = "I";
    else if (numStyle === "a,b,c") formatted = "a";
    else if (numStyle === "A,B,C") formatted = "A";

    const p = prefix.replace(/\{total\}/gi, String(totalPages || 1));
    const s = suffix.replace(/\{total\}/gi, String(totalPages || 1));
    return `${p}${formatted}${s}`;
  };

  const getCssFontFamily = () => {
    if (fontFamily === "TimesRoman") return "'Times New Roman', Times, serif";
    if (fontFamily === "Courier") return "'Courier New', Courier, monospace";
    return "sans-serif";
  };

  // Generate CSS styles for preview dot positioning
  const getMockupPositionStyle = (): React.CSSProperties => {
    const pad = `${Math.max(12, margin * 0.45 * zoom)}px`;
    const styleObj: React.CSSProperties = {
      position: "absolute",
      fontFamily: getCssFontFamily(),
      fontSize: `${Math.max(9, fontSize * 0.8 * zoom)}px`,
      fontWeight: "600",
      color: color,
      lineHeight: 1,
      pointerEvents: "none",
      zIndex: 10,
      whiteSpace: "nowrap",
      transition: "all 0.15s ease-out",
    };

    // Y position
    if (position.startsWith("top")) {
      styleObj.top = pad;
    } else if (position.startsWith("middle")) {
      styleObj.top = "50%";
      styleObj.transform = "translateY(-50%)";
    } else {
      styleObj.bottom = pad;
    }

    // X position
    if (position.endsWith("left")) {
      styleObj.left = pad;
    } else if (position.endsWith("center")) {
      styleObj.left = "50%";
      styleObj.transform = styleObj.transform
        ? `${styleObj.transform} translateX(-50%)`
        : "translateX(-50%)";
    } else {
      styleObj.right = pad;
    }

    return styleObj;
  };

  const originalSizeMb = file ? (file.size / (1024 * 1024)).toFixed(2) : "0";
  const Icon = theme.icon;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <Toaster position="top-center" richColors />

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/#pdf"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to PDF Tools
        </Link>

        {file && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Number Another File
          </button>
        )}
      </div>

      {/* Header */}
      {!file && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            Page Numbering
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

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
            <Hash className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag a PDF document here to add page numbers
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Stamp sequential headers, footers, roman numerals & custom numbering.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max file size: {tool.maxMb} MB
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {file && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Real-Time Live Preview Canvas */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Document Header Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs sm:max-w-md truncate">
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {originalSizeMb} MB
                    </span>
                    <span>•</span>
                    <span>{totalPages} Pages</span>
                    <span>•</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      Position: {POSITION_LABELS[position]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
                  className="rounded p-1 text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                  className="rounded p-1 text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Conversion Result Banner (Shown after processing) */}
            {resultBlob && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      Page Numbers Added!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Ready
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Your document has been numbered with vector precision.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadAgain}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Again
                </button>
              </div>
            )}

            {/* Live PDF Canvas Stage */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[420px] flex flex-col items-center justify-center relative overflow-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Rendering PDF page canvas...
                  </p>
                </div>
              ) : previewUrl ? (
                <>
                  <div
                    className="relative rounded-lg shadow-xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden select-none transition-all my-auto"
                    style={{
                      width: `${320 * zoom}px`,
                      height: `${440 * zoom}px`,
                    }}
                  >
                    {/* PDF Page Background */}
                    <img
                      src={previewUrl}
                      alt={`PDF Page ${previewPageNum} Preview`}
                      className="w-full h-full object-contain pointer-events-none absolute inset-0 z-0"
                      draggable={false}
                    />

                    {/* Page Number Overlay Mockup */}
                    <div style={getMockupPositionStyle()}>
                      {getPreviewText()}
                    </div>
                  </div>

                  {/* Page Navigator */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-xs text-xs">
                      <button
                        type="button"
                        disabled={previewPageNum <= 1}
                        onClick={() => setPreviewPageNum((p) => Math.max(1, p - 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Page {previewPageNum} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={previewPageNum >= totalPages}
                        onClick={() => setPreviewPageNum((p) => Math.min(totalPages, p + 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-400">No preview available</p>
              )}
            </div>
          </div>

          {/* Right Column: Customization Controls Sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Sliders className="h-4 w-4 text-red-600 dark:text-red-400" />
                  Page Number Settings
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure placement, formatting style, and typography.
                </p>
              </div>

              {/* 3x3 Position Grid */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Placement Position:
                </label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
                  {(
                    [
                      "top-left",
                      "top-center",
                      "top-right",
                      "middle-left",
                      "middle-center",
                      "middle-right",
                      "bottom-left",
                      "bottom-center",
                      "bottom-right",
                    ] as PositionType[]
                  ).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosition(pos)}
                      className={cn(
                        "flex items-center justify-center rounded-lg py-2 text-[11px] font-semibold transition",
                        position === pos
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      )}
                    >
                      {POSITION_LABELS[pos]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Format Presets */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Format Style Presets:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {FORMAT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyFormatPreset(preset)}
                      className={cn(
                        "rounded-lg px-2 py-1.5 text-[11px] font-semibold border transition text-center",
                        prefix === preset.prefix && suffix === preset.suffix && numStyle === preset.style
                          ? "bg-red-600 text-white border-red-600 shadow-xs"
                          : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prefix & Suffix Custom Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Prefix Text:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Page "
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Suffix Text:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. of {total}"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Start Number & Font Family */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Start Numbering At:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Font Family:
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as FontFamilyType)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white font-medium"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="TimesRoman">Times New Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>
              </div>

              {/* Font Size & Margin Sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Font Size:
                    </label>
                    <span className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                      {fontSize} pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    step="1"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Edge Margin:
                    </label>
                    <span className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                      {margin} pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="5"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Number Color:
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setColor(swatch.hex)}
                      style={{ backgroundColor: swatch.hex }}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-transform",
                        color === swatch.hex
                          ? "scale-110 border-red-500 ring-2 ring-red-500/30"
                          : "border-zinc-300 dark:border-zinc-700 hover:scale-105"
                      )}
                      title={swatch.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border border-zinc-300 bg-transparent p-0 dark:border-zinc-700"
                    title="Custom Color"
                  />
                </div>
              </div>

              {/* Page Range Targeting */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Target Pages:
                </label>
                <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs mb-2">
                  {(["all", "odd", "even", "custom"] as PageRangeType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPageRangeType(type)}
                      className={cn(
                        "rounded py-1 font-semibold uppercase transition",
                        pageRangeType === type
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {pageRangeType === "custom" && (
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 5"
                    value={customRange}
                    onChange={(e) => setCustomRange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                )}
              </div>

              {/* Guarantee Checklist Card */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Vector PDF Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Exact font embedding & scalable vector numbers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>100% Client-side local processing & security</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => void handleProcess()}
                disabled={processing}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  processing && "opacity-80 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Adding Page Numbers...</span>
                  </>
                ) : (
                  <>
                    <Hash className="h-4 w-4" />
                    <span>Add Page Numbers to PDF</span>
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
