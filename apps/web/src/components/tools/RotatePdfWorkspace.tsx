"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  RotateCw,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  ZoomIn,
  Check,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface RotatePdfWorkspaceProps {
  tool: ToolDefinition;
}

interface PageItem {
  pageNumber: number; // 1-indexed
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
}

export function RotatePdfWorkspace({ tool }: RotatePdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: RotateCw,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Zoom modal & sizing
  const [previewModalPage, setPreviewModalPage] = useState<PageItem | null>(null);
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

  // Load PDF and render thumbnails
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;

    let isCancelled = false;

    const renderPdfPages = async () => {
      setLoadingPdf(true);
      setLoadingProgress("Initializing document...");
      setPages([]);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js library not loaded yet.");

        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages;
        setTotalPages(total);

        const loadedPages: PageItem[] = [];

        for (let i = 1; i <= total; i++) {
          if (isCancelled) return;
          setLoadingProgress(`Rendering page ${i} of ${total}...`);

          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.6 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            loadedPages.push({
              pageNumber: i,
              previewUrl: canvas.toDataURL("image/jpeg", 0.85),
              rotation: 0,
            });
          }
        }

        if (!isCancelled) {
          setPages(loadedPages);
        }
      } catch (err) {
        console.error("Error reading PDF pages:", err);
        toast.error("Could not load preview for this PDF file.");
      } finally {
        if (!isCancelled) {
          setLoadingPdf(false);
          setLoadingProgress("");
        }
      }
    };

    void renderPdfPages();

    return () => {
      isCancelled = true;
    };
  }, [file, pdfjsLoaded]);

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
  };

  // Rotation controls
  const rotatePageCW = (pageNum: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNum ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  const rotatePageCCW = (pageNum: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNum ? { ...p, rotation: (p.rotation + 270) % 360 } : p
      )
    );
  };

  // Bulk actions
  const rotateAllRight = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
    );
  };

  const rotateAllLeft = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + 270) % 360 }))
    );
  };

  const rotateAll180 = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + 180) % 360 }))
    );
  };

  const rotateOddPages = () => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber % 2 === 1 ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  const rotateEvenPages = () => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber % 2 === 0 ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  const resetAllRotations = () => {
    setPages((prev) => prev.map((p) => ({ ...p, rotation: 0 })));
    toast.info("Reset all rotations");
  };

  // Save Rotated PDF
  const handleSaveRotated = async () => {
    if (!file || totalPages === 0) return;

    const rotatedCount = pages.filter((p) => p.rotation !== 0).length;
    if (rotatedCount === 0) {
      toast.info("No pages have been rotated yet.");
    }

    setProcessing(true);
    setStatusMessage("Applying rotations to PDF...");

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const fileBytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });

      for (let i = 0; i < pages.length; i++) {
        const pageItem = pages[i];
        if (pageItem.rotation > 0) {
          const page = doc.getPage(i);
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
        }
      }

      setStatusMessage("Saving rotated PDF...");
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });

      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const downloadName = `${baseName}_rotated.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Successfully rotated and saved your PDF!");
    } catch (err) {
      console.error("Error rotating PDF:", err);
      toast.error(err instanceof Error ? err.message : "Failed to rotate PDF.");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  };

  const rotatedPagesCount = pages.filter((p) => p.rotation !== 0).length;
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
            PDF Utility
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
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
              Change PDF File
            </button>
          )}
        </div>

        {!file && (
          <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
            <span className="upload-icon-container group-hover:scale-105 transition-transform">
              <RotateCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag a PDF file here to rotate
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Rotate all pages together or rotate specific individual pages clockwise & counterclockwise.
              </p>
              <p className="mt-2 text-[11px] font-medium text-zinc-400">
                Max file size: {tool.maxMb} MB
              </p>
            </span>
          </label>
        )}

        {file && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Gallery Area */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs sm:max-w-md truncate">
                      {file.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {totalPages} pages
                    </p>
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

              {/* Bulk Rotate Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                  <RotateCw className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  <span>Quick Actions:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={rotateAllRight}
                    className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Rotate All Right (90°)
                  </button>
                  <button
                    onClick={rotateAllLeft}
                    className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Rotate All Left (90°)
                  </button>
                  <button
                    onClick={rotateOddPages}
                    className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                  >
                    Odd Pages
                  </button>
                  <button
                    onClick={rotateEvenPages}
                    className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                  >
                    Even Pages
                  </button>
                  <button
                    onClick={resetAllRotations}
                    className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Thumbnails Grid */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[400px] max-h-[calc(100vh-220px)] overflow-y-auto">
                {loadingPdf && pages.length < totalPages ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Generating page thumbnails...
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{loadingProgress}</p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-4",
                      thumbSize === "sm" && "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8",
                      thumbSize === "md" && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                      thumbSize === "lg" && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    )}
                  >
                    {pages.map((p) => {
                      const isRotated = p.rotation !== 0;

                      return (
                        <div
                          key={p.pageNumber}
                          className={cn(
                            "group relative flex flex-col rounded-xl border transition-all duration-150 p-2 select-none",
                            isRotated
                              ? "border-red-500 bg-red-50/40 ring-2 ring-red-500/20 dark:border-red-500 dark:bg-red-950/20"
                              : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40"
                          )}
                        >
                          <div className="relative mb-2 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 aspect-[3/4] w-full">
                            <img
                              src={p.previewUrl}
                              alt={`Page ${p.pageNumber}`}
                              className="h-full w-full object-contain pointer-events-none transition-transform duration-300"
                              style={{ transform: `rotate(${p.rotation}deg)` }}
                              loading="lazy"
                            />

                            {/* Rotation Angle Badge top-left */}
                            {isRotated && (
                              <div className="absolute top-2 left-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                {p.rotation}°
                              </div>
                            )}

                            {/* Zoom Preview Button */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalPage(p)}
                              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80 shadow-sm"
                              title="Zoom Preview"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Footer with Rotate Controls */}
                          <div className="flex items-center justify-between px-1 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              Page {p.pageNumber}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => rotatePageCCW(p.pageNumber)}
                                className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                title="Rotate Left 90°"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => rotatePageCW(p.pageNumber)}
                                className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                title="Rotate Right 90°"
                              >
                                <RotateCw className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="sticky top-6 flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-red-600 dark:text-red-400" />
                    Rotation Summary
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Rotate pages permanently and download the new PDF.
                  </p>
                </div>

                {/* Stats Summary */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs space-y-2.5">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Total Pages:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {totalPages}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Rotated Pages:</span>
                    <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                      {rotatedPagesCount} of {totalPages}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => void handleSaveRotated()}
                  disabled={processing || totalPages === 0}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                    theme.button,
                    processing && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{statusMessage || "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4" />
                      <span>Save & Download PDF</span>
                    </>
                  )}
                </button>
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
                Page {previewModalPage.pageNumber} ({previewModalPage.rotation}° rotation)
              </h4>
              <button
                onClick={() => setPreviewModalPage(null)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[400px]">
              <img
                src={previewModalPage.previewUrl}
                alt={`Page ${previewModalPage.pageNumber}`}
                className="max-h-[70vh] max-w-full rounded shadow-md object-contain transition-transform"
                style={{ transform: `rotate(${previewModalPage.rotation}deg)` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
