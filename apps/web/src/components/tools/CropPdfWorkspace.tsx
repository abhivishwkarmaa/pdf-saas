"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  Crop,
  FileText,
  Sliders,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Layers,
  ArrowLeft,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Maximize,
  Move,
  Lock,
  Unlock,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface CropPdfWorkspaceProps {
  tool: ToolDefinition;
}

type AspectRatioMode = "free" | "1:1" | "4:3" | "16:9";
type ApplyMode = "all" | "current" | "odd" | "even" | "custom";

interface CropBox {
  x: number; // 0 to 100 percentage from left
  y: number; // 0 to 100 percentage from top
  w: number; // 0 to 100 percentage width
  h: number; // 0 to 100 percentage height
}

type HandleType =
  | "tl" // top-left
  | "tr" // top-right
  | "bl" // bottom-left
  | "br" // bottom-right
  | "t"  // top
  | "b"  // bottom
  | "l"  // left
  | "r"  // right
  | "move";

export function CropPdfWorkspace({ tool }: CropPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Crop,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // PDF Page states
  const [totalPages, setTotalPages] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);
  const [pageImages, setPageImages] = useState<Record<string, string>>({});
  const [rotations, setRotations] = useState<Record<number, number>>({});

  // Crop box in percentages (0-100)
  const [cropBox, setCropBox] = useState<CropBox>({ x: 10, y: 10, w: 80, h: 80 });

  // Ratio and apply options
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>("free");
  const [applyMode, setApplyMode] = useState<ApplyMode>("all");
  const [customRange, setCustomRange] = useState("");
  const [zoom, setZoom] = useState(1.0);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // Refs for custom touch/mouse drag & resize engine
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const activeHandleRef = useRef<HandleType | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; box: CropBox }>({
    clientX: 0,
    clientY: 0,
    box: { x: 10, y: 10, w: 80, h: 80 },
  });

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

  // Initialize PDF & render first page
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;
    const currentFile = file;
    let active = true;

    async function loadPdf() {
      setLoading(true);
      setResultBlob(null);

      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages;

        if (active) {
          setTotalPages(total);
          setPreviewPage(1);
          setCropBox({ x: 10, y: 10, w: 80, h: 80 });

          // Render Page 1
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (active) {
              setPageImages({ "1-0": canvas.toDataURL() });
            }
          }
        }
      } catch (err) {
        console.error("PDF load error:", err);
        if (active) toast.error("Could not load PDF. Verify it is not password protected.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPdf();
    return () => {
      active = false;
    };
  }, [file, pdfjsLoaded]);

  // Render specific page on demand
  const loadPage = useCallback(
    async (pageNum: number, rotationAngle: number) => {
      const key = `${pageNum}-${rotationAngle}`;
      if (pageImages[key] || !file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5, rotation: rotationAngle });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          setPageImages((prev) => ({ ...prev, [key]: canvas.toDataURL() }));
        }
      } catch (err) {
        console.error("Error loading page:", err);
      }
    },
    [file, pageImages]
  );

  const currentRotation = rotations[previewPage - 1] || 0;
  const currentKey = `${previewPage}-${currentRotation}`;

  useEffect(() => {
    if (file && previewPage > 0) {
      void loadPage(previewPage, currentRotation);
    }
  }, [file, previewPage, currentRotation, loadPage]);

  // Rotate preview page
  const rotateCurrentPage = () => {
    const idx = previewPage - 1;
    const nextRot = ((rotations[idx] || 0) + 90) % 360;
    setRotations((prev) => ({ ...prev, [idx]: nextRot }));
  };

  // ----------------------------------------------------
  // NATIVE TOUCH & POINTER CROP DRAG / RESIZE CONTROLLER
  // ----------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    activeHandleRef.current = handle;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      box: { ...cropBox },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !imageContainerRef.current) return;
    e.preventDefault();

    const rect = imageContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPercent = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100;
    const init = dragStartRef.current.box;
    const handle = activeHandleRef.current;

    let newX = init.x;
    let newY = init.y;
    let newW = init.w;
    let newH = init.h;

    const minSize = 5; // minimum 5%

    if (handle === "move") {
      newX = Math.max(0, Math.min(100 - init.w, init.x + deltaXPercent));
      newY = Math.max(0, Math.min(100 - init.h, init.y + deltaYPercent));
    } else {
      // Top handle / edges
      if (handle === "tl" || handle === "t" || handle === "tr") {
        const proposedY = Math.max(0, Math.min(init.y + init.h - minSize, init.y + deltaYPercent));
        newH = init.y + init.h - proposedY;
        newY = proposedY;
      }
      // Bottom handle / edges
      if (handle === "bl" || handle === "b" || handle === "br") {
        newH = Math.max(minSize, Math.min(100 - init.y, init.h + deltaYPercent));
      }
      // Left handle / edges
      if (handle === "tl" || handle === "l" || handle === "bl") {
        const proposedX = Math.max(0, Math.min(init.x + init.w - minSize, init.x + deltaXPercent));
        newW = init.x + init.w - proposedX;
        newX = proposedX;
      }
      // Right handle / edges
      if (handle === "tr" || handle === "r" || handle === "br") {
        newW = Math.max(minSize, Math.min(100 - init.x, init.w + deltaXPercent));
      }

      // Maintain aspect ratio if selected
      if (aspectRatio !== "free") {
        const ratioVal = aspectRatio === "1:1" ? 1 : aspectRatio === "4:3" ? 4 / 3 : 16 / 9;
        if (handle === "r" || handle === "l" || handle === "tr" || handle === "br") {
          newH = Math.min(100 - newY, newW / ratioVal);
        } else {
          newW = Math.min(100 - newX, newH * ratioVal);
        }
      }
    }

    setCropBox({
      x: Math.round(newX * 10) / 10,
      y: Math.round(newY * 10) / 10,
      w: Math.round(newW * 10) / 10,
      h: Math.round(newH * 10) / 10,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isDraggingRef.current = false;
      activeHandleRef.current = null;
    }
  };

  // ----------------------------------------------------
  // MARGIN SLIDERS & PRESETS CONTROLLERS
  // ----------------------------------------------------
  const updateMargin = (side: "top" | "bottom" | "left" | "right", val: number) => {
    setCropBox((prev) => {
      const topMargin = side === "top" ? val : prev.y;
      const leftMargin = side === "left" ? val : prev.x;
      const bottomMargin = side === "bottom" ? val : 100 - (prev.y + prev.h);
      const rightMargin = side === "right" ? val : 100 - (prev.x + prev.w);

      const newW = Math.max(5, 100 - leftMargin - rightMargin);
      const newH = Math.max(5, 100 - topMargin - bottomMargin);

      return {
        x: Math.min(100 - newW, Math.max(0, leftMargin)),
        y: Math.min(100 - newH, Math.max(0, topMargin)),
        w: newW,
        h: newH,
      };
    });
  };

  const applyCropPreset = (preset: "full" | "margins_5" | "header_footer_10" | "square" | "16_9" | "center_80") => {
    if (preset === "full") {
      setCropBox({ x: 0, y: 0, w: 100, h: 100 });
      setAspectRatio("free");
    } else if (preset === "margins_5") {
      setCropBox({ x: 5, y: 5, w: 90, h: 90 });
      setAspectRatio("free");
    } else if (preset === "header_footer_10") {
      setCropBox({ x: 5, y: 10, w: 90, h: 80 });
      setAspectRatio("free");
    } else if (preset === "center_80") {
      setCropBox({ x: 10, y: 10, w: 80, h: 80 });
      setAspectRatio("free");
    } else if (preset === "square") {
      setAspectRatio("1:1");
      setCropBox({ x: 15, y: 15, w: 70, h: 70 });
    } else if (preset === "16_9") {
      setAspectRatio("16:9");
      setCropBox({ x: 5, y: 25, w: 90, h: 50 });
    }
  };

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

  const handleReset = () => {
    setFile(null);
    setPageImages({});
    setRotations({});
    setResultBlob(null);
    setResultFileName("");
  };

  // Parse page range string
  const parseRange = (rangeStr: string, total: number): Set<number> => {
    const pages = new Set<number>();
    const parts = rangeStr.replace(/\s+/g, "").split(/[,;]+/);
    for (const part of parts) {
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, end));
          const e = Math.min(total, Math.max(start, end));
          for (let i = s; i <= e; i++) pages.add(i - 1);
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= total) {
          pages.add(p - 1);
        }
      }
    }
    return pages;
  };

  const handleProcessCrop = async () => {
    if (!file) return;

    const targetPages = new Set<number>();
    if (applyMode === "current") {
      targetPages.add(previewPage - 1);
    } else if (applyMode === "all") {
      for (let i = 0; i < totalPages; i++) targetPages.add(i);
    } else if (applyMode === "odd") {
      for (let i = 0; i < totalPages; i++) {
        if (i % 2 === 0) targetPages.add(i);
      }
    } else if (applyMode === "even") {
      for (let i = 0; i < totalPages; i++) {
        if (i % 2 !== 0) targetPages.add(i);
      }
    } else if (applyMode === "custom") {
      const parsed = parseRange(customRange, totalPages);
      parsed.forEach((p) => targetPages.add(p));
      if (targetPages.size === 0) {
        toast.error("Please enter a valid page range (e.g. 1-3, 5)");
        return;
      }
    }

    setProcessing(true);
    try {
      const options = {
        xPercent: cropBox.x,
        yPercent: cropBox.y,
        widthPercent: cropBox.w,
        heightPercent: cropBox.h,
        pages: targetPages,
        rotations: rotations,
      };

      const outBlob = await pdf.cropPdf(file, options);
      const outName = `${file.name.replace(/\.[^/.]+$/, "")}_cropped.pdf`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      // Download
      pdf.downloadBlob(outBlob, outName);
      toast.success("PDF cropped successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to crop PDF");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!resultBlob || !resultFileName) return;
    pdf.downloadBlob(resultBlob, resultFileName);
    toast.success("Downloaded cropped PDF!");
  };

  const topMarginVal = Math.round(cropBox.y);
  const leftMarginVal = Math.round(cropBox.x);
  const bottomMarginVal = Math.round(100 - (cropBox.y + cropBox.h));
  const rightMarginVal = Math.round(100 - (cropBox.x + cropBox.w));

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
            Crop Another File
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
            PDF Trimming & Geometry
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
            <Crop className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag a PDF document here to crop
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Trim margins, crop page headers/footers, and resize PDF page boundaries.
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
          {/* Left Column: Visual Canvas & Interactive Touch-Crop Box */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Document & Tool Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-xs">
                  <FileText className="h-5 w-5" />
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
                    <span>•</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold font-mono">
                      Crop: {cropBox.w}% × {cropBox.h}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Rotate & Zoom Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={rotateCurrentPage}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                  title="Rotate Current Page 90°"
                >
                  <RotateCw className="h-3.5 w-3.5 text-red-600" />
                  <span>Rotate</span>
                </button>

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
                      PDF Cropped Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Ready
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Your document pages have been cropped to the exact dimensions.
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

            {/* Live Interactive PDF Crop Stage */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[440px] flex flex-col items-center justify-center relative overflow-hidden select-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Loading PDF page for cropping...
                  </p>
                </div>
              ) : pageImages[currentKey] ? (
                <>
                  <div
                    ref={imageContainerRef}
                    className="relative rounded-lg shadow-2xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden select-none transition-transform"
                    style={{
                      width: `${320 * zoom}px`,
                      height: `${440 * zoom}px`,
                      touchAction: "none",
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    {/* PDF Page Background Canvas Image */}
                    <img
                      src={pageImages[currentKey]}
                      alt={`PDF Page ${previewPage}`}
                      className="w-full h-full object-contain pointer-events-none absolute inset-0 z-0"
                      draggable={false}
                    />

                    {/* Darkened Mask Outside Crop Zone */}
                    <div className="absolute inset-0 bg-black/55 pointer-events-none z-10" />

                    {/* Active Transparent Crop Box with Highlight Border */}
                    <div
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.w}%`,
                        height: `${cropBox.h}%`,
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 15px rgba(239, 68, 68, 0.4)",
                      }}
                      className="absolute z-20 border-2 border-red-500 rounded-sm cursor-move bg-red-500/5 transition-[border-color] touch-none"
                      onPointerDown={(e) => handlePointerDown(e, "move")}
                    >
                      {/* Rule-of-Thirds Grid */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div />
                      </div>

                      {/* Dimension Badge in Box */}
                      <div className="absolute top-2 left-2 bg-zinc-950/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white border border-zinc-700 pointer-events-none shadow-sm">
                        {Math.round(cropBox.w)}% × {Math.round(cropBox.h)}%
                      </div>

                      {/* 4 Corner Touch Handles (Large 36px touch area for effortless mobile manipulation) */}
                      <div
                        className="absolute -top-4 -left-4 w-9 h-9 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                        onPointerDown={(e) => handlePointerDown(e, "tl")}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-md group-hover:scale-125 transition-transform" />
                      </div>

                      <div
                        className="absolute -top-4 -right-4 w-9 h-9 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                        onPointerDown={(e) => handlePointerDown(e, "tr")}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-md group-hover:scale-125 transition-transform" />
                      </div>

                      <div
                        className="absolute -bottom-4 -left-4 w-9 h-9 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                        onPointerDown={(e) => handlePointerDown(e, "bl")}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-md group-hover:scale-125 transition-transform" />
                      </div>

                      <div
                        className="absolute -bottom-4 -right-4 w-9 h-9 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                        onPointerDown={(e) => handlePointerDown(e, "br")}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-md group-hover:scale-125 transition-transform" />
                      </div>

                      {/* 4 Edge Touch Bars */}
                      <div
                        className="absolute -top-3 left-6 right-6 h-6 flex items-center justify-center cursor-ns-resize touch-none z-30"
                        onPointerDown={(e) => handlePointerDown(e, "t")}
                      >
                        <div className="w-8 h-1.5 rounded-full bg-white/90 shadow-xs" />
                      </div>

                      <div
                        className="absolute -bottom-3 left-6 right-6 h-6 flex items-center justify-center cursor-ns-resize touch-none z-30"
                        onPointerDown={(e) => handlePointerDown(e, "b")}
                      >
                        <div className="w-8 h-1.5 rounded-full bg-white/90 shadow-xs" />
                      </div>

                      <div
                        className="absolute -left-3 top-6 bottom-6 w-6 flex items-center justify-center cursor-ew-resize touch-none z-30"
                        onPointerDown={(e) => handlePointerDown(e, "l")}
                      >
                        <div className="h-8 w-1.5 rounded-full bg-white/90 shadow-xs" />
                      </div>

                      <div
                        className="absolute -right-3 top-6 bottom-6 w-6 flex items-center justify-center cursor-ew-resize touch-none z-30"
                        onPointerDown={(e) => handlePointerDown(e, "r")}
                      >
                        <div className="h-8 w-1.5 rounded-full bg-white/90 shadow-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Multi-Page Navigation Bar */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-xs text-xs">
                      <button
                        type="button"
                        disabled={previewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Page {previewPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={previewPage >= totalPages}
                        onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-400">Loading page preview...</p>
              )}
            </div>
          </div>

          {/* Right Column: Precise Margin Sliders, Presets & Action Panel */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <SlidersHorizontal className="h-4 w-4 text-red-600 dark:text-red-400" />
                  Crop & Margin Settings
                </h3>
                <p className="text-xs text-zinc-500">
                  Drag the preview handles on screen or use the fine-tuning sliders below.
                </p>
              </div>

              {/* Quick Crop Presets */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Quick Presets:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyCropPreset("full")}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition text-center"
                  >
                    Full Page (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset("margins_5")}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition text-center"
                  >
                    Trim Margins (5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset("header_footer_10")}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition text-center"
                  >
                    Trim Header/Footer
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset("center_80")}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition text-center"
                  >
                    Center Box (80%)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset("square")}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition text-center",
                      aspectRatio === "1:1"
                        ? "bg-red-600 text-white border-red-600"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    Square (1:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset("16_9")}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition text-center",
                      aspectRatio === "16:9"
                        ? "bg-red-600 text-white border-red-600"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    Wide (16:9)
                  </button>
                </div>
              </div>

              {/* 4-Side Precise Margin Sliders */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                  Fine-Tune Crop Margins (%):
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Top Margin */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Top Margin:
                      </span>
                      <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
                        {topMarginVal}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      step="1"
                      value={topMarginVal}
                      onChange={(e) => updateMargin("top", Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>

                  {/* Bottom Margin */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Bottom Margin:
                      </span>
                      <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
                        {bottomMarginVal}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      step="1"
                      value={bottomMarginVal}
                      onChange={(e) => updateMargin("bottom", Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>

                  {/* Left Margin */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Left Margin:
                      </span>
                      <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
                        {leftMarginVal}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      step="1"
                      value={leftMarginVal}
                      onChange={(e) => updateMargin("left", Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>

                  {/* Right Margin */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Right Margin:
                      </span>
                      <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
                        {rightMarginVal}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      step="1"
                      value={rightMarginVal}
                      onChange={(e) => updateMargin("right", Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>
                </div>
              </div>

              {/* Target Pages Selector */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Apply Crop To:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs mb-2">
                  {[
                    { id: "all" as ApplyMode, label: "All Pages" },
                    { id: "current" as ApplyMode, label: "Current Page" },
                    { id: "odd" as ApplyMode, label: "Odd Pages" },
                    { id: "even" as ApplyMode, label: "Even Pages" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setApplyMode(m.id)}
                      className={cn(
                        "rounded py-1.5 font-semibold transition text-center",
                        applyMode === m.id
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyMode("custom")}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition shrink-0",
                      applyMode === "custom"
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    Custom Range
                  </button>

                  {applyMode === "custom" && (
                    <input
                      type="text"
                      placeholder="e.g. 1-3, 5"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                  )}
                </div>
              </div>

              {/* Crop Guarantee Checklist */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Lossless Vector Cropping Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Exact boundary crop without quality loss</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>100% Client-side local execution & privacy</span>
                  </div>
                </div>
              </div>

              {/* Process Crop Button */}
              <button
                onClick={() => void handleProcessCrop()}
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
                    <span>Cropping PDF Pages...</span>
                  </>
                ) : (
                  <>
                    <Crop className="h-4 w-4" />
                    <span>Crop PDF Now</span>
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
