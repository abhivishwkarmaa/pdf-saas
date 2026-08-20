"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Trash2,
  Undo2,
  Eye,
  ZoomIn,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface RemovePagesWorkspaceProps {
  tool: ToolDefinition;
}

interface PageThumbnail {
  pageNumber: number; // 1-indexed
  previewUrl: string;
}

export function RemovePagesWorkspace({ tool }: RemovePagesWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Trash2,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Set of page numbers (1-based) to be REMOVED
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  const [pagesTextInput, setPagesTextInput] = useState<string>("");

  // Page zoom modal
  const [previewModalPage, setPreviewModalPage] = useState<number | null>(null);
  const [thumbSize, setThumbSize] = useState<"sm" | "md" | "lg">("md");
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  // Dynamic PDFJS loader
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
      setDeletedPages(new Set());
      setPagesTextInput("");

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js library not loaded yet.");

        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages;
        setTotalPages(total);

        const loadedPages: PageThumbnail[] = [];

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
    setDeletedPages(new Set());
    setPagesTextInput("");
  };

  // Helper: Format set of page numbers to range string (e.g. "1-3, 5")
  const formatPagesToString = (set: Set<number>): string => {
    const sorted = Array.from(set).sort((a, b) => a - b);
    if (sorted.length === 0) return "";
    const parts: string[] = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      if (current === prev + 1) {
        prev = current;
      } else {
        parts.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = current;
        prev = current;
      }
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    return parts.join(", ");
  };

  // Helper: Parse string range to set
  const parseStringToPages = (text: string, max: number): Set<number> => {
    const result = new Set<number>();
    const segments = text.replace(/\s+/g, "").split(",").filter(Boolean);
    for (const seg of segments) {
      if (seg.includes("-")) {
        const [aStr, bStr] = seg.split("-");
        const a = parseInt(aStr, 10);
        const b = parseInt(bStr, 10);
        if (!isNaN(a) && !isNaN(b)) {
          const start = Math.max(1, Math.min(a, b));
          const end = Math.min(max, Math.max(a, b));
          for (let p = start; p <= end; p++) result.add(p);
        }
      } else {
        const num = parseInt(seg, 10);
        if (!isNaN(num) && num >= 1 && num <= max) result.add(num);
      }
    }
    return result;
  };

  const togglePageDelete = (pageNum: number) => {
    const next = new Set(deletedPages);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setDeletedPages(next);
    setPagesTextInput(formatPagesToString(next));
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPagesTextInput(val);
    const parsed = parseStringToPages(val, totalPages);
    setDeletedPages(parsed);
  };

  const selectOddPages = () => {
    const odd = new Set<number>();
    for (let i = 1; i <= totalPages; i += 2) odd.add(i);
    setDeletedPages(odd);
    setPagesTextInput(formatPagesToString(odd));
  };

  const selectEvenPages = () => {
    const even = new Set<number>();
    for (let i = 2; i <= totalPages; i += 2) even.add(i);
    setDeletedPages(even);
    setPagesTextInput(formatPagesToString(even));
  };

  const clearAllDeletions = () => {
    setDeletedPages(new Set());
    setPagesTextInput("");
  };

  // Remove pages and download resulting PDF
  const handleRemovePages = async () => {
    if (!file || totalPages === 0) return;

    if (deletedPages.size === 0) {
      toast.error("Please select at least one page to remove.");
      return;
    }

    if (deletedPages.size >= totalPages) {
      toast.error("You cannot delete all pages. The PDF must have at least one remaining page.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Removing selected pages...");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const fileBytes = await file.arrayBuffer();
      const sourceDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      // Pages to keep (0-indexed)
      const keepIndices: number[] = [];
      for (let i = 1; i <= totalPages; i++) {
        if (!deletedPages.has(i)) {
          keepIndices.push(i - 1);
        }
      }

      setStatusMessage(`Copying ${keepIndices.length} remaining pages...`);
      const copied = await newDoc.copyPages(sourceDoc, keepIndices);
      copied.forEach((p) => newDoc.addPage(p));

      setStatusMessage("Saving cleaned PDF...");
      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });

      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const downloadName = `${baseName}_pages_removed.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Removed ${deletedPages.size} page(s) successfully!`);
    } catch (err) {
      console.error("Error removing pages:", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove pages.");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  };

  const remainingCount = totalPages - deletedPages.size;
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
              <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag a PDF file here to remove pages
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Select unwanted pages visually by clicking thumbnails, then download the cleaned PDF.
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
              {/* Header card */}
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
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {totalPages} total pages
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

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs dark:border-red-900/50 dark:bg-red-950/20">
                <div className="flex items-center gap-2 text-red-900 dark:text-red-200 font-medium">
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span>Click thumbnails to mark pages for removal</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={selectOddPages}
                    className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Delete Odd Pages
                  </button>
                  <button
                    onClick={selectEvenPages}
                    className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Delete Even Pages
                  </button>
                  <button
                    onClick={clearAllDeletions}
                    className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Reset (Keep All)
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
                      const isDeleted = deletedPages.has(p.pageNumber);

                      return (
                        <div
                          key={p.pageNumber}
                          onClick={() => togglePageDelete(p.pageNumber)}
                          className={cn(
                            "group relative flex flex-col rounded-xl border transition-all duration-150 p-2 cursor-pointer select-none",
                            isDeleted
                              ? "border-red-500 bg-red-50/50 ring-2 ring-red-500/30 opacity-60 hover:opacity-80 dark:border-red-500 dark:bg-red-950/20"
                              : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40"
                          )}
                        >
                          <div className="relative mb-2 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 aspect-[3/4] w-full">
                            <img
                              src={p.previewUrl}
                              alt={`Page ${p.pageNumber}`}
                              className="h-full w-full object-contain pointer-events-none"
                              loading="lazy"
                            />

                            {/* Delete Status Overlay */}
                            {isDeleted && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/55 text-white backdrop-blur-[1px] p-2 text-center">
                                <Trash2 className="h-6 w-6 mb-1 text-red-200" />
                                <span className="text-xs font-black tracking-wider uppercase">
                                  DELETED
                                </span>
                              </div>
                            )}

                            {/* Delete toggle button top-left */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePageDelete(p.pageNumber);
                              }}
                              className={cn(
                                "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition",
                                isDeleted
                                  ? "border-red-600 bg-red-600 text-white"
                                  : "border-zinc-300 bg-white/90 text-zinc-500 hover:text-red-600 dark:border-zinc-600 dark:bg-zinc-800"
                              )}
                              title={isDeleted ? "Restore page" : "Remove page"}
                            >
                              {isDeleted ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>

                            {/* Zoom Page Preview Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewModalPage(p.pageNumber);
                              }}
                              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white sm:opacity-0 transition sm:group-hover:opacity-100 hover:bg-black/80 shadow-sm"
                              title="Zoom Preview"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between px-1 text-xs">
                            <span
                              className={cn(
                                "font-semibold",
                                isDeleted
                                  ? "line-through text-red-600 dark:text-red-400"
                                  : "text-zinc-700 dark:text-zinc-300"
                              )}
                            >
                              Page {p.pageNumber}
                            </span>
                            {isDeleted ? (
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                Remove
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                Keep
                              </span>
                            )}
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
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    Removal Settings
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Click pages to delete or type page numbers directly.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Pages to Remove:
                    </label>
                    <input
                      type="text"
                      value={pagesTextInput}
                      onChange={handleTextInputChange}
                      placeholder="e.g. 1-3, 5, 8"
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Type individual pages (1, 4) or ranges (2-6).
                    </p>
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs space-y-2.5">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Original Pages:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {totalPages}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Pages to Delete:</span>
                    <span className="font-bold">
                      {deletedPages.size}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-100 pt-2 dark:border-zinc-900 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Remaining Pages:</span>
                    <span className="font-bold text-sm">
                      {remainingCount}
                    </span>
                  </div>
                </div>

                {deletedPages.size >= totalPages && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>You cannot delete all pages from the document.</span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => void handleRemovePages()}
                  disabled={processing || totalPages === 0 || deletedPages.size === 0 || deletedPages.size >= totalPages}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                    theme.button,
                    (processing || deletedPages.size === 0 || deletedPages.size >= totalPages) &&
                      "opacity-60 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{statusMessage || "Processing..."}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Remove ({deletedPages.size}) Pages</span>
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
