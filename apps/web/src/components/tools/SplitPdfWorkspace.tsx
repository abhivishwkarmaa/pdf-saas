"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Scissors,
  Layers,
  Eye,
  Check,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Download,
  ArrowLeft,
  ZoomIn,
  AlertCircle,
  FileArchive,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface SplitPdfWorkspaceProps {
  tool: ToolDefinition;
}

interface PageThumbnail {
  pageIndex: number; // 0-indexed
  pageNumber: number; // 1-indexed
  previewUrl: string;
  width: number;
  height: number;
}

interface SplitRange {
  id: string;
  fromPage: number;
  toPage: number;
}

type SplitMode = "custom-ranges" | "extract-pages" | "fixed-interval";

export function SplitPdfWorkspace({ tool }: SplitPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    badge: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Scissors,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Mode selection
  const [splitMode, setSplitMode] = useState<SplitMode>("custom-ranges");

  // Mode 1: Custom Ranges
  const [ranges, setRanges] = useState<SplitRange[]>([
    { id: "1", fromPage: 1, toPage: 1 },
  ]);
  const [mergeRangesIntoOne, setMergeRangesIntoOne] = useState<boolean>(false);

  // Mode 2: Extract Pages
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([1]));
  const [pagesTextInput, setPagesTextInput] = useState<string>("1");
  const [mergeExtractedIntoOne, setMergeExtractedIntoOne] = useState<boolean>(true);

  // Mode 3: Fixed Interval
  const [fixedInterval, setFixedInterval] = useState<number>(1);

  // Modal page zoom preview
  const [previewModalPage, setPreviewModalPage] = useState<number | null>(null);

  // Thumbnail size
  const [thumbSize, setThumbSize] = useState<"sm" | "md" | "lg">("md");

  // Dynamic PDFJS loader
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

  // Load PDF and render thumbnails whenever file changes
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

        // Reset ranges & selected pages according to total pages
        setRanges([
          { id: "1", fromPage: 1, toPage: Math.min(total, Math.ceil(total / 2)) },
          ...(total > 1
            ? [
                {
                  id: "2",
                  fromPage: Math.min(total, Math.ceil(total / 2) + 1),
                  toPage: total,
                },
              ]
            : []),
        ]);

        const initialSelected = new Set<number>();
        for (let i = 1; i <= Math.min(total, 5); i++) initialSelected.add(i);
        setSelectedPages(initialSelected);
        setPagesTextInput(Array.from(initialSelected).join(", "));

        const loadedPages: PageThumbnail[] = [];

        for (let i = 1; i <= total; i++) {
          if (isCancelled) return;
          setLoadingProgress(`Rendering preview of page ${i} of ${total}...`);

          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.6 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            loadedPages.push({
              pageIndex: i - 1,
              pageNumber: i,
              previewUrl: canvas.toDataURL("image/jpeg", 0.85),
              width: viewport.width,
              height: viewport.height,
            });
          }
        }

        if (!isCancelled) {
          setPages(loadedPages);
        }
      } catch (err) {
        console.error("Error reading PDF thumbnails:", err);
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

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a valid PDF file");
      return;
    }

    if (selected.size > tool.maxMb * 1024 * 1024) {
      toast.error(`File size exceeds maximum limit of ${tool.maxMb} MB`);
      return;
    }

    setFile(selected);
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setTotalPages(0);
    setRanges([{ id: "1", fromPage: 1, toPage: 1 }]);
    setSelectedPages(new Set([1]));
    setPagesTextInput("1");
  };

  // Helper: Format numbers to compact range string (e.g. [1,2,3,5] -> "1-3, 5")
  const formatPagesToRangeString = (pagesSet: Set<number>): string => {
    const sorted = Array.from(pagesSet).sort((a, b) => a - b);
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

  // Helper: Parse string range (e.g. "1-3, 5, 8") to Set of page numbers
  const parseRangeStringToPages = (text: string, max: number): Set<number> => {
    const result = new Set<number>();
    const segments = text.replace(/\s+/g, "").split(",").filter(Boolean);

    for (const segment of segments) {
      if (segment.includes("-")) {
        const [startStr, endStr] = segment.split("-");
        const a = parseInt(startStr, 10);
        const b = parseInt(endStr, 10);
        if (!isNaN(a) && !isNaN(b)) {
          const start = Math.max(1, Math.min(a, b));
          const end = Math.min(max, Math.max(a, b));
          for (let p = start; p <= end; p++) result.add(p);
        }
      } else {
        const num = parseInt(segment, 10);
        if (!isNaN(num) && num >= 1 && num <= max) {
          result.add(num);
        }
      }
    }
    return result;
  };

  // Sync text input with page clicks
  const togglePageSelection = (pageNum: number) => {
    const next = new Set(selectedPages);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setSelectedPages(next);
    setPagesTextInput(formatPagesToRangeString(next));
  };

  const handlePagesTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPagesTextInput(val);
    const parsed = parseRangeStringToPages(val, totalPages);
    setSelectedPages(parsed);
  };

  // Preset Selection Handlers
  const selectAllPages = () => {
    const all = new Set<number>();
    for (let i = 1; i <= totalPages; i++) all.add(i);
    setSelectedPages(all);
    setPagesTextInput(formatPagesToRangeString(all));
  };

  const deselectAllPages = () => {
    setSelectedPages(new Set());
    setPagesTextInput("");
  };

  const selectOddPages = () => {
    const odd = new Set<number>();
    for (let i = 1; i <= totalPages; i += 2) odd.add(i);
    setSelectedPages(odd);
    setPagesTextInput(formatPagesToRangeString(odd));
  };

  const selectEvenPages = () => {
    const even = new Set<number>();
    for (let i = 2; i <= totalPages; i += 2) even.add(i);
    setSelectedPages(even);
    setPagesTextInput(formatPagesToRangeString(even));
  };

  // Range Handlers for Mode 1
  const addRange = () => {
    if (ranges.length >= 20) {
      toast.error("Maximum 20 ranges allowed");
      return;
    }
    const lastRange = ranges[ranges.length - 1];
    const nextFrom = lastRange ? Math.min(totalPages, lastRange.toPage + 1) : 1;
    const nextTo = Math.min(totalPages, nextFrom + 1);

    setRanges((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fromPage: nextFrom,
        toPage: nextTo,
      },
    ]);
  };

  const removeRange = (id: string) => {
    if (ranges.length <= 1) {
      toast.error("You must have at least one range");
      return;
    }
    setRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRange = (id: string, field: "fromPage" | "toPage", value: number) => {
    const clamped = Math.max(1, Math.min(totalPages, value || 1));
    setRanges((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: clamped };
        // Ensure toPage >= fromPage
        if (field === "fromPage" && clamped > updated.toPage) {
          updated.toPage = clamped;
        }
        if (field === "toPage" && clamped < updated.fromPage) {
          updated.fromPage = clamped;
        }
        return updated;
      })
    );
  };

  // Range colors for visual tagging in grid
  const rangeColorClasses = [
    { border: "border-red-500 ring-2 ring-red-500/30", bg: "bg-red-500 text-white", tag: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
    { border: "border-blue-500 ring-2 ring-blue-500/30", bg: "bg-blue-500 text-white", tag: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    { border: "border-emerald-500 ring-2 ring-emerald-500/30", bg: "bg-emerald-500 text-white", tag: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    { border: "border-amber-500 ring-2 ring-amber-500/30", bg: "bg-amber-500 text-white", tag: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
    { border: "border-purple-500 ring-2 ring-purple-500/30", bg: "bg-purple-500 text-white", tag: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
    { border: "border-pink-500 ring-2 ring-pink-500/30", bg: "bg-pink-500 text-white", tag: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300" },
  ];

  const getPageRangeMembership = (pageNum: number) => {
    if (splitMode !== "custom-ranges") return [];
    return ranges
      .map((r, idx) => ({ range: r, index: idx }))
      .filter(({ range }) => pageNum >= range.fromPage && pageNum <= range.toPage);
  };

  // Calculated chunks for Fixed Interval
  const fixedIntervalChunks = useMemo(() => {
    if (totalPages === 0 || fixedInterval <= 0) return [];
    const chunks: { partIndex: number; fromPage: number; toPage: number }[] = [];
    let start = 1;
    let part = 1;
    while (start <= totalPages) {
      const end = Math.min(totalPages, start + fixedInterval - 1);
      chunks.push({ partIndex: part, fromPage: start, toPage: end });
      start = end + 1;
      part++;
    }
    return chunks;
  }, [totalPages, fixedInterval]);

  // Main Split Processing Function
  const handleSplitPdf = async () => {
    if (!file || totalPages === 0) {
      toast.error("Please upload a PDF file first");
      return;
    }

    setProcessing(true);
    setStatusMessage("Loading PDF Document...");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const fileBytes = await file.arrayBuffer();
      const sourceDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      const generatedFiles: { name: string; blob: Blob }[] = [];

      // ── MODE 1: CUSTOM RANGES ──────────────────────────────────────
      if (splitMode === "custom-ranges") {
        if (ranges.length === 0) {
          throw new Error("Please configure at least one page range.");
        }

        if (mergeRangesIntoOne) {
          setStatusMessage("Extracting & merging ranges...");
          const newDoc = await PDFDocument.create();
          let pageCount = 0;

          for (const r of ranges) {
            const pageIndices: number[] = [];
            for (let p = r.fromPage; p <= r.toPage; p++) {
              if (p >= 1 && p <= totalPages) {
                pageIndices.push(p - 1);
              }
            }
            if (pageIndices.length > 0) {
              const copied = await newDoc.copyPages(sourceDoc, pageIndices);
              copied.forEach((cp) => newDoc.addPage(cp));
              pageCount += copied.length;
            }
          }

          if (pageCount === 0) {
            throw new Error("Selected ranges contain no valid pages.");
          }

          const pdfBytes = await newDoc.save();
          const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
          generatedFiles.push({
            name: `${baseName}_ranges_merged.pdf`,
            blob,
          });
        } else {
          for (let i = 0; i < ranges.length; i++) {
            const r = ranges[i];
            setStatusMessage(`Creating part ${i + 1} of ${ranges.length}...`);
            const newDoc = await PDFDocument.create();
            const pageIndices: number[] = [];
            for (let p = r.fromPage; p <= r.toPage; p++) {
              if (p >= 1 && p <= totalPages) {
                pageIndices.push(p - 1);
              }
            }
            if (pageIndices.length > 0) {
              const copied = await newDoc.copyPages(sourceDoc, pageIndices);
              copied.forEach((cp) => newDoc.addPage(cp));
              const pdfBytes = await newDoc.save();
              const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
              generatedFiles.push({
                name: `${baseName}_pages_${r.fromPage}-${r.toPage}.pdf`,
                blob,
              });
            }
          }
        }
      }

      // ── MODE 2: EXTRACT PAGES ──────────────────────────────────────
      else if (splitMode === "extract-pages") {
        const sortedSelected = Array.from(selectedPages).sort((a, b) => a - b);
        if (sortedSelected.length === 0) {
          throw new Error("Please select at least one page to extract.");
        }

        if (mergeExtractedIntoOne) {
          setStatusMessage("Extracting selected pages into one PDF...");
          const newDoc = await PDFDocument.create();
          const pageIndices = sortedSelected
            .filter((p) => p >= 1 && p <= totalPages)
            .map((p) => p - 1);

          const copied = await newDoc.copyPages(sourceDoc, pageIndices);
          copied.forEach((cp) => newDoc.addPage(cp));

          const pdfBytes = await newDoc.save();
          const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
          generatedFiles.push({
            name: `${baseName}_extracted_pages.pdf`,
            blob,
          });
        } else {
          for (let i = 0; i < sortedSelected.length; i++) {
            const pageNum = sortedSelected[i];
            setStatusMessage(`Extracting page ${pageNum} (${i + 1}/${sortedSelected.length})...`);
            const newDoc = await PDFDocument.create();
            const [copied] = await newDoc.copyPages(sourceDoc, [pageNum - 1]);
            newDoc.addPage(copied);

            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            generatedFiles.push({
              name: `${baseName}_page_${pageNum}.pdf`,
              blob,
            });
          }
        }
      }

      // ── MODE 3: FIXED INTERVAL ─────────────────────────────────────
      else if (splitMode === "fixed-interval") {
        for (let i = 0; i < fixedIntervalChunks.length; i++) {
          const chunk = fixedIntervalChunks[i];
          setStatusMessage(`Processing part ${i + 1} of ${fixedIntervalChunks.length}...`);
          const newDoc = await PDFDocument.create();
          const pageIndices: number[] = [];
          for (let p = chunk.fromPage; p <= chunk.toPage; p++) {
            pageIndices.push(p - 1);
          }

          const copied = await newDoc.copyPages(sourceDoc, pageIndices);
          copied.forEach((cp) => newDoc.addPage(cp));

          const pdfBytes = await newDoc.save();
          const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
          generatedFiles.push({
            name: `${baseName}_part_${chunk.partIndex}_(p${chunk.fromPage}-p${chunk.toPage}).pdf`,
            blob,
          });
        }
      }

      // ── DOWNLOAD HANDLING ──────────────────────────────────────────
      if (generatedFiles.length === 0) {
        throw new Error("No pages could be extracted based on your settings.");
      }

      if (generatedFiles.length === 1) {
        setStatusMessage("Downloading file...");
        const fileToDownload = generatedFiles[0];
        const url = URL.createObjectURL(fileToDownload.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileToDownload.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Successfully split and downloaded ${fileToDownload.name}!`);
      } else {
        setStatusMessage("Archiving multiple PDF files into ZIP...");
        const zip = new JSZip();
        for (const gf of generatedFiles) {
          zip.file(gf.name, gf.blob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}_split_files.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${generatedFiles.length} split PDF files in a ZIP archive!`);
      }
    } catch (err) {
      console.error("Split Error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to split PDF");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  };

  const Icon = theme.icon;

  return (
    <>
      <Toaster position="top-center" richColors />

      {/* Hero Header */}
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
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/#pdf"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to PDF Tools
          </Link>

          {file && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Change PDF File
              </button>
            </div>
          )}
        </div>

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
              <Scissors className="h-8 w-8 text-red-600 dark:text-red-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag a PDF file here to split
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Preview pages in real-time, select custom page ranges, or extract individual pages.
              </p>
              <p className="mt-2 text-[11px] font-medium text-zinc-400">
                Max file size: {tool.maxMb} MB
              </p>
            </span>
          </label>
        )}

        {/* PDF Loaded Workspace */}
        {file && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Area: Visual Page Thumbnails Gallery (8 cols on desktop) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Document Info & Gallery Toolbar */}
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
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {totalPages} {totalPages === 1 ? "page" : "pages"}
                    </p>
                  </div>
                </div>

                {/* Thumbnail Size Switcher */}
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

              {/* Selection Mode Quick Bar */}
              {splitMode === "extract-pages" && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 text-red-900 dark:text-red-200 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span>Click on any page thumbnail to select / deselect</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={selectAllPages}
                      className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllPages}
                      className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={selectOddPages}
                      className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Odd Pages
                    </button>
                    <button
                      onClick={selectEvenPages}
                      className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Even Pages
                    </button>
                  </div>
                </div>
              )}

              {/* Pages Grid */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[400px] max-h-[calc(100vh-220px)] overflow-y-auto">
                {loadingPdf && pages.length < totalPages ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Generating high-resolution page previews...
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
                      const isSelected = selectedPages.has(p.pageNumber);
                      const rangeMemberships = getPageRangeMembership(p.pageNumber);
                      const isInAnyRange = rangeMemberships.length > 0;

                      return (
                        <div
                          key={p.pageNumber}
                          onClick={() => {
                            if (splitMode === "extract-pages") {
                              togglePageSelection(p.pageNumber);
                            }
                          }}
                          className={cn(
                            "group relative flex flex-col rounded-xl border transition-all duration-150 p-2 select-none",
                            splitMode === "extract-pages" ? "cursor-pointer" : "cursor-default",
                            // Extract Mode styling
                            splitMode === "extract-pages" &&
                              (isSelected
                                ? "border-red-500 bg-red-50/40 ring-2 ring-red-500/30 dark:border-red-500 dark:bg-red-950/20"
                                : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 opacity-60 hover:opacity-100"),
                            // Custom Ranges styling
                            splitMode === "custom-ranges" &&
                              (isInAnyRange
                                ? rangeColorClasses[rangeMemberships[0].index % rangeColorClasses.length].border + " bg-zinc-50 dark:bg-zinc-900"
                                : "border-zinc-200 bg-zinc-50/50 opacity-40 dark:border-zinc-800 dark:bg-zinc-900/30"),
                            // Fixed Interval styling
                            splitMode === "fixed-interval" &&
                              "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                          )}
                        >
                          {/* Thumbnail Image Container */}
                          <div className="relative mb-2 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 aspect-[3/4] w-full">
                            <img
                              src={p.previewUrl}
                              alt={`Page ${p.pageNumber}`}
                              className="h-full w-full object-contain pointer-events-none"
                              loading="lazy"
                            />

                            {/* Extract Checkbox Overlay */}
                            {splitMode === "extract-pages" && (
                              <div
                                className={cn(
                                  "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition-transform",
                                  isSelected
                                    ? "border-red-600 bg-red-600 text-white scale-105"
                                    : "border-zinc-300 bg-white/90 text-transparent group-hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
                                )}
                              >
                                <Check className="h-4 w-4 stroke-[3]" />
                              </div>
                            )}

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

                            {/* Range Badges on Thumbnail */}
                            {splitMode === "custom-ranges" && isInAnyRange && (
                              <div className="absolute top-2 left-2 flex flex-col gap-1">
                                {rangeMemberships.map(({ index }) => (
                                  <span
                                    key={index}
                                    className={cn(
                                      "rounded px-1.5 py-0.5 text-[10px] font-bold shadow-xs",
                                      rangeColorClasses[index % rangeColorClasses.length].bg
                                    )}
                                  >
                                    Range {index + 1}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Footer label */}
                          <div className="flex items-center justify-between px-1 text-xs">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              Page {p.pageNumber}
                            </span>
                            {splitMode === "extract-pages" && isSelected && (
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                Selected
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

            {/* Right Area: Interactive Split Controls Sidebar (4 cols on desktop) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="sticky top-6 flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-red-600 dark:text-red-400" />
                    Split Options
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Choose how you want to split this PDF document.
                  </p>
                </div>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    onClick={() => setSplitMode("custom-ranges")}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg py-2 px-1 text-[11px] font-bold transition text-center",
                      splitMode === "custom-ranges"
                        ? "bg-white text-red-600 shadow-sm dark:bg-zinc-800 dark:text-red-400"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    )}
                  >
                    <span>By Range</span>
                  </button>
                  <button
                    onClick={() => setSplitMode("extract-pages")}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg py-2 px-1 text-[11px] font-bold transition text-center",
                      splitMode === "extract-pages"
                        ? "bg-white text-red-600 shadow-sm dark:bg-zinc-800 dark:text-red-400"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    )}
                  >
                    <span>Extract Pages</span>
                  </button>
                  <button
                    onClick={() => setSplitMode("fixed-interval")}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg py-2 px-1 text-[11px] font-bold transition text-center",
                      splitMode === "fixed-interval"
                        ? "bg-white text-red-600 shadow-sm dark:bg-zinc-800 dark:text-red-400"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    )}
                  >
                    <span>Every N Pages</span>
                  </button>
                </div>

                {/* MODE 1: CUSTOM RANGES CONTROLS */}
                {splitMode === "custom-ranges" && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Page Ranges ({ranges.length})
                      </label>
                      <button
                        onClick={addRange}
                        className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Range
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {ranges.map((r, idx) => {
                        const color = rangeColorClasses[idx % rangeColorClasses.length];
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                color.bg
                              )}
                            >
                              {idx + 1}
                            </span>

                            <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 flex-1">
                              <span>From</span>
                              <input
                                type="number"
                                min={1}
                                max={totalPages || 1}
                                value={r.fromPage}
                                onChange={(e) =>
                                  updateRange(r.id, "fromPage", parseInt(e.target.value, 10))
                                }
                                className="w-14 rounded border border-zinc-300 bg-white px-2 py-1 text-center font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                              />
                              <span>to</span>
                              <input
                                type="number"
                                min={r.fromPage}
                                max={totalPages || 1}
                                value={r.toPage}
                                onChange={(e) =>
                                  updateRange(r.id, "toPage", parseInt(e.target.value, 10))
                                }
                                className="w-14 rounded border border-zinc-300 bg-white px-2 py-1 text-center font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                              />
                            </div>

                            {ranges.length > 1 && (
                              <button
                                onClick={() => removeRange(r.id)}
                                className="rounded p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                                title="Remove range"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Merge Ranges Switch */}
                    <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mergeRangesIntoOne}
                        onChange={(e) => setMergeRangesIntoOne(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Merge all ranges into 1 PDF file
                      </span>
                    </label>
                  </div>
                )}

                {/* MODE 2: EXTRACT PAGES CONTROLS */}
                {splitMode === "extract-pages" && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Pages to Extract:
                      </label>
                      <input
                        type="text"
                        value={pagesTextInput}
                        onChange={handlePagesTextChange}
                        placeholder="e.g. 1-3, 5, 8"
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {selectedPages.size} of {totalPages} pages selected
                      </p>
                    </div>

                    {/* Extract Mode Toggle */}
                    <div className="space-y-2 pt-1">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="extractMergeOption"
                          checked={mergeExtractedIntoOne}
                          onChange={() => setMergeExtractedIntoOne(true)}
                          className="mt-0.5 h-4 w-4 border-zinc-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            Combine into 1 PDF
                          </span>
                          <p className="text-[11px] text-zinc-500">
                            Create one single PDF containing only selected pages.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="extractMergeOption"
                          checked={!mergeExtractedIntoOne}
                          onChange={() => setMergeExtractedIntoOne(false)}
                          className="mt-0.5 h-4 w-4 border-zinc-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            Separate files (ZIP)
                          </span>
                          <p className="text-[11px] text-zinc-500">
                            Save each extracted page as an individual PDF file.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* MODE 3: FIXED INTERVAL CONTROLS */}
                {splitMode === "fixed-interval" && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Split every N pages:
                      </label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, totalPages - 1)}
                          value={fixedInterval}
                          onChange={(e) =>
                            setFixedInterval(
                              Math.max(1, Math.min(totalPages, parseInt(e.target.value, 10) || 1))
                            )
                          }
                          className="w-20 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <span className="text-xs text-zinc-500 font-medium">pages per file</span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 space-y-1.5">
                      <div className="flex justify-between font-medium">
                        <span className="text-zinc-500">Resulting Files:</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {fixedIntervalChunks.length} PDF files
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Will be downloaded together in a single ZIP archive.
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Box */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs space-y-2">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Total Pages:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {totalPages}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Output Format:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {(splitMode === "custom-ranges" && mergeRangesIntoOne) ||
                      (splitMode === "extract-pages" && mergeExtractedIntoOne)
                        ? "1 PDF Document"
                        : "ZIP Archive"}
                    </span>
                  </div>
                </div>

                {/* Action Split Button */}
                <button
                  onClick={() => void handleSplitPdf()}
                  disabled={processing || totalPages === 0}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                    theme.button,
                    processing && "opacity-80 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{statusMessage || "Splitting PDF..."}</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4" />
                      <span>
                        {splitMode === "extract-pages"
                          ? `Extract (${selectedPages.size}) Pages`
                          : splitMode === "fixed-interval"
                          ? `Split into ${fixedIntervalChunks.length} Files`
                          : "Split PDF Document"}
                      </span>
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
