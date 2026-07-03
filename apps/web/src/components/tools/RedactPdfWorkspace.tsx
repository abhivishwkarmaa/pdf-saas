"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import { Rnd } from "react-rnd";
import {
  Upload,
  X,
  Settings,
  Info,
  Loader2,
  FileText,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Layers,
  FileCheck,
  Search,
  Mail,
  Phone,
  Trash2,
  Plus,
} from "lucide-react";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface RedactPdfWorkspaceProps {
  tool: ToolDefinition;
}

interface RedactionRegion {
  id: string;
  pageIndex: number; // 0-based
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  type: "custom" | "text" | "email" | "phone";
  text?: string;
}

interface SearchResult {
  id: string;
  pageIndex: number;
  text: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  type: "text" | "email" | "phone";
}

export function RedactPdfWorkspace({ tool }: RedactPdfWorkspaceProps) {
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

  // Redaction regions
  const [regions, setRegions] = useState<RedactionRegion[]>([]);

  // Mouse drag drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

  // Zoom factor (default 1.0, ranges from 0.5 to 2.0)
  const [zoom, setZoom] = useState(1.0);

  // Search panel states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "email" | "phone">("text");
  const [searchScope, setSearchScope] = useState<"all" | "current">("all");
  const [searching, setSearching] = useState(false);

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
          setRegions([]);
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
      for (let i = 1; i <= Math.min(totalPages, 50); i++) {
        const pageRot = rotations[i - 1] || 0;
        loadPageImage(i, pageRot);
      }
    }
  }, [file, totalPages, rotations]);

  // Update rendered image size for relative coordinates mapping
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

  // Rotates current preview page
  const rotateCurrentPage = () => {
    const currentIdx = previewPage - 1;
    setRotations((prev) => ({
      ...prev,
      [currentIdx]: ((prev[currentIdx] || 0) + 90) % 360,
    }));
  };

  // Pointer event handlers for drawing custom rectangles
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !imageRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDrawCurrent({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDrawing(false);

    const rect = e.currentTarget.getBoundingClientRect();
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);

    // Filter clicks / extremely small drags
    if (w > 6 && h > 6) {
      const newRegion: RedactionRegion = {
        id: Math.random().toString(36).substring(2, 9),
        pageIndex: previewPage - 1,
        xPercent: Math.round((Math.min(drawStart.x, drawCurrent.x) / rect.width) * 1000) / 10,
        yPercent: Math.round((Math.min(drawStart.y, drawCurrent.y) / rect.height) * 1000) / 10,
        widthPercent: Math.round((w / rect.width) * 1000) / 10,
        heightPercent: Math.round((h / rect.height) * 1000) / 10,
        type: "custom",
      };
      setRegions((prev) => [...prev, newRegion]);
    }
  };

  // Perform PDF text search and automatically add word-only overlays
  const performSearch = async () => {
    if (!file || (searchMode === "text" && !searchQuery.trim())) return;
    setSearching(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const newRegions: RedactionRegion[] = [];

      const startPage = searchScope === "all" ? 1 : previewPage;
      const endPage = searchScope === "all" ? totalPages : previewPage;

      for (let i = startPage; i <= endPage; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        const width = viewport.width;
        const height = viewport.height;

        for (const item of textContent.items as any[]) {
          if (!item.str || !item.str.trim()) continue;

          const matches: { text: string; index: number; length: number }[] = [];

          if (searchMode === "email") {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            let match;
            while ((match = emailRegex.exec(item.str)) !== null) {
              matches.push({ text: match[0], index: match.index, length: match[0].length });
            }
          } else if (searchMode === "phone") {
            const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
            let match;
            while ((match = phoneRegex.exec(item.str)) !== null) {
              matches.push({ text: match[0], index: match.index, length: match[0].length });
            }
          } else if (searchMode === "text" && searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            const strLower = item.str.toLowerCase();
            let index = strLower.indexOf(queryLower);
            while (index !== -1) {
              matches.push({
                text: item.str.substring(index, index + searchQuery.length),
                index: index,
                length: searchQuery.length,
              });
              index = strLower.indexOf(queryLower, index + 1);
            }
          }

          for (const m of matches) {
            // Estimate character positions for proportional text metrics
            const charWidth = item.width / item.str.length;
            const matchXOffset = m.index * charWidth;
            const matchWidth = m.length * charWidth;

            const tx = item.transform[4] + matchXOffset;
            const ty = item.transform[5];
            const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
            const h = item.height || Math.abs(item.transform[3]) || 12;

            // vy is the baseline of the text, so the top is vy - h
            const xPercent = (vx / width) * 100;
            const yPercent = ((vy - h) / height) * 100;
            const widthPercent = (matchWidth / width) * 100;
            const heightPercent = (h / height) * 100;

            newRegions.push({
              id: Math.random().toString(36).substring(2, 9),
              pageIndex: i - 1,
              xPercent: Math.max(0, Math.min(100, Math.round(xPercent * 10) / 10)),
              yPercent: Math.max(0, Math.min(100, Math.round(yPercent * 10) / 10)),
              widthPercent: Math.max(0.1, Math.min(100, Math.round(widthPercent * 10) / 10)),
              heightPercent: Math.max(0.1, Math.min(100, Math.round(heightPercent * 10) / 10)),
              type: searchMode,
              text: m.text,
            });
          }
        }
      }

      if (newRegions.length === 0) {
        toast.info("No matching content found.");
      } else {
        setRegions((prev) => {
          const updated = [...prev];
          let addedCount = 0;
          for (const newReg of newRegions) {
            const isExist = updated.some(
              (r) =>
                r.pageIndex === newReg.pageIndex &&
                Math.abs(r.xPercent - newReg.xPercent) < 0.5 &&
                Math.abs(r.yPercent - newReg.yPercent) < 0.5
            );
            if (!isExist) {
              updated.push(newReg);
              addedCount++;
            }
          }
          if (addedCount > 0) {
            toast.success(`Successfully added ${addedCount} new redaction overlays!`);
          } else {
            toast.info("Redaction regions already exist for all matches.");
          }
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to search and redact PDF text content.");
    } finally {
      setSearching(false);
    }
  };

  const processRedact = async () => {
    if (!file) return;
    if (regions.length === 0) {
      toast.error("Please add at least one redaction region before processing.");
      return;
    }

    setProcessing(true);
    try {
      const redactedBlob = await pdf.redactPdf(file, regions);
      pdf.downloadBlob(redactedBlob, `${file.name.replace(/\.[^/.]+$/, "")}_redacted.pdf`);
      toast.success("Successfully redacted and saved PDF document!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to redact PDF");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="pdf-workspace-theme-wrapper flex lg:h-[calc(100vh-140px)] lg:min-h-[550px] min-h-[680px] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl lg:flex-row">
        
        {/* LEFT SIDEBAR: Page Thumbnails */}
        {file && totalPages > 0 && (
          <div className="w-full bg-zinc-950/80 border-b border-zinc-900 lg:w-44 lg:border-b-0 lg:border-r lg:border-zinc-900 flex flex-col shrink-0 lg:h-full">
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
                const countOnPage = regions.filter((r) => r.pageIndex === i).length;

                return (
                  <button
                    key={i}
                    onClick={() => setPreviewPage(i + 1)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 rounded-xl border shrink-0 transition-all duration-200 relative",
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

                    {countOnPage > 0 && (
                      <span className="absolute top-1 right-1 bg-red-600 text-[8px] font-extrabold text-white px-1.5 py-0.5 rounded-full shadow border border-red-700">
                        {countOnPage}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CENTER VIEWPORT: Page Render & Custom Redaction Region Drawer */}
        <div className="flex flex-1 flex-col items-center bg-[radial-gradient(ellipse_at_top,rgba(20,20,25,0.7),rgba(9,9,11,1))] relative lg:h-full overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {!file ? (
            <div className="flex w-full max-w-xl flex-col items-center justify-center p-12 my-auto z-10">
              <label className="group flex w-full cursor-pointer flex-col items-center gap-6 rounded-3xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md px-6 py-20 transition-all duration-300 hover:border-red-500/30 hover:bg-zinc-900/30">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:border-red-500/20">
                  <Upload className="h-7 w-7 text-zinc-400 group-hover:text-red-500 transition-colors" />
                </span>
                <span className="text-center">
                  <p className="text-sm font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    Upload a PDF document to start redacting
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Max size {tool.maxMb} MB · Fully private in-browser editing
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
              <div className="w-full p-4 flex items-center justify-between border-b border-zinc-900 z-10 bg-zinc-950/40 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                    <FileText className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="max-w-[200px] truncate text-sm font-bold text-zinc-200">
                    {file.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 font-bold bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                    Drag mouse to select redaction region
                  </span>
                  <button
                    onClick={() => {
                      setFile(null);
                      setRotations({});
                      setRegions([]);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-850 px-3.5 py-1.5 text-xs font-bold text-zinc-200 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 transition-all duration-200 shadow-md cursor-pointer"
                  >
                    <X className="h-4 w-4" /> Clear File
                  </button>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="flex-1 w-full flex items-center justify-center relative z-10 overflow-auto scrollbar-thin p-8">
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
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="relative select-none shadow-2xl rounded-lg overflow-hidden border border-zinc-900 cursor-crosshair"
                      style={{
                        width: imageSize.width || "auto",
                        height: imageSize.height || "auto",
                        transform: `scale(${zoom})`,
                        transformOrigin: "center center",
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
                         className="max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-280px)] min-h-[300px] w-auto object-contain"
                        draggable={false}
                      />

                      {/* Semi-transparent Overlay for Regions preview */}
                      {regions
                        .filter((r) => r.pageIndex === previewPage - 1)
                        .map((region) => {
                          const pxX = (region.xPercent / 100) * imageSize.width;
                          const pxY = (region.yPercent / 100) * imageSize.height;
                          const pxW = (region.widthPercent / 100) * imageSize.width;
                          const pxH = (region.heightPercent / 100) * imageSize.height;

                          return (
                            <Rnd
                              key={region.id}
                              bounds="parent"
                              size={{ width: pxW, height: pxH }}
                              position={{ x: pxX, y: pxY }}
                              onPointerDown={(e: any) => e.stopPropagation()} // Stop drawing from triggering
                              onDragStop={(_, d) => {
                                const newX = Math.round((d.x / imageSize.width) * 1000) / 10;
                                const newY = Math.round((d.y / imageSize.height) * 1000) / 10;
                                setRegions((prev) =>
                                  prev.map((r) =>
                                    r.id === region.id
                                      ? {
                                          ...r,
                                          xPercent: Math.max(0, Math.min(100 - r.widthPercent, newX)),
                                          yPercent: Math.max(0, Math.min(100 - r.heightPercent, newY)),
                                        }
                                      : r
                                  )
                                );
                              }}
                              onResizeStop={(_, __, ref, ___, pos) => {
                                const newW = Math.round((ref.offsetWidth / imageSize.width) * 1000) / 10;
                                const newH = Math.round((ref.offsetHeight / imageSize.height) * 1000) / 10;
                                const newX = Math.round((pos.x / imageSize.width) * 1000) / 10;
                                const newY = Math.round((pos.y / imageSize.height) * 1000) / 10;
                                setRegions((prev) =>
                                  prev.map((r) =>
                                    r.id === region.id
                                      ? {
                                          ...r,
                                          xPercent: Math.max(0, Math.min(100, newX)),
                                          yPercent: Math.max(0, Math.min(100, newY)),
                                          widthPercent: Math.max(1, Math.min(100 - newX, newW)),
                                          heightPercent: Math.max(1, Math.min(100 - newY, newH)),
                                        }
                                      : r
                                  )
                                );
                              }}
                              className="border border-red-500 bg-black/75 flex items-center justify-center group z-20 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                              enableUserSelectHack={false}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRegions((prev) => prev.filter((r) => r.id !== region.id));
                                }}
                                onPointerDown={(e: any) => e.stopPropagation()}
                                className="absolute -top-2.5 -right-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer border border-zinc-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              
                              <span className="text-[7px] text-zinc-400 font-mono tracking-tight font-extrabold max-w-full truncate px-1 select-none pointer-events-none">
                                {region.type === "custom" ? "REDACT" : region.type.toUpperCase()}
                              </span>
                            </Rnd>
                          );
                        })}

                      {/* Temporary box drawn during drag */}
                      {isDrawing && (
                        <div
                          className="absolute border-2 border-dashed border-red-500 bg-red-500/10 pointer-events-none z-30"
                          style={{
                            left: Math.min(drawStart.x, drawCurrent.x),
                            top: Math.min(drawStart.y, drawCurrent.y),
                            width: Math.abs(drawCurrent.x - drawStart.x),
                            height: Math.abs(drawCurrent.y - drawStart.y),
                          }}
                        />
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Zoom & Rotate Toolbar */}
              <div className="w-full p-4 border-t border-zinc-900 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm shrink-0 z-10">
                <div className="flex items-center gap-4 bg-zinc-950/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-zinc-800 shadow-lg">
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
                    title="Rotate Page"
                  >
                    <RotateCw className="h-4 w-4 text-red-500" />
                    <span>Rotate Page</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT SIDEBAR: Manual Regions List & Auto Redact Search */}
        <div className="w-full bg-zinc-950 border-t border-zinc-900 lg:w-80 lg:border-t-0 lg:border-l lg:border-zinc-900 flex flex-col z-20 lg:h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
            
            {/* Action 1: Search & Auto Redact */}
            <div className="space-y-3.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-red-500" />
                <span>Search & Auto Redact</span>
              </span>

              {/* Mode Selectors */}
              <div className="grid grid-cols-3 gap-1">
                {[
                  { mode: "text" as const, label: "Text", icon: Search },
                  { mode: "email" as const, label: "Email", icon: Mail },
                  { mode: "phone" as const, label: "Phone", icon: Phone },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => {
                      setSearchMode(item.mode);
                    }}
                    className={cn(
                      "py-1.5 rounded-lg text-[9px] font-bold border flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer",
                      searchMode === item.mode
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300"
                    )}
                  >
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Query Field (Only for Text query mode) */}
              {searchMode === "text" && (
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Enter query text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-300 font-bold focus:border-red-500 focus:outline-none transition"
                  />
                </div>
              )}

              {/* Search Scope Option */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Apply Scope</label>
                <select
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-1.5 text-xs text-zinc-300 font-bold focus:border-red-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="all">All Pages</option>
                  <option value="current">Current Page Only</option>
                </select>
              </div>

              {/* Search Trigger */}
              <button
                onClick={performSearch}
                disabled={!file || searching || (searchMode === "text" && !searchQuery.trim())}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-855 bg-red-650 hover:bg-red-600 py-2.5 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40 shadow-lg shadow-red-500/10"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching & Redacting...
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    Search & Redact
                  </>
                )}
              </button>
            </div>

            {/* Action 2: Redaction regions list */}
            <div className="space-y-3.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-red-500" />
                <span>Active Redactions ({regions.length})</span>
              </span>

              {regions.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-600">
                  No active redaction areas.
                  <br />
                  Drag on the PDF page or search above to add.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin text-[10px]">
                  {regions.map((reg) => (
                    <div
                      key={reg.id}
                      className={cn(
                        "flex items-center justify-between bg-zinc-950 rounded-lg p-2 border transition-colors",
                        reg.pageIndex === previewPage - 1
                          ? "border-red-500/20 bg-red-950/5"
                          : "border-zinc-900 hover:border-zinc-800"
                      )}
                    >
                      <button
                        onClick={() => setPreviewPage(reg.pageIndex + 1)}
                        className="flex flex-col text-left gap-0.5 truncate max-w-[80%] cursor-pointer"
                      >
                        <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase">
                          PAGE {reg.pageIndex + 1}
                        </span>
                        <span className="truncate text-zinc-300 font-semibold">
                          {reg.type === "custom"
                            ? `Custom Box (${Math.round(reg.xPercent)}%, ${Math.round(reg.yPercent)}%)`
                            : reg.text}
                        </span>
                      </button>

                      <button
                        onClick={() => setRegions((prev) => prev.filter((r) => r.id !== reg.id))}
                        className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="Remove Redaction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div className="p-5 border-t border-zinc-900 space-y-3 shrink-0">
            {file && regions.length > 0 && (
              <button
                onClick={() => setRegions([])}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-900 py-3 text-xs font-bold text-zinc-350 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
                Clear All Regions
              </button>
            )}

            <button
              onClick={processRedact}
              disabled={!file || regions.length === 0 || processing}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 cursor-pointer",
                theme.button
              )}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redacting PDF...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Redact PDF File
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
