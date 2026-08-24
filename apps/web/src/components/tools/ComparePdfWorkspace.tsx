"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Download,
  Split,
  Eye,
  Loader2,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sliders,
  Layers,
  ArrowRightLeft,
  Diff,
  ShieldCheck,
  Maximize2,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface ComparePdfWorkspaceProps {
  tool: ToolDefinition;
}

type CompareViewMode = "side_by_side" | "text_diff" | "overlay";

interface TextDiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

export function ComparePdfWorkspace({ tool }: ComparePdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Split,
  };

  const [files, setFiles] = useState<File[]>([]);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Comparison View Mode
  const [viewMode, setViewMode] = useState<CompareViewMode>("side_by_side");
  const [backendMode, setBackendMode] = useState<"semantic" | "visual">("semantic");

  // Page states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPagesA, setTotalPagesA] = useState(1);
  const [totalPagesB, setTotalPagesB] = useState(1);
  const [pageImagesA, setPageImagesA] = useState<Record<number, string>>({});
  const [pageImagesB, setPageImagesB] = useState<Record<number, string>>({});

  // Overlay Diff slider (0 = 100% Doc A, 100 = 100% Doc B)
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [zoom, setZoom] = useState(1.0);

  // Text diff lines
  const [diffLines, setDiffLines] = useState<TextDiffLine[]>([]);
  const [similarityScore, setSimilarityScore] = useState<number>(100);
  const [stats, setStats] = useState({ added: 0, removed: 0, unchanged: 0 });

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

  // Compute text diff between two strings
  const computeSimpleDiff = (textA: string, textB: string) => {
    const linesA = textA.split("\n").map((l) => l.trim()).filter(Boolean);
    const linesB = textB.split("\n").map((l) => l.trim()).filter(Boolean);

    const diff: TextDiffLine[] = [];
    let addedCount = 0;
    let removedCount = 0;
    let unchangedCount = 0;

    const setB = new Set(linesB);
    const setA = new Set(linesA);

    linesA.forEach((l) => {
      if (setB.has(l)) {
        diff.push({ type: "unchanged", text: l });
        unchangedCount++;
      } else {
        diff.push({ type: "removed", text: l });
        removedCount++;
      }
    });

    linesB.forEach((l) => {
      if (!setA.has(l)) {
        diff.push({ type: "added", text: l });
        addedCount++;
      }
    });

    const totalLines = addedCount + removedCount + unchangedCount;
    const similarity = totalLines > 0 ? Math.round((unchangedCount / totalLines) * 100) : 100;

    setDiffLines(diff);
    setSimilarityScore(similarity);
    setStats({ added: addedCount, removed: removedCount, unchanged: unchangedCount });
  };

  // Load and render PDF files
  useEffect(() => {
    if (files.length < 2 || !pdfjsLoaded) return;
    let active = true;

    async function loadDocuments() {
      setLoading(true);

      try {
        const pdfjsLib = (window as any).pdfjsLib;

        // Load Doc A
        const bufA = await files[0].arrayBuffer();
        const docA = await pdfjsLib.getDocument({ data: bufA }).promise;
        const totalA = docA.numPages;

        // Load Doc B
        const bufB = await files[1].arrayBuffer();
        const docB = await pdfjsLib.getDocument({ data: bufB }).promise;
        const totalB = docB.numPages;

        if (active) {
          setTotalPagesA(totalA);
          setTotalPagesB(totalB);
          setCurrentPage(1);

          // Render Page 1 for both
          const pA = await docA.getPage(1);
          const vpA = pA.getViewport({ scale: 1.5 });
          const cvsA = document.createElement("canvas");
          cvsA.width = vpA.width;
          cvsA.height = vpA.height;
          const ctxA = cvsA.getContext("2d");
          if (ctxA) {
            await pA.render({ canvasContext: ctxA, viewport: vpA }).promise;
            setPageImagesA({ 1: cvsA.toDataURL() });
          }

          const pB = await docB.getPage(1);
          const vpB = pB.getViewport({ scale: 1.5 });
          const cvsB = document.createElement("canvas");
          cvsB.width = vpB.width;
          cvsB.height = vpB.height;
          const ctxB = cvsB.getContext("2d");
          if (ctxB) {
            await pB.render({ canvasContext: ctxB, viewport: vpB }).promise;
            setPageImagesB({ 1: cvsB.toDataURL() });
          }

          // Extract text for semantic diff
          let fullTextA = "";
          let fullTextB = "";

          for (let i = 1; i <= Math.min(totalA, 10); i++) {
            const page = await docA.getPage(i);
            const content = await page.getTextContent();
            fullTextA += content.items.map((it: any) => it.str).join(" ") + "\n";
          }

          for (let i = 1; i <= Math.min(totalB, 10); i++) {
            const page = await docB.getPage(i);
            const content = await page.getTextContent();
            fullTextB += content.items.map((it: any) => it.str).join(" ") + "\n";
          }

          computeSimpleDiff(fullTextA, fullTextB);
        }
      } catch (err) {
        console.error("PDF Compare error:", err);
        if (active) toast.error("Could not render comparison documents.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDocuments();
    return () => {
      active = false;
    };
  }, [files, pdfjsLoaded]);

  // Load specific page
  const loadPageForBoth = async (pageNum: number) => {
    if (!files[0] || !files[1] || !pdfjsLoaded) return;
    const pdfjsLib = (window as any).pdfjsLib;

    try {
      if (!pageImagesA[pageNum] && pageNum <= totalPagesA) {
        const bufA = await files[0].arrayBuffer();
        const docA = await pdfjsLib.getDocument({ data: bufA }).promise;
        const pageA = await docA.getPage(pageNum);
        const vpA = pageA.getViewport({ scale: 1.5 });
        const cvsA = document.createElement("canvas");
        cvsA.width = vpA.width;
        cvsA.height = vpA.height;
        const ctxA = cvsA.getContext("2d");
        if (ctxA) {
          await pageA.render({ canvasContext: ctxA, viewport: vpA }).promise;
          setPageImagesA((prev) => ({ ...prev, [pageNum]: cvsA.toDataURL() }));
        }
      }

      if (!pageImagesB[pageNum] && pageNum <= totalPagesB) {
        const bufB = await files[1].arrayBuffer();
        const docB = await pdfjsLib.getDocument({ data: bufB }).promise;
        const pageB = await docB.getPage(pageNum);
        const vpB = pageB.getViewport({ scale: 1.5 });
        const cvsB = document.createElement("canvas");
        cvsB.width = vpB.width;
        cvsB.height = vpB.height;
        const ctxB = cvsB.getContext("2d");
        if (ctxB) {
          await pageB.render({ canvasContext: ctxB, viewport: vpB }).promise;
          setPageImagesB((prev) => ({ ...prev, [pageNum]: cvsB.toDataURL() }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (files.length === 2 && currentPage > 0) {
      void loadPageForBoth(currentPage);
    }
  }, [currentPage, files]);

  // Handle file addition
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > tool.maxMb * 1024 * 1024) {
      toast.error(`File size exceeds limit of ${tool.maxMb} MB`);
      return;
    }

    setFiles((prev) => {
      const next = [...prev];
      next[slotIndex] = selected;
      return next.slice(0, 2);
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPageImagesA({});
    setPageImagesB({});
    setDiffLines([]);
  };

  const handleReset = () => {
    setFiles([]);
    setPageImagesA({});
    setPageImagesB({});
    setDiffLines([]);
  };

  // Download PDF Comparison Report from backend
  const downloadReport = async () => {
    if (files.length < 2) return;
    setDownloading(true);

    try {
      const formData = new FormData();
      formData.append("files", files[0]);
      formData.append("files", files[1]);
      formData.append("options", JSON.stringify({ mode: backendMode, downloadReport: true }));

      const res = await fetch(`/api/process/${tool.slug}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to compile comparison report");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparison_report_${backendMode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Comparison report downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to download comparison report");
    } finally {
      setDownloading(false);
    }
  };

  const maxPages = Math.max(totalPagesA, totalPagesB);
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

        {files.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Compare Other Files
          </button>
        )}
      </div>

      {/* Header */}
      {files.length < 2 && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            Document Comparison Engine
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

      {/* Dual Upload Cards (When less than 2 files) */}
      {files.length < 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Slot A: Document A (Original) */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                A
              </span>
              Original PDF Document
            </span>

            {files[0] ? (
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm min-h-[220px]">
                <FileText className="h-10 w-10 text-red-600 mb-2" />
                <p className="text-xs font-bold text-zinc-900 dark:text-white max-w-[200px] truncate text-center">
                  {files[0].name}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {(files[0].size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={() => removeFile(0)}
                  className="mt-3 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                >
                  Change File
                </button>
              </div>
            ) : (
              <label className="upload-dropzone upload-dropzone-pdf w-full relative min-h-[220px] cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 0)}
                />
                <span className="upload-icon-container group-hover:scale-105 transition-transform">
                  <Upload className="h-7 w-7 text-red-600" />
                </span>
                <span className="text-center">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Upload Original Document (A)
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">PDF up to {tool.maxMb} MB</p>
                </span>
              </label>
            )}
          </div>

          {/* Slot B: Document B (Modified) */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                B
              </span>
              Modified / New PDF Document
            </span>

            {files[1] ? (
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm min-h-[220px]">
                <FileText className="h-10 w-10 text-emerald-600 mb-2" />
                <p className="text-xs font-bold text-zinc-900 dark:text-white max-w-[200px] truncate text-center">
                  {files[1].name}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {(files[1].size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={() => removeFile(1)}
                  className="mt-3 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition"
                >
                  Change File
                </button>
              </div>
            ) : (
              <label className="upload-dropzone upload-dropzone-pdf w-full relative min-h-[220px] cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 1)}
                />
                <span className="upload-icon-container group-hover:scale-105 transition-transform">
                  <Upload className="h-7 w-7 text-emerald-600" />
                </span>
                <span className="text-center">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Upload Modified Document (B)
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">PDF up to {tool.maxMb} MB</p>
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Active Comparison Workspace (When both files uploaded) */}
      {files.length === 2 && (
        <div className="flex flex-col gap-5">
          {/* Header Toolbar: File Details, Mode Switchers & Export Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("side_by_side")}
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold transition",
                  viewMode === "side_by_side"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-red-600" />
                <span>Side-by-Side</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("text_diff")}
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold transition",
                  viewMode === "text_diff"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <Diff className="h-3.5 w-3.5 text-red-600" />
                <span>Text Diff ({stats.added + stats.removed} changes)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("overlay")}
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold transition",
                  viewMode === "overlay"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <Layers className="h-3.5 w-3.5 text-red-600" />
                <span>Overlay Visualizer</span>
              </button>
            </div>

            {/* Metrics & Download Button */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Similarity:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                  {similarityScore}%
                </span>
              </span>

              <button
                onClick={downloadReport}
                disabled={downloading}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95",
                  theme.button,
                  downloading && "opacity-75 cursor-not-allowed"
                )}
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Compiling Report...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF Diff Report</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 flex items-center justify-between">
              <span className="text-zinc-500">Document A:</span>
              <span className="font-bold text-red-600 dark:text-red-400 truncate max-w-[120px]">
                {files[0].name} ({totalPagesA}p)
              </span>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 flex items-center justify-between">
              <span className="text-zinc-500">Document B:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]">
                {files[1].name} ({totalPagesB}p)
              </span>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 flex items-center justify-between">
              <span className="text-zinc-500">Additions (+):</span>
              <span className="font-bold font-mono text-emerald-600">
                +{stats.added} lines
              </span>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 flex items-center justify-between">
              <span className="text-zinc-500">Deletions (-):</span>
              <span className="font-bold font-mono text-red-600">
                -{stats.removed} lines
              </span>
            </div>
          </div>

          {/* MAIN COMPARISON STAGE */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[460px] flex flex-col items-center justify-center relative overflow-hidden select-none">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Rendering dual PDF comparison canvas...
                </p>
              </div>
            ) : viewMode === "side_by_side" ? (
              /* MODE 1: SIDE BY SIDE VIEW */
              <div className="w-full flex flex-col items-center gap-4">
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Doc A Preview */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span>Doc A (Original): Page {Math.min(currentPage, totalPagesA)}</span>
                    </span>
                    <div className="relative rounded-lg shadow-xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden w-full max-w-[320px] h-[380px] sm:h-[420px] flex items-center justify-center">
                      {pageImagesA[currentPage] ? (
                        <img
                          src={pageImagesA[currentPage]}
                          alt="Doc A"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <p className="text-xs text-zinc-400">Page not available</p>
                      )}
                    </div>
                  </div>

                  {/* Doc B Preview */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>Doc B (Modified): Page {Math.min(currentPage, totalPagesB)}</span>
                    </span>
                    <div className="relative rounded-lg shadow-xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden w-full max-w-[320px] h-[380px] sm:h-[420px] flex items-center justify-center">
                      {pageImagesB[currentPage] ? (
                        <img
                          src={pageImagesB[currentPage]}
                          alt="Doc B"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <p className="text-xs text-zinc-400">Page not available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Multi-Page Synchronized Navigation */}
                {maxPages > 1 && (
                  <div className="flex items-center gap-2 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-xs text-xs">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Page {currentPage} of {maxPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= maxPages}
                      onClick={() => setCurrentPage((p) => Math.min(maxPages, p + 1))}
                      className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : viewMode === "overlay" ? (
              /* MODE 2: OVERLAY VISUALIZER */
              <div className="w-full flex flex-col items-center gap-4">
                <div className="w-full max-w-md flex flex-col items-center gap-2 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="w-full flex justify-between text-xs font-semibold">
                    <span className="text-red-600 font-bold">Doc A ({100 - overlayOpacity}%)</span>
                    <span className="text-zinc-500">Overlay Blending</span>
                    <span className="text-emerald-600 font-bold">Doc B ({overlayOpacity}%)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>

                <div className="relative rounded-lg shadow-2xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden w-full max-w-[340px] h-[400px] sm:h-[450px] flex items-center justify-center">
                  {pageImagesA[currentPage] && (
                    <img
                      src={pageImagesA[currentPage]}
                      alt="Doc A"
                      style={{ opacity: (100 - overlayOpacity) / 100 }}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                  )}
                  {pageImagesB[currentPage] && (
                    <img
                      src={pageImagesB[currentPage]}
                      alt="Doc B"
                      style={{ opacity: overlayOpacity / 100 }}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                  )}
                </div>
              </div>
            ) : (
              /* MODE 3: TEXT DIFF VIEW */
              <div className="w-full flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Showing line-by-line semantic text diff:</span>
                  <span className="flex items-center gap-3">
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Green = Added
                    </span>
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" /> Red = Removed
                    </span>
                  </span>
                </div>

                <div className="w-full h-96 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs space-y-1 dark:border-zinc-800 dark:bg-zinc-950 scrollbar-thin">
                  {diffLines.length === 0 ? (
                    <p className="text-zinc-400 text-center py-10">No textual differences found between documents.</p>
                  ) : (
                    diffLines.map((line, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "px-2 py-1 rounded flex items-start gap-2",
                          line.type === "added"
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 font-semibold"
                            : line.type === "removed"
                            ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300 line-through"
                            : "text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        <span className="w-4 shrink-0 font-bold">
                          {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                        </span>
                        <span className="break-all">{line.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
