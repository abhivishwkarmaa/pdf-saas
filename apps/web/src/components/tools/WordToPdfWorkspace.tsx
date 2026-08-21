"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  FileCode,
  Check,
  CheckCircle2,
  ZoomIn,
  RefreshCw,
  ArrowLeft,
  Download,
  ShieldCheck,
  FileCheck,
  Sparkles,
  Layers,
  FileEdit,
  Layout,
  Sliders,
  Maximize2,
  FileUp,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface WordToPdfWorkspaceProps {
  tool: ToolDefinition;
}

type EngineStrategy = "auto" | "local" | "adobe";
type PageSize = "a4" | "letter";
type Orientation = "portrait" | "landscape";

interface StrategyPreset {
  id: EngineStrategy;
  title: string;
  description: string;
  badge: string;
  recommendedFor: string;
  isPopular?: boolean;
}

const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "auto",
    title: "Smart Auto-Detect (Recommended)",
    description: "Automatically analyzes document typography, graphics, and layout complexity to apply the optimal PDF vector engine.",
    badge: "Recommended",
    recommendedFor: "General Word documents, resumes, assignments & contracts",
    isPopular: true,
  },
  {
    id: "local",
    title: "Fast Standard Converter",
    description: "High-speed native conversion preserving exact text flow, paragraphs, bullet lists, and standard formatting.",
    badge: "Fast & Crisp",
    recommendedFor: "Articles, essays, standard reports & text memos",
  },
  {
    id: "adobe",
    title: "High-Fidelity Tables & Graphics",
    description: "Prioritizes precise table cell grids, complex multi-column layouts, embedded vector diagrams, and exact margins.",
    badge: "Best for Tables",
    recommendedFor: "Financial sheets, invoices, newsletters & complex tables",
  },
];

