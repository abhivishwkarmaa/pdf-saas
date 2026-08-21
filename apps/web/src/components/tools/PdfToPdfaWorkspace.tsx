"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Archive,
  Check,
  CheckCircle2,
  ZoomIn,
  RefreshCw,
  ArrowLeft,
  Download,
  ShieldCheck,
  FileCheck,
  Award,
  Sparkles,
  Layers,
  Lock,
  Palette,
  Type,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface PdfToPdfaWorkspaceProps {
  tool: ToolDefinition;
}

interface PageThumbnail {
  pageNumber: number;
  previewUrl: string;
  width: number;
  height: number;
}

type PdfaProfile = "2b" | "1b" | "3b";

interface ProfilePreset {
  id: PdfaProfile;
  title: string;
  isoStandard: string;
  description: string;
  badge: string;
  recommendedFor: string;
  isPopular?: boolean;
}

const PDFA_PRESETS: ProfilePreset[] = [
  {
    id: "2b",
    title: "PDF/A-2b (Recommended)",
    isoStandard: "ISO 19005-2 Level B",
    description: "Modern archival standard. Fully supports transparency, layers, JPEG 2000 compression, and embedded vector graphics.",
    badge: "Recommended",
    recommendedFor: "General long-term archiving, business & legal contracts",
    isPopular: true,
  },
  {
    id: "1b",
    title: "PDF/A-1b (Classic)",
    isoStandard: "ISO 19005-1 Level B",
    description: "The original 2005 standard for basic visual preservation. Flattens transparency for maximum legacy compatibility.",
    badge: "Legacy Compatible",
    recommendedFor: "Older document management systems & government archives",
  },
  {
    id: "3b",
    title: "PDF/A-3b (Advanced)",
    isoStandard: "ISO 19005-3 Level B",
    description: "Allows embedding raw source data files (XML, CSV, CAD, spreadsheets) directly into the PDF/A document.",
    badge: "E-Invoicing Ready",
    recommendedFor: "Electronic invoicing (ZUGFeRD, Factur-X) & technical documentation",
  },
];

