"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  Eye,
  ZoomIn,
  RefreshCw,
  ArrowLeft,
  Download,
  Sliders,
  FileArchive,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface PdfToImageWorkspaceProps {
  tool: ToolDefinition;
}

interface PageThumbnail {
  pageNumber: number; // 1-indexed
  previewUrl: string;
  width: number;
  height: number;
}

type OutputFormat = "jpg" | "png";
type QualityPreset = "standard" | "high" | "ultra";

export function PdfToImageWorkspace({ tool }: PdfToImageWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: ImageIcon,
  };

  // Initial format based on tool slug
  const defaultFormat: OutputFormat = tool.slug === "pdf-to-png" ? "png" : "jpg";
  const [format, setFormat] = useState<OutputFormat>(defaultFormat);

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Mode: All pages vs Select specific pages vs Extract embedded images
  const [conversionMode, setConversionMode] = useState<"all" | "selected" | "extract">("all");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pagesTextInput, setPagesTextInput] = useState<string>("");

  // Quality & DPI setting
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("high");
  const [jpegQuality, setJpegQuality] = useState<number>(92); // 1-100%

  // Output packaging option: ZIP vs Single
  const [packageAsZip, setPackageAsZip] = useState<boolean>(true);

  // Zoom modal & sizing
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

        // Select all pages initially
        const allPagesSet = new Set<number>();
        for (let i = 1; i <= total; i++) allPagesSet.add(i);
        setSelectedPages(allPagesSet);
        setPagesTextInput(`1-${total}`);

        const loadedPages: PageThumbnail[] = [];

        for (let i = 1; i <= total; i++) {
          if (isCancelled) return;
          setLoadingProgress(`Rendering preview for page ${i} of ${total}...`);

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
              width: viewport.width,
              height: viewport.height,
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
    setSelectedPages(new Set());
    setPagesTextInput("");
  };

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

  const togglePageSelect = (pageNum: number) => {
    const next = new Set(selectedPages);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setSelectedPages(next);
    setPagesTextInput(formatPagesToString(next));
    if (conversionMode === "all") {
      setConversionMode("selected");
    }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPagesTextInput(val);
    const parsed = parseStringToPages(val, totalPages);
    setSelectedPages(parsed);
  };

  const selectAllPages = () => {
    const all = new Set<number>();
    for (let i = 1; i <= totalPages; i++) all.add(i);
    setSelectedPages(all);
    setPagesTextInput(formatPagesToString(all));
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
    setPagesTextInput("");
  };

  const selectOddPages = () => {
    const odd = new Set<number>();
    for (let i = 1; i <= totalPages; i += 2) odd.add(i);
    setSelectedPages(odd);
    setPagesTextInput(formatPagesToString(odd));
    setConversionMode("selected");
  };

  const selectEvenPages = () => {
    const even = new Set<number>();
    for (let i = 2; i <= totalPages; i += 2) even.add(i);
    setSelectedPages(even);
    setPagesTextInput(formatPagesToString(even));
    setConversionMode("selected");
  };

  // Convert Scale multiplier based on quality preset
  const getRenderScale = () => {
    switch (qualityPreset) {
      case "standard":
        return 1.5; // ~108-150 DPI
      case "high":
        return 2.5; // ~200-300 DPI
      case "ultra":
        return 3.5; // ~300-450 DPI
      default:
        return 2.0;
    }
  };

  // Target pages to convert based on active mode
  const pagesToConvert = useMemo(() => {
    if (conversionMode === "all") {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return Array.from(selectedPages).sort((a, b) => a - b);
  }, [conversionMode, totalPages, selectedPages]);

  // Main Conversion Action
  const handleConvert = async () => {
    if (!file || totalPages === 0) return;

    // Server-side path for "extract embedded images"
    if (conversionMode === "extract") {
      setProcessing(true);
      setStatusMessage("Extracting embedded images...");
      try {
        const formData = new FormData();
        formData.append("files", file);
        formData.append(
          "options",
          JSON.stringify({
            mode: "extract",
            quality: qualityPreset === "standard" ? "low" : "high",
          })
        );

        const response = await fetch(`/api/process/${tool.slug}`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Failed to extract images");
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition");
        const match = disposition?.match(/filename="([^\"]+)"/);
        const downloadName = match?.[1] || `${file.name.replace(/\.[^/.]+$/, "")}_images.zip`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = decodeURIComponent(downloadName);
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Successfully extracted embedded images!");
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Image extraction failed");
      } finally {
        setProcessing(false);
        setStatusMessage("");
      }
      return;
    }

    // Client-side high-resolution rendering
    if (pagesToConvert.length === 0) {
      toast.error("Please select at least one page to convert.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Preparing document...");

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF.js is not loaded.");

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const ext = format === "png" ? "png" : "jpg";
      const scale = getRenderScale();

      const convertedImages: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < pagesToConvert.length; i++) {
        const pageNum = pagesToConvert[i];
        setStatusMessage(
          `Converting page ${pageNum} (${i + 1} of ${pagesToConvert.length})...`
        );

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d", { alpha: format === "png" });

        if (!ctx) throw new Error("Canvas context creation failed");

        // For JPG, fill white background to avoid transparent black artifact
        if (format === "jpg") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b),
            mimeType,
            format === "jpg" ? jpegQuality / 100 : undefined
          );
        });

        if (blob) {
          convertedImages.push({
            name: `${baseName}_page_${pageNum}.${ext}`,
            blob,
          });
        }
      }

      if (convertedImages.length === 0) {
        throw new Error("No images could be generated.");
      }

      // Download single image vs ZIP package
      if (convertedImages.length === 1 && !packageAsZip) {
        setStatusMessage("Downloading image...");
        const single = convertedImages[0];
        const url = URL.createObjectURL(single.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = single.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${single.name}!`);
      } else {
        setStatusMessage("Packaging into ZIP archive...");
        const zip = new JSZip();
        for (const item of convertedImages) {
          zip.file(item.name, item.blob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}_${format.toUpperCase()}_images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(
          `Successfully converted & downloaded ${convertedImages.length} images as ZIP!`
        );
      }
    } catch (err) {
      console.error("Conversion error:", err);
      toast.error(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  };

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
            PDF to Image
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
              Change PDF File
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
              <ImageIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag a PDF file here to convert to {format.toUpperCase()}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Preview pages in real-time, select specific pages, adjust DPI quality, and download.
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
            {/* Left Area: Visual Page Thumbnails Gallery */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Header Info */}
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

              {/* Mode Selection Quick Bar */}
              {conversionMode !== "extract" && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 text-red-900 dark:text-red-200 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span>
                      {conversionMode === "all"
                        ? "Converting all pages. Click any page to customize selection."
                        : `Selected ${selectedPages.size} of ${totalPages} pages to convert.`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => {
                        setConversionMode("all");
                        selectAllPages();
                      }}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-semibold shadow-xs transition",
                        conversionMode === "all"
                          ? "bg-red-600 text-white"
                          : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      )}
                    >
                      All Pages
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
                    <button
                      onClick={clearSelection}
                      className="rounded-md bg-white px-2.5 py-1 font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Thumbnails Grid */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[400px] max-h-[calc(100vh-220px)] overflow-y-auto">
                {loadingPdf && pages.length < totalPages ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Generating page previews...
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
                      const isIncluded =
                        conversionMode === "all" || selectedPages.has(p.pageNumber);

                      return (
                        <div
                          key={p.pageNumber}
                          onClick={() => togglePageSelect(p.pageNumber)}
                          className={cn(
                            "group relative flex flex-col rounded-xl border transition-all duration-150 p-2 cursor-pointer select-none",
                            isIncluded
                              ? "border-red-500 bg-red-50/40 ring-2 ring-red-500/30 dark:border-red-500 dark:bg-red-950/20"
                              : "border-zinc-200 bg-zinc-50/50 opacity-60 hover:opacity-100 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40"
                          )}
                        >
                          <div className="relative mb-2 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 aspect-[3/4] w-full">
                            <img
                              src={p.previewUrl}
                              alt={`Page ${p.pageNumber}`}
                              className="h-full w-full object-contain pointer-events-none"
                              loading="lazy"
                            />

                            {/* Checkbox */}
                            <div
                              className={cn(
                                "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition-transform",
                                isIncluded
                                  ? "border-red-600 bg-red-600 text-white scale-105"
                                  : "border-zinc-300 bg-white/90 text-transparent group-hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
                              )}
                            >
                              <Check className="h-4 w-4 stroke-[3]" />
                            </div>

                            {/* Zoom Button */}
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
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              Page {p.pageNumber}
                            </span>
                            {isIncluded && (
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                                {format}
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
                    <ImageIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                    Image Settings
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Convert PDF pages to crisp images or extract pictures.
                  </p>
                </div>

                {/* Conversion Mode Tabs */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Conversion Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                    <button
                      onClick={() => setConversionMode("all")}
                      className={cn(
                        "rounded-lg py-2 px-1 text-xs font-bold transition text-center",
                        conversionMode !== "extract"
                          ? "bg-white text-red-600 shadow-sm dark:bg-zinc-800 dark:text-red-400"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      )}
                    >
                      Convert Pages
                    </button>
                    <button
                      onClick={() => setConversionMode("extract")}
                      className={cn(
                        "rounded-lg py-2 px-1 text-xs font-bold transition text-center",
                        conversionMode === "extract"
                          ? "bg-white text-red-600 shadow-sm dark:bg-zinc-800 dark:text-red-400"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      )}
                    >
                      Extract Images
                    </button>
                  </div>
                </div>

                {/* Format Switcher */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Output Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormat("jpg")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition",
                        format === "jpg"
                          ? "border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/30 dark:text-red-300"
                          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span>JPG (Photo)</span>
                    </button>
                    <button
                      onClick={() => setFormat("png")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition",
                        format === "png"
                          ? "border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/30 dark:text-red-300"
                          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span>PNG (Lossless)</span>
                    </button>
                  </div>
                </div>

                {/* Quality DPI Presets */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Quality / Resolution
                    </label>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {qualityPreset === "standard"
                        ? "150 DPI (Fast)"
                        : qualityPreset === "high"
                        ? "300 DPI (High Res)"
                        : "450 DPI (Ultra HD)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setQualityPreset("standard")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        qualityPreset === "standard"
                          ? "border-red-500 bg-red-50/50 text-red-600 dark:border-red-500 dark:bg-red-950/20"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setQualityPreset("high")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        qualityPreset === "high"
                          ? "border-red-500 bg-red-50/50 text-red-600 dark:border-red-500 dark:bg-red-950/20"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      High (300DPI)
                    </button>
                    <button
                      onClick={() => setQualityPreset("ultra")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        qualityPreset === "ultra"
                          ? "border-red-500 bg-red-50/50 text-red-600 dark:border-red-500 dark:bg-red-950/20"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      Ultra HD
                    </button>
                  </div>
                </div>

                {/* JPG Quality Slider */}
                {format === "jpg" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        JPG Compression:
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {jpegQuality}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={100}
                      value={jpegQuality}
                      onChange={(e) => setJpegQuality(parseInt(e.target.value, 10))}
                      className="w-full accent-red-600"
                    />
                  </div>
                )}

                {/* Custom Page Range text input */}
                {conversionMode !== "extract" && (
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Page Range (Optional)
                    </label>
                    <input
                      type="text"
                      value={pagesTextInput}
                      onChange={handleTextInputChange}
                      placeholder="e.g. 1-3, 5"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                )}

                {/* Summary */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs space-y-2.5">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Total Pages:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {totalPages}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Converting:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {conversionMode === "extract"
                        ? "All Embedded Images"
                        : `${pagesToConvert.length} pages to ${format.toUpperCase()}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Output Package:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {pagesToConvert.length === 1 && !packageAsZip
                        ? `Single .${format}`
                        : "ZIP Archive (.zip)"}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => void handleConvert()}
                  disabled={processing || totalPages === 0 || (conversionMode !== "extract" && pagesToConvert.length === 0)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                    theme.button,
                    processing && "opacity-80 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{statusMessage || "Converting..."}</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4" />
                      <span>
                        {conversionMode === "extract"
                          ? "Extract Images"
                          : `Convert (${pagesToConvert.length}) Pages to ${format.toUpperCase()}`}
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
