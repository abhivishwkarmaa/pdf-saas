"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  ScanText,
  Languages,
  Layers,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Download,
  CheckCircle2,
  FileCheck,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Eye,
  FileCode,
  ShieldCheck,
  Search,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface OcrPdfWorkspaceProps {
  tool: ToolDefinition;
}

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const OCR_LANGUAGES: LanguageOption[] = [
  { code: "eng", name: "English", flag: "🇺🇸" },
  { code: "spa", name: "Spanish (Español)", flag: "🇪🇸" },
  { code: "fra", name: "French (Français)", flag: "🇫🇷" },
  { code: "deu", name: "German (Deutsch)", flag: "🇩🇪" },
  { code: "hin", name: "Hindi (हिन्दी)", flag: "🇮🇳" },
  { code: "chi_sim", name: "Chinese Simplified (中文)", flag: "🇨🇳" },
  { code: "jpn", name: "Japanese (日本語)", flag: "🇯🇵" },
  { code: "ara", name: "Arabic (العربية)", flag: "🇸🇦" },
  { code: "rus", name: "Russian (Русский)", flag: "🇷🇺" },
  { code: "por", name: "Portuguese (Português)", flag: "🇵🇹" },
  { code: "ita", name: "Italian (Italiano)", flag: "🇮🇹" },
];