export function PdfToPdfaWorkspace({ tool }: PdfToPdfaWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Archive,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");

  const [selectedProfile, setSelectedProfile] = useState<PdfaProfile>("2b");
  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // Zoom modal & thumb size
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
      setResultBlob(null);

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
          setLoadingProgress(`Rendering preview ${i} of ${total}...`);

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
    setResultBlob(null);
    setResultFileName("");
  };

  // Convert to PDF/A Action
  const handleConvertToPdfA = async () => {
    if (!file) return;

    setProcessing(true);
    setStatusMessage("Uploading document... 0%");
    setProgressPercent(10);
    setResultBlob(null);

    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append(
        "options",
        JSON.stringify({
          conformance: selectedProfile,
        })
      );

      const xhr = new XMLHttpRequest();
      let progressInterval: NodeJS.Timeout | null = null;

      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatusMessage(`Uploading document... ${percent}%`);
            setProgressPercent(Math.min(35, Math.round(percent * 0.35)));
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Converting to ISO PDF/A compliance...");
          let pct = 35;
          progressInterval = setInterval(() => {
            if (pct < 95) {
              pct += Math.floor(Math.random() * 4) + 1;
              if (pct > 95) pct = 95;
              setProgressPercent(pct);

              if (pct < 55) {
                setStatusMessage("Embedding font glyphs & encoding tables...");
              } else if (pct < 80) {
                setStatusMessage("Standardizing DeviceRGB color profiles...");
              } else {
                setStatusMessage("Writing ISO 19005 compliant XMP metadata...");
              }
            }
          }, 300);
        });

        const cleanup = () => {
          if (progressInterval) clearInterval(progressInterval);
        };

        xhr.addEventListener("load", () => {
          cleanup();
          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            const disposition = xhr.getResponseHeader("Content-Disposition");
            const match = disposition?.match(/filename="([^\"]+)"/);
            const fileName =
              match?.[1] || `${file.name.replace(/\.[^/.]+$/, "")}_pdfa.pdf`;
            resolve({ blob, fileName });
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || "PDF/A Conversion failed"));
            } catch {
              reject(new Error("PDF/A Conversion failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          cleanup();
          reject(new Error("Network error occurred"));
        });

        xhr.addEventListener("abort", () => {
          cleanup();
          reject(new Error("Conversion was cancelled"));
        });

        xhr.responseType = "blob";
        xhr.open("POST", `/api/process/${tool.slug}`);
        xhr.send(formData);
      });

      const { blob, fileName } = await responsePromise;
      setProgressPercent(100);
      setResultBlob(blob);
      setResultFileName(decodeURIComponent(fileName));

      // Auto trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(fileName);
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Document successfully converted to PDF/A archival format!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "PDF/A conversion failed");
    } finally {
      setProcessing(false);
      setStatusMessage("");
      setProgressPercent(0);
    }
  };

  const handleDownloadResultAgain = () => {
    if (!resultBlob || !resultFileName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultFileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded PDF/A document!");
  };

  const originalSizeMb = file ? (file.size / (1024 * 1024)).toFixed(2) : "0";
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
            PDF Archiving
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
              Convert Another PDF
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
              <Archive className="h-8 w-8 text-red-600 dark:text-red-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag a PDF file here to convert to PDF/A
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Ensure long-term electronic document preservation compliant with ISO 19005 standards.
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
            {/* Left Area: Visual Document Inspection & Pages Gallery */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Header Document Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-xs">
                    <FileText className="h-6 w-6" />
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
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                        <ShieldCheck className="h-3.5 w-3.5" /> PDF/A Ready
                      </span>
                    </div>
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

              {/* Conversion Result Banner (Shown after conversion) */}
              {resultBlob && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        PDF/A Archival Document Ready!
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                          ISO 19005 Compliant
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                        Profile: {PDFA_PRESETS.find((p) => p.id === selectedProfile)?.isoStandard}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadResultAgain}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Again
                  </button>
                </div>
              )}

              {/* Thumbnails Gallery */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[350px] max-h-[calc(100vh-250px)] overflow-y-auto">
                {loadingPdf && pages.length < totalPages ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Loading document preview...
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{loadingProgress}</p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-4",
                      thumbSize === "sm" && "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
                      thumbSize === "md" && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
                      thumbSize === "lg" && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    )}
                  >
                    {pages.map((p) => (
                      <div
                        key={p.pageNumber}
                        className="group relative flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/50 p-2 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 select-none"
                      >
                        <div className="relative mb-2 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 aspect-[3/4] w-full">
                          <img
                            src={p.previewUrl}
                            alt={`Page ${p.pageNumber}`}
                            className="h-full w-full object-contain pointer-events-none"
                            loading="lazy"
                          />

                          {/* Zoom Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewModalPage(p.pageNumber)}
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Area: Archival Profile Selector & ISO Checklist */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="sticky top-6 flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Archive className="h-4 w-4 text-red-600 dark:text-red-400" />
                    PDF/A Archival Profile
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Select an ISO compliance standard for long-term document preservation.
                  </p>
                </div>

                {/* Profile Radio Cards */}
                <div className="flex flex-col gap-3">
                  {PDFA_PRESETS.map((preset) => {
                    const isSelected = selectedProfile === preset.id;

                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedProfile(preset.id)}
                        className={cn(
                          "relative flex flex-col rounded-xl border p-3.5 cursor-pointer transition-all duration-150 select-none",
                          isSelected
                            ? "border-red-500 bg-red-50/40 ring-2 ring-red-500/20 dark:border-red-500 dark:bg-red-950/20"
                            : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-full border transition",
                                isSelected
                                  ? "border-red-600 bg-red-600 text-white"
                                  : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                              )}
                            >
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                                {preset.title}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {preset.isoStandard}
                              </span>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs",
                              isSelected
                                ? "bg-red-600 text-white"
                                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            )}
                          >
                            {preset.badge}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 pl-6 leading-relaxed">
                          {preset.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2 pl-6 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                          <span className="truncate">For: {preset.recommendedFor}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ISO Compliance Standards Checklist Feature */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-2">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Guaranteed Archival Protections:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Full Font Embedding (All glyphs preserved)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Standardized DeviceRGB Color Spaces</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Disables Unsafe JavaScript & Audio/Video</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>ISO 19005 XMP Standard Metadata</span>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs space-y-2.5">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Document Size:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {originalSizeMb} MB ({totalPages} Pages)
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Selected Standard:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {PDFA_PRESETS.find((p) => p.id === selectedProfile)?.isoStandard}
                    </span>
                  </div>
                </div>

                {/* Convert to PDF/A Button */}
                <button
                  onClick={() => void handleConvertToPdfA()}
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
                      <span>{statusMessage || "Converting to PDF/A..."}</span>
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4" />
                      <span>Convert to PDF/A</span>
                    </>
                  )}
                </button>

                {/* Processing Progress Bar */}
                {processing && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full bg-red-600 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Archival compliance generation</span>
                      <span>{progressPercent}%</span>
                    </div>
                  </div>
                )}
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