export function WordToPdfWorkspace({ tool }: WordToPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: FileText,
  };

  const [file, setFile] = useState<File | null>(null);
  const [docHtml, setDocHtml] = useState<string>("");
  const [loadingDoc, setLoadingDoc] = useState<boolean>(false);
  const [docWordCount, setDocWordCount] = useState<number>(0);

  const [selectedEngine, setSelectedEngine] = useState<EngineStrategy>("auto");
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // Inspect Modal
  const [showInspectModal, setShowInspectModal] = useState<boolean>(false);

  // Load and parse Word document preview using mammoth (dynamically imported on client)
  useEffect(() => {
    if (!file) return;

    let isCancelled = false;

    const renderWordPreview = async () => {
      setLoadingDoc(true);
      setDocHtml("");
      setResultBlob(null);

      try {
        if (file.name.toLowerCase().endsWith(".docx")) {
          const mammoth = await import("mammoth");
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (!isCancelled) {
            const rawText = result.value.replace(/<[^>]+>/g, " ");
            const words = rawText.trim().split(/\s+/).filter(Boolean).length;
            setDocWordCount(words);
            setDocHtml(result.value || "<p>Empty document</p>");
          }
        } else {
          // .doc legacy file
          if (!isCancelled) {
            setDocHtml(
              `<div class="p-6 text-center text-zinc-500 dark:text-zinc-400">
                <p class="font-bold text-zinc-800 dark:text-zinc-200">Legacy Microsoft Word Document (.doc)</p>
                <p class="text-xs mt-1">Full visual document preview is optimized for .docx files. Our conversion engine will convert this file into a clean, searchable PDF.</p>
              </div>`
            );
          }
        }
      } catch (err) {
        console.warn("Could not parse Word document for preview:", err);
        if (!isCancelled) {
          setDocHtml(
            `<div class="p-6 text-center text-zinc-500 dark:text-zinc-400">
              <p class="font-semibold text-zinc-700 dark:text-zinc-300">Document Loaded</p>
              <p class="text-xs mt-1">Ready for high-fidelity PDF conversion.</p>
            </div>`
          );
        }
      } finally {
        if (!isCancelled) {
          setLoadingDoc(false);
        }
      }
    };

    void renderWordPreview();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const name = selected.name.toLowerCase();
    if (!name.endsWith(".docx") && !name.endsWith(".doc")) {
      toast.error("Please upload a valid Word document (.docx or .doc)");
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
    setDocHtml("");
    setDocWordCount(0);
    setResultBlob(null);
    setResultFileName("");
  };

  // Convert Word to PDF Action
  const handleConvertToPdf = async () => {
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
          engine: selectedEngine,
          pageSize,
          orientation,
        })
      );

      const xhr = new XMLHttpRequest();
      let progressInterval: NodeJS.Timeout | null = null;

      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatusMessage(`Uploading document... ${percent}%`);
            setProgressPercent(Math.min(30, Math.round(percent * 0.3)));
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Analyzing typography & document layout...");
          let pct = 30;
          progressInterval = setInterval(() => {
            if (pct < 95) {
              pct += Math.floor(Math.random() * 4) + 1;
              if (pct > 95) pct = 95;
              setProgressPercent(pct);

              if (pct < 55) {
                setStatusMessage("Constructing vector PDF text & styles...");
              } else if (pct < 80) {
                setStatusMessage("Rendering tables, grids & embedded graphics...");
              } else {
                setStatusMessage("Compiling high-resolution PDF document...");
              }
            }
          }, 320);
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
              match?.[1] || `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
            resolve({ blob, fileName });
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || "Word to PDF conversion failed"));
            } catch {
              reject(new Error("Word to PDF conversion failed"));
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

      toast.success("Word document successfully converted to PDF!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Conversion failed");
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
    toast.success("Downloaded PDF document!");
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
            Word Document Conversion
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
              Convert Another Word Document
            </button>
          )}
        </div>

        {/* Upload Dropzone */}
        {!file && (
          <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
            <input
              type="file"
              accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
            <span className="upload-icon-container group-hover:scale-105 transition-transform">
              <FileUp className="h-8 w-8 text-red-600 dark:text-red-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag a Word document here to convert to PDF
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Convert Microsoft Word documents (DOCX, DOC) into universal, high-resolution PDF documents.
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
            {/* Left Area: Visual Document Inspection & Live Word Preview */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Header Document Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs">
                    <FileEdit className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs sm:max-w-md truncate">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {originalSizeMb} MB
                      </span>
                      {docWordCount > 0 && (
                        <>
                          <span>•</span>
                          <span>~{docWordCount} Words</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                        <FileText className="h-3.5 w-3.5" /> Output: .PDF
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInspectModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Fullscreen Preview
                </button>
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
                        PDF Document Ready!
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                          .PDF
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                        High-resolution vector PDF generated with exact typography & layout.
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

              {/* Live Word Document HTML Preview Card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[380px] max-h-[calc(100vh-250px)] overflow-y-auto">
                {loadingDoc ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Reading Word document formatting...
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-zinc-900 dark:prose-headings:text-white prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-table:border-collapse prose-th:border prose-th:border-zinc-300 dark:prose-th:border-zinc-700 prose-th:bg-zinc-100 dark:prose-th:bg-zinc-900 prose-th:p-2 prose-td:border prose-td:border-zinc-200 dark:prose-td:border-zinc-800 prose-td:p-2">
                    <div
                      dangerouslySetInnerHTML={{ __html: docHtml }}
                      className="word-doc-preview leading-relaxed"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Area: PDF Page Settings & Strategy */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="sticky top-6 flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                    PDF Conversion Settings
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Configure page size, orientation, and layout engine.
                  </p>
                </div>

                {/* Page Size & Orientation Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Page Size:
                    </label>
                    <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                      <button
                        type="button"
                        onClick={() => setPageSize("a4")}
                        className={cn(
                          "flex-1 rounded py-1 font-semibold transition",
                          pageSize === "a4"
                            ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        )}
                      >
                        A4 (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageSize("letter")}
                        className={cn(
                          "flex-1 rounded py-1 font-semibold transition",
                          pageSize === "letter"
                            ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        )}
                      >
                        US Letter
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Orientation:
                    </label>
                    <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                      <button
                        type="button"
                        onClick={() => setOrientation("portrait")}
                        className={cn(
                          "flex-1 rounded py-1 font-semibold transition",
                          orientation === "portrait"
                            ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        )}
                      >
                        Portrait
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation("landscape")}
                        className={cn(
                          "flex-1 rounded py-1 font-semibold transition",
                          orientation === "landscape"
                            ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        )}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conversion Strategy Radio Cards */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Conversion Engine:
                  </label>
                  {STRATEGY_PRESETS.map((preset) => {
                    const isSelected = selectedEngine === preset.id;

                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedEngine(preset.id)}
                        className={cn(
                          "relative flex flex-col rounded-xl border p-3 cursor-pointer transition-all duration-150 select-none",
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
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
                              {preset.title}
                            </span>
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

                        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 pl-6 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* PDF Features Checklist */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-2">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    PDF Document Output Features:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>100% Vector PDF (Crystal clear at all zoom levels)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Exact Font Typography & Header Hierarchies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Table Gridlines & Embedded Images Preserved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Fully Searchable & Printable Document</span>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs space-y-2.5">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Document Size:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {originalSizeMb} MB
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Target Format:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      Vector PDF ({pageSize.toUpperCase()} {orientation})
                    </span>
                  </div>
                </div>

                {/* Convert to PDF Button */}
                <button
                  onClick={() => void handleConvertToPdf()}
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
                      <span>{statusMessage || "Converting to PDF..."}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Convert Word to PDF</span>
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
                      <span>Vector PDF compilation</span>
                      <span>{progressPercent}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Fullscreen Word Document Preview */}
      {showInspectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setShowInspectModal(false)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] max-w-3xl w-full rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-blue-600" />
                <h4 className="font-bold text-zinc-900 dark:text-white">
                  {file?.name} (Document Preview)
                </h4>
              </div>
              <button
                onClick={() => setShowInspectModal(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 min-h-[400px]">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div
                  dangerouslySetInnerHTML={{ __html: docHtml }}
                  className="leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