export function OcrPdfWorkspace({ tool }: OcrPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: ScanText,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Document details
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});

  // OCR Settings
  const [selectedLang, setSelectedLang] = useState<string>("eng");
  const [outputFormat, setOutputFormat] = useState<"searchable_pdf" | "text_extract">("searchable_pdf");
  const [enhanceScan, setEnhanceScan] = useState<boolean>(true);
  const [autoDeskew, setAutoDeskew] = useState<boolean>(true);

  // Extracted Text Preview
  const [extractedText, setExtractedText] = useState<string>("");
  const [copiedText, setCopiedText] = useState(false);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // PDFJS library injector
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

  // Render PDF pages on file change
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;
    const currentFile = file;
    let active = true;

    async function loadPdf() {
      setLoading(true);
      setResultBlob(null);
      setExtractedText("");

      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages;

        if (active) {
          setTotalPages(total);
          setCurrentPage(1);

          // Render first page
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (active) {
              setPageImages({ 1: canvas.toDataURL() });
            }
          }

          // Extract digital text client-side if available
          let fullText = "";
          for (let pIndex = 1; pIndex <= Math.min(total, 5); pIndex++) {
            const p = await pdfDoc.getPage(pIndex);
            const content = await p.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(" ");
            if (pageText.trim()) {
              fullText += `--- Page ${pIndex} ---\n${pageText.trim()}\n\n`;
            }
          }
          if (active && fullText.trim()) {
            setExtractedText(fullText.trim());
          }
        }
      } catch (err) {
        console.error("PDF preview error:", err);
        if (active) toast.error("Could not load PDF preview");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPdf();
    return () => {
      active = false;
    };
  }, [file, pdfjsLoaded]);

  // Load specific page
  const loadPage = async (pageNum: number) => {
    if (pageImages[pageNum] || !file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        setPageImages((prev) => ({ ...prev, [pageNum]: canvas.toDataURL() }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (file && currentPage > 0) {
      void loadPage(currentPage);
    }
  }, [file, currentPage]);

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
    setExtractedText("");
    setResultBlob(null);
    setResultFileName("");
  };

  // Run OCR processing via API
  const handleProcessOcr = async () => {
    if (!file) {
      toast.error("Please upload a PDF document first.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Uploading document... 0%");

    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append(
        "options",
        JSON.stringify({
          language: selectedLang,
          format: outputFormat,
          enhanceScan,
          autoDeskew,
        })
      );

      const xhr = new XMLHttpRequest();
      let progressInterval: NodeJS.Timeout | null = null;

      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatusMessage(`Uploading document... ${percent}%`);
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Pre-processing page images & deskewing... 15%");
          let percent = 15;
          progressInterval = setInterval(() => {
            if (percent < 95) {
              percent += Math.floor(Math.random() * 3) + 1;
              if (percent > 95) percent = 95;

              if (percent < 40) {
                setStatusMessage(`Scanning page images with Tesseract Neural OCR... ${percent}%`);
              } else if (percent < 75) {
                setStatusMessage(`Recognizing ${selectedLang.toUpperCase()} glyphs & generating text layer... ${percent}%`);
              } else {
                setStatusMessage(`Synthesizing searchable PDF stream... ${percent}%`);
              }
            }
          }, 280);
        });

        const cleanup = () => {
          if (progressInterval) clearInterval(progressInterval);
        };

        xhr.addEventListener("load", async () => {
          cleanup();
          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            const disposition = xhr.getResponseHeader("Content-Disposition");
            const match = disposition?.match(/filename="([^\"]+)"/);
            const outFileName = match?.[1] ?? `${file.name.replace(/\.[^/.]+$/, "")}_ocr.pdf`;
            resolve({ blob, fileName: outFileName });
          } else {
            try {
              const blob = xhr.response as Blob;
              const responseText = blob ? await blob.text() : "";
              const err = JSON.parse(responseText);
              reject(new Error(err.error ?? "OCR processing failed"));
            } catch (parseErr: any) {
              reject(new Error(parseErr?.message || "OCR processing failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          cleanup();
          reject(new Error("Network error occurred"));
        });

        xhr.open("POST", `/api/process/${tool.slug}`);
        xhr.responseType = "blob";
        xhr.send(formData);
      });

      const { blob: outBlob, fileName: outName } = await responsePromise;
      setResultBlob(outBlob);
      setResultFileName(outName);

      // Download automatically
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF processed with Optical Character Recognition!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to run OCR on PDF");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!resultBlob || !resultFileName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded searchable PDF!");
  };

  const copyExtractedText = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopiedText(true);
      toast.success("Extracted text copied to clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {}
  };

  const wordCount = extractedText ? extractedText.trim().split(/\s+/).length : 0;
  const charCount = extractedText ? extractedText.length : 0;
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
            OCR Another File
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
            AI & Neural Character Recognition
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
            <ScanText className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag a scanned PDF document here for OCR
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Turn scanned images and non-selectable PDFs into 100% searchable, copyable documents.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max file size: {tool.maxMb} MB · Multi-language support
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {file && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Visual Document Preview & Live Text Inspection */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Document Details */}
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
                      Language: {selectedLang.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                Tesseract Neural OCR
              </span>
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
                      OCR Completed Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Searchable
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Your document now contains a selectable, high-accuracy text layer.
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

            {/* Live PDF Page Preview Stage */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[440px] flex flex-col items-center justify-center relative overflow-hidden select-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Loading PDF document for character recognition...
                  </p>
                </div>
              ) : pageImages[currentPage] ? (
                <>
                  <div className="relative rounded-lg shadow-2xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden select-none w-72 sm:w-80 h-[380px] sm:h-[420px] flex items-center justify-center">
                    <img
                      src={pageImages[currentPage]}
                      alt={`Page ${currentPage}`}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>

                  {/* Multi-Page Navigation Bar */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-xs text-xs">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-400">Loading document preview...</p>
              )}
            </div>

            {/* Extracted Text Inspector Box */}
            {extractedText && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    Detected Text Layer Preview:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-400">
                      {wordCount} words · {charCount} chars
                    </span>
                    <button
                      type="button"
                      onClick={copyExtractedText}
                      className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1 text-xs"
                      title="Copy text"
                    >
                      {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <textarea
                  readOnly
                  value={extractedText}
                  className="w-full h-28 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-mono text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 resize-none"
                />
              </div>
            )}
          </div>

          {/* Right Column: OCR Language, Output Settings & Process Action */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Languages className="h-4 w-4 text-red-600 dark:text-red-400" />
                  OCR Language & Settings
                </h3>
                <p className="text-xs text-zinc-500">
                  Select the primary language of your scanned document for maximum recognition accuracy.
                </p>
              </div>

              {/* Language Selection Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Document Language:
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {OCR_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSelectedLang(lang.code)}
                      className={cn(
                        "p-2 rounded-lg border text-left flex items-center gap-2 transition text-xs font-semibold",
                        selectedLang === lang.code
                          ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhancement Toggles */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-2.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  Image Pre-Processing:
                </span>

                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={enhanceScan}
                      onChange={(e) => setEnhanceScan(e.target.checked)}
                      className="rounded border-zinc-300 text-red-600 focus:ring-red-500"
                    />
                    <span>Enhance image contrast & denoise scanned pages</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={autoDeskew}
                      onChange={(e) => setAutoDeskew(e.target.checked)}
                      className="rounded border-zinc-300 text-red-600 focus:ring-red-500"
                    />
                    <span>Auto-deskew (straighten skewed pages)</span>
                  </label>
                </div>
              </div>

              {/* Status Message / Progress indicator */}
              {processing && statusMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900/40 dark:bg-red-950/20 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* OCR Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Searchable PDF Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Adds invisible searchable text layer behind original scan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Exact layout and original visual resolution preserved</span>
                  </div>
                </div>
              </div>

              {/* Process OCR Action Button */}
              <button
                onClick={() => void handleProcessOcr()}
                disabled={processing}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  processing && "opacity-75 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Recognizing Text with OCR...</span>
                  </>
                ) : (
                  <>
                    <ScanText className="h-4 w-4" />
                    <span>Make PDF Searchable (OCR)</span>
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
