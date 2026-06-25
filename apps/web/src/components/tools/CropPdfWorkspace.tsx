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
} from "lucide-react";
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

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="flex h-full min-h-[680px] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl lg:flex-row">
        
        {/* LEFT SIDEBAR: Page Thumbnails */}
        {file && totalPages > 0 && (
          <div className="w-full bg-zinc-950/80 border-b border-zinc-900 lg:w-48 lg:border-b-0 lg:border-r lg:border-zinc-900 flex flex-col shrink-0">
            <div className="p-4 border-b border-zinc-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-red-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
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
                        : "bg-zinc-900/10 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20"
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
                        // eslint-disable-next-line @next/next/no-img-element
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

        {/* CENTER VIEWPORT: Large Preview & Rnd Crop Selector */}
        <div className="flex flex-1 flex-col items-center justify-between bg-[radial-gradient(ellipse_at_top,rgba(20,20,25,0.7),rgba(9,9,11,1))] p-6 relative">
          {/* Grid Backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {!file ? (
            <div className="flex w-full max-w-xl flex-col items-center justify-center p-12 my-auto z-10">
              <label className="group flex w-full cursor-pointer flex-col items-center gap-6 rounded-3xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md px-6 py-20 transition-all duration-300 hover:border-red-500/30 hover:bg-zinc-900/30">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:border-red-500/20">
                  <Upload className="h-7 w-7 text-zinc-400 group-hover:text-red-500 transition-colors" />
                </span>
                <span className="text-center">
                  <p className="text-sm font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    Upload a PDF document to begin cropping
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Max size {tool.maxMb} MB · Pure client-side canvas rendering
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
              {/* Header */}
              <div className="mb-4 flex w-full items-center justify-between border-b border-zinc-900 pb-3 z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                    <FileText className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="max-w-[200px] truncate text-sm font-bold text-zinc-200">
                    {file.name}
                  </span>
                </div>
                
                <button
                  onClick={() => {
                    setFile(null);
                    setRotations({});
                  }}
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-850 px-3.5 py-1.5 text-xs font-bold text-zinc-200 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 transition-all duration-200 shadow-md cursor-pointer"
                >
                  <X className="h-4 w-4" /> Clear File
                </button>
              </div>

              {/* Viewport Frame */}
              <div className="flex flex-1 items-center justify-center w-full min-h-[350px] relative z-10">
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
                      className="relative select-none shadow-2xl rounded-lg overflow-hidden border border-zinc-900"
                      style={{
                        width: imageSize.width || "auto",
                        height: imageSize.height || "auto",
                        transform: `scale(${zoom})`,
                        transition: "transform 0.2s ease-out",
                      }}
                    >
                      {/* Base Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={imageRef}
                        src={pageImages[currentCacheKey]}
                        alt={`Preview Page ${previewPage}`}
                        onLoad={handleImageLoad}
                        className="max-h-[440px] w-auto object-contain"
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

              {/* Toolbar Zoom & Rotate Controls */}
              {file && (
                <div className="mt-4 flex items-center gap-4 bg-zinc-950/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-zinc-800 shadow-lg z-10">
                  <div className="flex items-center gap-2 border-r border-zinc-900 pr-4">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4.5 w-4.5" />
                    </button>
                    <span className="text-[10px] font-bold font-mono text-zinc-400 w-10 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((z) => Math.min(2.0, z + 0.25))}
                      className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  <button
                    onClick={rotateCurrentPage}
                    className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                    title="Rotate Current Page 90°"
                  >
                    <RotateCw className="h-4 w-4 text-red-500" />
                    <span>Rotate Page</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT SIDEBAR: Settings & Operations Panel */}
        <div className="w-full bg-zinc-950 p-6 border-t border-zinc-900 lg:w-80 lg:border-t-0 lg:border-l lg:border-zinc-900 flex flex-col justify-between z-20">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-4">
              <Settings className="h-4 w-4 text-red-500" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-200">
                Crop Settings
              </h2>
            </div>

            {/* Coordinates & Aspect Ratio Presets */}
            <div className="space-y-4 rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4">
              
              {/* Aspect Ratio Lock Presets */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  {aspectRatioMode === "free" ? (
                    <Unlock className="h-3.5 w-3.5 text-zinc-500" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span>Aspect Ratio</span>
                </span>
                
                <div className="grid grid-cols-2 gap-1.5">
                  {(["free", "1:1", "4:3", "16:9"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAspectRatioMode(mode)}
                      className={cn(
                        "py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-200 cursor-pointer",
                        aspectRatioMode === mode
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300"
                      )}
                    >
                      {mode === "free" ? "Free" : mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual fine-tuning coordinates */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                {[
                  { label: "Left (X)", key: "x" as const },
                  { label: "Top (Y)", key: "y" as const },
                  { label: "Width", key: "w" as const },
                  { label: "Height", key: "h" as const },
                ].map((coord) => (
                  <div key={coord.key} className="space-y-1">
                    <label className="text-[9px] text-zinc-500 font-semibold block">{coord.label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={!file}
                        value={cropBox[coord.key]}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                          setCropBox((prev) => {
                            const next = { ...prev, [coord.key]: val };
                            if (coord.key === "x" && next.x + next.w > 100) next.w = 100 - next.x;
                            if (coord.key === "y" && next.y + next.h > 100) next.h = 100 - next.y;
                            if (coord.key === "w" && next.x + next.w > 100) next.x = 100 - next.w;
                            if (coord.key === "h" && next.y + next.h > 100) next.y = 100 - next.h;
                            return next;
                          });
                        }}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-2 pr-6 py-2 text-xs text-zinc-300 font-bold font-mono focus:border-red-500/80 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-all disabled:opacity-40"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-600">%</span>
                    </div>
                  </div>
                ))}
              </div>

              {file && currentSize && (
                <div className="rounded-xl bg-zinc-950/60 p-2.5 border border-zinc-900 flex items-start gap-2 text-[10px] text-zinc-400">
                  <Info className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    Dimensions: <span className="font-mono text-zinc-500">{Math.round(currentSize.width)}×{Math.round(currentSize.height)} pt</span>
                    <br />
                    Cropped: <span className="font-mono text-red-400 font-bold">{Math.round((cropBox.w / 100) * currentSize.width)}×{Math.round((cropBox.h / 100) * currentSize.height)} pt</span>
                  </div>
                </div>
              )}
            </div>

            {/* Target Pages Apply Selection */}
            {file && (
              <div className="space-y-4 rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Apply Crop Range</span>
                </span>
                
                <select
                  value={applyMode}
                  onChange={(e) => setApplyMode(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-300 font-bold focus:border-red-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="all">All Pages</option>
                  <option value="current">Current Page Only</option>
                  <option value="odd">Odd Pages Only</option>
                  <option value="even">Even Pages Only</option>
                  <option value="custom">Custom Page Range</option>
                </select>

                {applyMode === "custom" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[9px] text-zinc-500 font-semibold block">Range String</label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 3, 5-8"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-300 font-bold focus:border-red-500 focus:outline-none transition"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Area */}
          <div className="mt-6 border-t border-zinc-900 pt-6 space-y-3">
            {file && (
              <button
                onClick={() => {
                  setCropBox({ x: 15, y: 15, w: 70, h: 70 });
                  setAspectRatioMode("free");
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
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
      </div>
    </>
  );
}
