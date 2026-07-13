"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import { Rnd } from "react-rnd";
import {
  Upload,
  X,
  Settings,
  Crop,
  Info,
  Loader2,
  FileText,
  Sliders,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  RefreshCw,
  Layers,
  FileCheck,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface CropPdfWorkspaceProps {
  tool: ToolDefinition;
}

export function CropPdfWorkspace({ tool }: CropPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF Page states
  const [totalPages, setTotalPages] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);
  const [pageImages, setPageImages] = useState<Record<string, string>>({}); // cache key: "page-rotation"
  const [pageSizes, setPageSizes] = useState<Record<string, { width: number; height: number }>>({});

  // Rotations map: page index (0-based) -> rotation angle (0, 90, 180, 270)
  const [rotations, setRotations] = useState<Record<number, number>>({});

  // Crop coordinates (percentages 0-100)
  const [cropBox, setCropBox] = useState({ x: 15, y: 15, w: 70, h: 70 });

  // Zoom factor (default 1.0, ranges from 0.5 to 2.0)
  const [zoom, setZoom] = useState(1.0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setZoom(0.75);
    }
  }, []);

  // Aspect ratio state
  const [aspectRatioMode, setAspectRatioMode] = useState<"free" | "1:1" | "4:3" | "16:9">("free");

  // Apply range states
  const [applyMode, setApplyMode] = useState<"current" | "all" | "odd" | "even" | "custom">("all");
  const [customRange, setCustomRange] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Dynamic PDFJS injection
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

  // Initialize PDF file
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;
    const currentFile = file;
    let active = true;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages;
        setTotalPages(total);

        // Pre-render first page with rotation 0
        const page = await pdfDoc.getPage(1);
        const userRotation = rotations[0] || 0;
        const viewport = page.getViewport({ scale: 1.5, rotation: userRotation });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        await page.render({ canvasContext: context, viewport }).promise;

        if (active) {
          const cacheKey = `1-${userRotation}`;
          setPageImages({ [cacheKey]: canvas.toDataURL() });
          setPageSizes({ [cacheKey]: { width: viewport.width, height: viewport.height } });
          setPreviewPage(1);
          setCropBox({ x: 15, y: 15, w: 70, h: 70 });
        }
      } catch (err) {
        console.error(err);
        if (active) setError("Could not load PDF document. Verify it is not encrypted.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPdf();
    return () => {
      active = false;
    };
  }, [file, pdfjsLoaded]);

  // Load target page dynamically when active page or its rotation changes
  const loadPageImage = async (pageNumber: number, userRotation: number) => {
    const cacheKey = `${pageNumber}-${userRotation}`;
    if (pageImages[cacheKey] || !file) return;

    const currentFile = file;
    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5, rotation: userRotation });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport }).promise;

      setPageImages((prev) => ({ ...prev, [cacheKey]: canvas.toDataURL() }));
      setPageSizes((prev) => ({ ...prev, [cacheKey]: { width: viewport.width, height: viewport.height } }));
    } catch (err) {
      console.error("Error rendering page:", err);
    }
  };

  const currentRotation = rotations[previewPage - 1] || 0;
  const currentCacheKey = `${previewPage}-${currentRotation}`;

  useEffect(() => {
    if (file && previewPage > 0) {
      loadPageImage(previewPage, currentRotation);
    }
  }, [previewPage, currentRotation, file]);

  // Trigger thumbnail loads for left sidebar
  useEffect(() => {
    if (file && totalPages > 0) {
      // Fetch thumbnails sequentially in background
      for (let i = 1; i <= Math.min(totalPages, 50); i++) {
        const pageRot = rotations[i - 1] || 0;
        loadPageImage(i, pageRot);
      }
    }
  }, [file, totalPages, rotations]);

  // Update rendered image size for react-rnd mappings
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    handleImageLoad();
  }, [pageImages[currentCacheKey], zoom]);

  // Helper to convert crop percentages to pixels
  const getPixelBox = () => {
    return {
      x: (cropBox.x / 100) * imageSize.width,
      y: (cropBox.y / 100) * imageSize.height,
      width: (cropBox.w / 100) * imageSize.width,
      height: (cropBox.h / 100) * imageSize.height,
    };
  };

  // Convert pixels back to percentages
  const handleRndDragStop = (d: { x: number; y: number }) => {
    if (imageSize.width === 0 || imageSize.height === 0) return;
    const newX = Math.round((d.x / imageSize.width) * 100);
    const newY = Math.round((d.y / imageSize.height) * 100);
    setCropBox((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(100 - prev.w, newX)),
      y: Math.max(0, Math.min(100 - prev.h, newY)),
    }));
  };

  const handleRndResizeStop = (
    ref: HTMLElement,
    position: { x: number; y: number }
  ) => {
    if (imageSize.width === 0 || imageSize.height === 0) return;
    const newW = Math.round((ref.offsetWidth / imageSize.width) * 100);
    const newH = Math.round((ref.offsetHeight / imageSize.height) * 100);
    const newX = Math.round((position.x / imageSize.width) * 100);
    const newY = Math.round((position.y / imageSize.height) * 100);

    setCropBox({
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
      w: Math.max(5, Math.min(100 - newX, newW)),
      h: Math.max(5, Math.min(100 - newY, newH)),
    });
  };

  // Lock Ratio Resolver
  const getAspectRatioValue = () => {
    if (aspectRatioMode === "1:1") return 1;
    if (aspectRatioMode === "4:3") return 4 / 3;
    if (aspectRatioMode === "16:9") return 16 / 9;
    return undefined;
  };

  // Apply Ratio presets
  useEffect(() => {
    const ratio = getAspectRatioValue();
    if (ratio) {
      setCropBox((prev) => {
        let targetW = prev.w;
        let targetH = Math.round(prev.w / ratio);
        if (prev.y + targetH > 100) {
          targetH = 100 - prev.y;
          targetW = Math.round(targetH * ratio);
        }
        return { ...prev, w: targetW, h: targetH };
      });
    }
  }, [aspectRatioMode]);

  // Rotates current preview page
  const rotateCurrentPage = () => {
    const currentIdx = previewPage - 1;
    setRotations((prev) => ({
      ...prev,
      [currentIdx]: ((prev[currentIdx] || 0) + 90) % 360,
    }));
  };

  // Parser for range input box
  const parseCustomRange = (rangeStr: string, total: number): Set<number> => {
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
          for (let i = s; i <= e; i++) {
            pages.add(i - 1);
          }
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

  const processCrop = async () => {
    if (!file) return;

    // Resolve which pages will be cropped
    const targetPages = new Set<number>();
    if (applyMode === "current") {
      targetPages.add(previewPage - 1);
    } else if (applyMode === "all") {
      for (let i = 0; i < totalPages; i++) targetPages.add(i);
    } else if (applyMode === "odd") {
      for (let i = 0; i < totalPages; i++) {
        if (i % 2 === 0) targetPages.add(i); // 0-indexed is page 1 (odd)
      }
    } else if (applyMode === "even") {
      for (let i = 0; i < totalPages; i++) {
        if (i % 2 !== 0) targetPages.add(i); // 1-indexed is page 2 (even)
      }
    } else if (applyMode === "custom") {
      const parsed = parseCustomRange(customRange, totalPages);
      parsed.forEach((p) => targetPages.add(p));
      if (targetPages.size === 0) {
        toast.error("Invalid custom range. E.g. '1, 3, 5-8'.");
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

      const croppedBlob = await pdf.cropPdf(file, options);
      pdf.downloadBlob(croppedBlob, `${file.name.replace(/\.[^/.]+$/, "")}_cropped.pdf`);
      toast.success("Successfully cropped and formatted PDF!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to process crop operation");
    } finally {
      setProcessing(false);
    }
  };

  const pixelBox = getPixelBox();
  const currentSize = pageSizes[currentCacheKey];

  const Icon = theme.icon;

  return (
    <div className={cn(!file ? "mx-auto max-w-6xl px-4 py-10" : "w-full h-full p-0")}>
      <Toaster position="top-center" richColors />
      {!file && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            PDF Tools
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

      {/* Back Navigation Bar */}
      <div className={cn("flex items-center justify-between mb-4", file ? "px-4 pt-4 lg:px-6" : "")}>
        <Link
          href="/#pdf"
          className="flex items-center gap-1.5 rounded-lg border border-workspace-border bg-workspace-card px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-workspace-muted text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to PDF Tools
        </Link>
      </div>

      <div className={cn(
        "pdf-workspace-theme-wrapper flex flex-col overflow-hidden bg-workspace-bg text-foreground lg:flex-row border border-workspace-border",
        !file
          ? "lg:h-[450px] min-h-[450px] rounded-3xl shadow-2xl justify-center items-center"
          : "lg:h-[calc(100vh-80px)] min-h-[550px] w-full"
      )}>
        {!file ? (
          <div className="flex w-full max-w-xl flex-col items-center justify-center p-6 mx-auto my-auto">
            <label className="upload-dropzone upload-dropzone-pdf w-full">
              <span className="upload-icon-container">
                <Upload />
              </span>
              <span className="text-center">
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Upload PDF file to crop
                </p>
                <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  Max size {tool.maxMb} MB · Local document processing
                </p>
              </span>
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files[0]) setFile(files[0]);
                }}
              />
            </label>
          </div>
        ) : (
          <>
            {/* LEFT SIDEBAR: Page Thumbnails */}
            {totalPages > 0 && (
              <div className="w-full bg-workspace-sidebar border-b border-workspace-border lg:w-48 lg:border-b-0 lg:border-r flex flex-col shrink-0 lg:h-full">
                <div className="p-4 border-b border-workspace-border flex items-center gap-2">
                  <Layers className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Pages ({totalPages})
                  </span>
                </div>
                
                <div className="flex flex-row lg:flex-col flex-1 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-4 gap-3 max-h-36 lg:max-h-none scrollbar-thin">
                  {Array.from({ length: totalPages }, (_, i) => {
                    const pageRot = rotations[i] || 0;
                    const thumbKey = `${i + 1}-${pageRot}`;
                    const thumbUrl = pageImages[thumbKey];
                    const isSelected = previewPage === i + 1;
 
                    return (
                  <button
                     key={i}
                     onClick={() => setPreviewPage(i + 1)}
                     className={cn(
                       "flex flex-col items-center gap-1.5 p-2 rounded-xl border shrink-0 transition-all duration-200",
                       isSelected
                         ? "bg-red-500/5 border-red-500/50 shadow-md shadow-red-500/5"
                         : "bg-workspace-card border-workspace-border hover:border-zinc-300 dark:hover:border-zinc-800 hover:bg-workspace-muted"
                     )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold tracking-wider transition-colors",
                      isSelected ? "text-red-400" : "text-zinc-500"
                    )}>
                      PAGE {i + 1}
                    </span>
                    
                    <div className="w-20 h-28 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-center overflow-hidden relative">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`Thumb ${i + 1}`}
                          className="max-w-full max-h-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <FileCheck className="h-5 w-5 text-zinc-800 animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CENTER PANEL: LIVE PREVIEW & CROP VIEWPORT */}
        <div className="flex flex-1 flex-col items-center bg-workspace-sidebar relative lg:h-full overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              {/* Top status bar: File detail, Clear, reset options */}
              <div className="w-full p-4 border-b border-workspace-border flex items-center justify-between z-10 bg-workspace-sidebar/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-workspace-muted border border-workspace-border">
                    <FileText className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <span className="max-w-[180px] block truncate text-xs font-bold text-foreground">
                      {file.name}
                    </span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono block">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Page {previewPage} of {totalPages}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFile(null);
                    setRotations({});
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-workspace-card border border-workspace-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 transition-all duration-200 shadow-md cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> Clear File
                </button>
              </div>

              {/* Viewport Frame (Scrollable Body) */}
              <div className="flex-1 w-full flex items-center justify-center relative z-10 overflow-auto scrollbar-thin p-2 sm:p-4 lg:p-8">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                    <p className="text-xs text-zinc-400">Rendering preview canvas...</p>
                  </div>
                ) : error ? (
                  <div className="text-center">
                    <p className="text-sm text-red-500 font-semibold">{error}</p>
                    <button
                      onClick={() => setFile(null)}
                      className="mt-3 text-xs text-zinc-400 hover:text-white underline"
                    >
                      Choose another file
                    </button>
                  </div>
                ) : (
                  pageImages[currentCacheKey] && (
                    <div
                      ref={containerRef}
                      className="relative select-none shadow-2xl rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-900"
                      style={{
                        width: imageSize.width || "auto",
                        height: imageSize.height || "auto",
                        transform: `scale(${zoom})`,
                        transition: "transform 0.2s ease-out",
                      }}
                    >
                      {/* Base Image */}
                      <img
                        ref={imageRef}
                        src={pageImages[currentCacheKey]}
                        alt={`Preview Page ${previewPage}`}
                        onLoad={handleImageLoad}
                        className="max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-280px)] min-h-[300px] w-auto object-contain"
                        draggable={false}
                      />

                      {/* Dark Overlay Mask */}
                      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

                      {/* Rnd Crop Selector */}
                      {imageSize.width > 0 && (
                        <Rnd
                          bounds="parent"
                          lockAspectRatio={getAspectRatioValue()}
                          size={{ width: pixelBox.width, height: pixelBox.height }}
                          position={{ x: pixelBox.x, y: pixelBox.y }}
                          onDragStop={(_, d) => handleRndDragStop(d)}
                          onResizeStop={(_, __, ref, ___, pos) => handleRndResizeStop(ref, pos)}
                          className="border-2 border-red-500 bg-red-500/5 shadow-[0_0_0_9999px_rgba(9,9,11,0.6)] rounded"
                          style={{
                            boxShadow: "0 0 20px rgba(239, 68, 68, 0.25), 0 0 0 9999px rgba(9,9,11,0.65)",
                            touchAction: "none",
                          }}
                        >
                          {/* Inner dashed grid lines */}
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-b border-white" />
                            <div className="border-r border-white" />
                            <div className="border-r border-white" />
                            <div />
                          </div>

                          {/* Interactive corner indicator dots */}
                          {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => {
                            const cornerClass = {
                              "top-left": "-left-1.5 -top-1.5",
                              "top-right": "-right-1.5 -top-1.5",
                              "bottom-left": "-left-1.5 -bottom-1.5",
                              "bottom-right": "-right-1.5 -bottom-1.5",
                            }[corner];
                            return (
                              <div
                                key={corner}
                                className={cn(
                                  "absolute h-3 w-3 rounded-full border border-white bg-red-500 shadow-md ring-2 ring-red-500/20",
                                  cornerClass
                                )}
                              />
                            );
                          })}

                          {/* Dimension tool-tip */}
                          <div className="absolute bottom-2.5 right-2.5 bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-red-400 border border-zinc-800 pointer-events-none">
                            {cropBox.w}% × {cropBox.h}%
                          </div>
                        </Rnd>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Zoom controls */}
              <div className="w-full p-4 border-t border-workspace-border flex items-center justify-center bg-workspace-sidebar/50 backdrop-blur-sm shrink-0 z-10">
                <div className="flex items-center gap-4 bg-workspace-card/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-workspace-border shadow-lg">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    className="p-1.5 rounded-lg hover:bg-workspace-muted text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4.5 w-4.5" />
                  </button>
                  <span className="text-[10px] font-bold font-mono text-zinc-650 dark:text-zinc-400 w-10 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.0, z + 0.25))}
                    className="p-1.5 rounded-lg hover:bg-workspace-muted text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4.5 w-4.5" />
                  </button>
              </div>
            </div>
        </div>

        {/* RIGHT PANEL: SETTINGS & ACTIONS */}
        <div className="w-full bg-workspace-sidebar border-t border-workspace-border lg:w-72 lg:border-t-0 lg:border-l flex flex-col z-20 lg:h-full overflow-hidden shrink-0">
          

              {/* Sidebar Header */}
              <div className="p-4 border-b border-workspace-border space-y-1.5 shrink-0 bg-workspace-sidebar">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-555" />
                  <span>Crop settings</span>
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                
                {/* Ratio presets */}
                <div className="rounded-2xl border border-workspace-border bg-workspace-muted p-4 space-y-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-555" />
                    <span>Aspect Ratio</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {(["free", "1:1", "4:3", "16:9"] as const).map((mode) => {
                      const isSelected = aspectRatioMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => setAspectRatioMode(mode)}
                          className={cn(
                            "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            isSelected
                              ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-955 shadow-md"
                              : "bg-workspace-card border-workspace-border text-zinc-555 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-350"
                          )}
                        >
                          {mode === "free" ? "Free Crop" : mode}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Pages */}
                <div className="rounded-2xl border border-workspace-border bg-workspace-muted p-4 space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-zinc-450 dark:text-zinc-555" />
                    <span>Target pages</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "all" as const, label: "All Pages" },
                      { key: "current" as const, label: "Current Page" },
                      { key: "odd" as const, label: "Odd Pages" },
                      { key: "even" as const, label: "Even Pages" },
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        onClick={() => setApplyMode(btn.key)}
                        className={cn(
                          "py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          applyMode === btn.key
                            ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-950 shadow-md"
                            : "bg-workspace-card border-workspace-border text-zinc-555 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-350"
                        )}
                      >
                        {btn.label}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setApplyMode("custom")}
                      className={cn(
                        "col-span-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        applyMode === "custom"
                          ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-955 shadow-md"
                          : "bg-workspace-card border-workspace-border text-zinc-555 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-350"
                      )}
                    >
                      Custom page range
                    </button>
                  </div>

                  {applyMode === "custom" && (
                    <div className="space-y-1.5 pt-2 border-t border-workspace-border animate-fadeIn">
                      <label className="text-[9px] text-zinc-555 dark:text-zinc-450 font-bold uppercase block">Pages range string</label>
                      <input
                        type="text"
                        placeholder="e.g. 1-3, 5, 7-10"
                        value={customRange}
                        onChange={(e) => setCustomRange(e.target.value)}
                        className="w-full bg-workspace-card border border-workspace-border rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                      />
                    </div>
                  )}
                </div>

                {/* Box values (Manual inputs) */}
                <div className="rounded-2xl border border-workspace-border bg-workspace-muted p-4 space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-zinc-450 dark:text-zinc-555" />
                    <span>Coordinates (%)</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-bold uppercase block">X-Offset</label>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={cropBox.x}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCropBox((prev) => ({ ...prev, x: val }));
                        }}
                        className="w-full bg-workspace-card border border-workspace-border rounded-xl py-1.5 text-center text-xs font-bold font-mono text-foreground focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-bold uppercase block">Y-Offset</label>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={cropBox.y}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCropBox((prev) => ({ ...prev, y: val }));
                        }}
                        className="w-full bg-workspace-card border border-workspace-border rounded-xl py-1.5 text-center text-xs font-bold font-mono text-foreground focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-bold uppercase block">Width</label>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={cropBox.w}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCropBox((prev) => ({ ...prev, w: val }));
                        }}
                        className="w-full bg-workspace-card border border-workspace-border rounded-xl py-1.5 text-center text-xs font-bold font-mono text-foreground focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-bold uppercase block">Height</label>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={cropBox.h}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCropBox((prev) => ({ ...prev, h: val }));
                        }}
                        className="w-full bg-workspace-card border border-workspace-border rounded-xl py-1.5 text-center text-xs font-bold font-mono text-foreground focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action trigger panel */}
              <div className="p-5 border-t border-workspace-border bg-workspace-sidebar space-y-3 shrink-0">
                
                {aspectRatioMode !== "free" && (
                  <button
                    onClick={() => {
                      setAspectRatioMode("free");
                      setCropBox({ x: 15, y: 15, w: 70, h: 70 });
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-workspace-border py-3 text-xs font-bold text-zinc-650 dark:text-zinc-300 hover:bg-workspace-muted hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    Reset Crop Area
                  </button>
                )}

                <button
                  onClick={processCrop}
                  disabled={!file || processing}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 cursor-pointer",
                    theme.button
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Crop...
                    </>
                  ) : (
                    <>
                      <Crop className="h-4 w-4" />
                      Crop PDF File
                    </>
                  )}
                </button>
              </div>
        </div>
      </>
    )}
      </div>
    </div>
  );
}
