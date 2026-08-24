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
  RotateCw,
  Image as ImageIcon,
  ArrowLeft,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Maximize2,
  AlignJustify,
} from "lucide-react";
import Link from "next/link";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface WatermarkPdfWorkspaceProps {
  tool: ToolDefinition;
}

type WatermarkType = "text" | "image";
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
type LayerType = "over" | "under";
type PageRangeType = "all" | "odd" | "even" | "custom";
type FontFamilyType =
  | "Helvetica"
  | "HelveticaBold"
  | "TimesRoman"
  | "TimesRomanBold"
  | "Courier"
  | "CourierBold";

const TEXT_PRESETS = [
  "CONFIDENTIAL",
  "DO NOT COPY",
  "DRAFT",
  "APPROVED",
  "SAMPLE",
  "TOP SECRET",
  "URGENT",
  "COPYRIGHT",
];

const COLOR_SWATCHES = [
  { name: "Gray", hex: "#94a3b8" },
  { name: "Dark", hex: "#0f172a" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Purple", hex: "#8b5cf6" },
];

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

export function WatermarkPdfWorkspace({ tool }: WatermarkPdfWorkspaceProps) {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);

  // Watermark Settings
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");

  // Text Settings
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontFamily, setFontFamily] = useState<FontFamilyType>("HelveticaBold");
  const [fontSize, setFontSize] = useState<number>(36);
  const [color, setColor] = useState<string>("#ef4444");

  // Image Settings
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageScale, setImageScale] = useState<number>(100);
  const [watermarkImgUrl, setWatermarkImgUrl] = useState<string | null>(null);

  // Universal Options
  const [opacity, setOpacity] = useState<number>(0.35);
  const [rotation, setRotation] = useState<number>(-45);
  const [position, setPosition] = useState<PositionType>("middle-center");
  const [layer, setLayer] = useState<LayerType>("over");

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

  // Image URL cleaner
  useEffect(() => {
    if (!imageFile) {
      setWatermarkImgUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setWatermarkImgUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Load PDF & render page 1 preview
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
          const page = await pdfDoc.getPage(1);
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
          toast.error("Could not load PDF preview");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPdf();
    return () => {
      active = false;
    };
  }, [file, pdfjsLoaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > tool.maxMb * 1024 * 1024) {
        toast.error(`File size exceeds limit of ${tool.maxMb} MB`);
        return;
      }
      setFile(selected);
      setResultBlob(null);
    }
  };

  const handleWatermarkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG, JPG)");
        return;
      }
      setImageFile(selected);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setImageFile(null);
    setResultBlob(null);
    setResultFileName("");
  };

  const handleProcess = async () => {
    if (!file) return;
    if (watermarkType === "image" && !imageFile) {
      toast.error("Please upload a watermark image first.");
      return;
    }

    setProcessing(true);
    try {
      const options: Partial<pdf.WatermarkOptions> = {
        watermarkType,
        text,
        fontFamily,
        fontSize,
        opacity,
        rotation,
        color,
        position,
        layer,
        pageRangeType,
        customRange,
        imageFile: imageFile || undefined,
        imageScale,
      };

      const outBlob = await pdf.watermarkPdf(file, text, options);
      const outName = `${file.name.replace(/\.[^/.]+$/, "")}_watermarked.pdf`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      // Download
      pdf.downloadBlob(outBlob, outName);
      toast.success("Successfully added watermark to PDF!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to add watermark");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!resultBlob || !resultFileName) return;
    pdf.downloadBlob(resultBlob, resultFileName);
    toast.success("Downloaded watermarked PDF!");
  };

  const getCssFontFamily = () => {
    if (fontFamily.startsWith("Times")) return "'Times New Roman', Times, serif";
    if (fontFamily.startsWith("Courier")) return "'Courier New', Courier, monospace";
    return "sans-serif";
  };

  const getCssFontWeight = () => {
    return fontFamily.endsWith("Bold") ? "bold" : "normal";
  };

  // Watermark mockup CSS positioning
  const getMockupPositionStyle = (): React.CSSProperties => {
    const styleObj: React.CSSProperties = {
      position: "absolute",
      opacity: opacity,
      transform: `rotate(${rotation}deg)`,
      transformOrigin: "center center",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      transition: "all 0.15s ease-out",
      zIndex: layer === "over" ? 10 : 2,
    };

    if (watermarkType === "text") {
      styleObj.fontFamily = getCssFontFamily();
      styleObj.fontWeight = getCssFontWeight();
      styleObj.fontSize = `${fontSize * 0.42 * zoom}px`;
      styleObj.color = color;
    } else {
      const baseWidth = 110;
      styleObj.width = `${baseWidth * (imageScale / 100) * zoom}px`;
      styleObj.height = "auto";
    }

    const pad = "20px";

    if (position === "middle-center") {
      styleObj.top = "50%";
      styleObj.left = "50%";
      styleObj.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    } else if (position === "top-center") {
      styleObj.top = pad;
      styleObj.left = "50%";
      styleObj.transform = `translateX(-50%) rotate(${rotation}deg)`;
    } else if (position === "bottom-center") {
      styleObj.bottom = pad;
      styleObj.left = "50%";
      styleObj.transform = `translateX(-50%) rotate(${rotation}deg)`;
    } else if (position === "middle-left") {
      styleObj.top = "50%";
      styleObj.left = pad;
      styleObj.transform = `translateY(-50%) rotate(${rotation}deg)`;
    } else if (position === "middle-right") {
      styleObj.top = "50%";
      styleObj.right = pad;
      styleObj.transform = `translateY(-50%) rotate(${rotation}deg)`;
    } else if (position === "top-left") {
      styleObj.top = pad;
      styleObj.left = pad;
    } else if (position === "top-right") {
      styleObj.top = pad;
      styleObj.right = pad;
    } else if (position === "bottom-left") {
      styleObj.bottom = pad;
      styleObj.left = pad;
    } else if (position === "bottom-right") {
      styleObj.bottom = pad;
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
            Watermark Another File
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
            PDF Security & Branding
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

      {/* Upload State */}
      {!file && (
        <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={handleFileChange}
          />
          <span className="upload-icon-container group-hover:scale-105 transition-transform">
            <Layers className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag a PDF document here to add watermark
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Apply customizable text or logo stamp watermarks across all pages.
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
          {/* Left Column: Visual Canvas & Real-time Live Preview */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Document Card */}
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
                      Watermark Applied!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Ready
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Your document has been stamped with high-precision vector watermarks.
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
            <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[420px] flex items-center justify-center relative overflow-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Generating document canvas...
                  </p>
                </div>
              ) : previewUrl ? (
                <div
                  className="relative rounded-lg shadow-xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden select-none transition-all"
                  style={{
                    width: `${320 * zoom}px`,
                    height: `${440 * zoom}px`,
                  }}
                >
                  {/* PDF Page Background */}
                  <img
                    src={previewUrl}
                    alt="PDF Page Preview"
                    className="w-full h-full object-contain pointer-events-none absolute inset-0 z-0"
                    draggable={false}
                  />

                  {/* Layer Mockup effect if 'under' layer is selected */}
                  {layer === "under" && (
                    <div className="absolute inset-0 bg-transparent pointer-events-none select-none z-5 mix-blend-multiply opacity-80">
                      <div className="absolute inset-0 p-6 space-y-3 opacity-10 pointer-events-none">
                        <div className="h-2 w-full bg-zinc-800 rounded" />
                        <div className="h-2 w-5/6 bg-zinc-800 rounded" />
                        <div className="h-2 w-11/12 bg-zinc-800 rounded" />
                        <div className="h-2 w-3/4 bg-zinc-800 rounded" />
                      </div>
                    </div>
                  )}

                  {/* Watermark Overlay Element */}
                  {watermarkType === "image" && watermarkImgUrl ? (
                    <img
                      src={watermarkImgUrl}
                      alt="Watermark Overlay"
                      style={getMockupPositionStyle()}
                      className="pointer-events-none"
                    />
                  ) : watermarkType === "text" ? (
                    <div style={getMockupPositionStyle()}>
                      {text || "CONFIDENTIAL"}
                    </div>
                  ) : (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-zinc-400 bg-zinc-900/80 px-2 py-1 rounded">
                      Upload Logo to Preview
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">No preview available</p>
              )}
            </div>
          </div>

          {/* Right Column: Customization Controls Sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {/* Type Selector Tabs */}
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-2">
                  <Sliders className="h-4 w-4 text-red-600 dark:text-red-400" />
                  Watermark Settings
                </h3>

                <div className="flex rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setWatermarkType("text")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                      watermarkType === "text"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    <Type className="h-3.5 w-3.5" />
                    Text Stamp
                  </button>
                  <button
                    type="button"
                    onClick={() => setWatermarkType("image")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                      watermarkType === "image"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Image Logo
                  </button>
                </div>
              </div>

              {/* Text Mode Controls */}
              {watermarkType === "text" && (
                <div className="space-y-4">
                  {/* Text Input */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Watermark Text:
                    </label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {TEXT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setText(preset)}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                            text === preset
                              ? "bg-red-600 text-white"
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Family & Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        Font Family:
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as FontFamilyType)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs font-medium text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="HelveticaBold">Helvetica Bold</option>
                        <option value="Helvetica">Helvetica Normal</option>
                        <option value="TimesRomanBold">Times Roman Bold</option>
                        <option value="TimesRoman">Times Roman</option>
                        <option value="CourierBold">Courier Bold</option>
                        <option value="Courier">Courier</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Font Size:
                        </label>
                        <span className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                          {fontSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="100"
                        step="2"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-red-600"
                      />
                    </div>
                  </div>

                  {/* Color Swatches */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Watermark Color:
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
                </div>
              )}

              {/* Image Mode Controls */}
              {watermarkType === "image" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Upload Watermark Image / Logo:
                    </label>
                    <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-4 text-center cursor-pointer hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/40">
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={handleWatermarkImageChange}
                      />
                      {imageFile ? (
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                            {imageFile.name}
                          </span>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6 text-zinc-400 mb-1" />
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            Click to select PNG or JPG logo
                          </span>
                          <span className="text-[10px] text-zinc-400 mt-0.5">
                            Transparent PNG recommended
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Image Scale:
                      </label>
                      <span className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                        {imageScale}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="5"
                      value={imageScale}
                      onChange={(e) => setImageScale(Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>
                </div>
              )}

              {/* Universal: 3x3 Position Grid */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Stamp Position:
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

              {/* Sliders: Opacity & Rotation */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Opacity:
                    </label>
                    <span className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                      {Math.round(opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Rotation:
                    </label>
                    <span className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                      {rotation}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
              </div>

              {/* Layer Position (Over / Under Content) */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Layer Placement:
                </label>
                <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                  <button
                    type="button"
                    onClick={() => setLayer("over")}
                    className={cn(
                      "flex-1 rounded py-1.5 font-semibold transition",
                      layer === "over"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Above Content (Overlay)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayer("under")}
                    className={cn(
                      "flex-1 rounded py-1.5 font-semibold transition",
                      layer === "under"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Below Content (Background)
                  </button>
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

              {/* Watermark Features Checklist Card */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Vector PDF Watermark Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Permanent vector watermark embedding</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Exact rotation & alpha opacity transparency</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>100% Client-side privacy & encryption</span>
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
                    <span>Applying Watermark...</span>
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4" />
                    <span>Apply Watermark to PDF</span>
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
