"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Presentation,
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
  Monitor,
  Tv,
  Layout,
  Sliders,
  Maximize2,
  FileUp,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface PowerPointToPdfWorkspaceProps {
  tool: ToolDefinition;
}

type EngineStrategy = "auto" | "local" | "adobe";
type SlideLayoutMode = "original" | "widescreen" | "standard";
type HandoutMode = "fullbleed" | "framed";

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
    description: "Analyzes slide master layout, embedded graphics, and vector shapes to apply the optimal PDF rendering engine.",
    badge: "Recommended",
    recommendedFor: "General PowerPoint decks, pitch decks & conference slides",
    isPopular: true,
  },
  {
    id: "local",
    title: "Fast Standard Converter",
    description: "High-speed native conversion preserving slide geometries, typography, bullets, and vector objects.",
    badge: "Fast & Crisp",
    recommendedFor: "Standard presentations, lecture slides & outlines",
  },
  {
    id: "adobe",
    title: "High-Fidelity Graphics & Media",
    description: "Prioritizes complex vector animations, transparent gradient fills, drop shadows, and high-res slide photos.",
    badge: "Best for Graphics",
    recommendedFor: "Design-heavy decks, marketing slides & product brochures",
  },
];

export function PowerPointToPdfWorkspace({ tool }: PowerPointToPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Presentation,
  };

  const [file, setFile] = useState<File | null>(null);
  const [slideCount, setSlideCount] = useState<number>(0);
  const [loadingPpt, setLoadingPpt] = useState<boolean>(false);

  const [selectedEngine, setSelectedEngine] = useState<EngineStrategy>("auto");
  const [layoutMode, setLayoutMode] = useState<SlideLayoutMode>("original");
  const [handoutMode, setHandoutMode] = useState<HandoutMode>("fullbleed");

  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // Inspect PPTX structure and extract slide count
  useEffect(() => {
    if (!file) return;

    let isCancelled = false;

    const inspectPresentation = async () => {
      setLoadingPpt(true);
      setSlideCount(0);
      setResultBlob(null);

      try {
        if (file.name.toLowerCase().endsWith(".pptx")) {
          // Attempt reading slide count from pptx zip container
          const arrayBuffer = await file.arrayBuffer();
          // Scan for slide XML references in zip bytes
          const uint8 = new Uint8Array(arrayBuffer);
          let count = 0;
          const textDecoder = new TextDecoder("utf-8");
          const headerString = textDecoder.decode(uint8.subarray(0, Math.min(uint8.length, 500000)));
          const matches = headerString.match(/ppt\/slides\/slide[0-9]+\.xml/g);
          if (matches) {
            const uniqueSlides = new Set(matches);
            count = uniqueSlides.size;
          }

          if (!isCancelled) {
            setSlideCount(count > 0 ? count : 1);
          }
        } else {
          // Legacy .ppt
          if (!isCancelled) {
            setSlideCount(1);
          }
        }
      } catch (err) {
        console.warn("Could not inspect PPTX file container:", err);
        if (!isCancelled) setSlideCount(1);
      } finally {
        if (!isCancelled) {
          setLoadingPpt(false);
        }
      }
    };

    void inspectPresentation();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const name = selected.name.toLowerCase();
    if (!name.endsWith(".pptx") && !name.endsWith(".ppt")) {
      toast.error("Please upload a valid PowerPoint presentation (.pptx or .ppt)");
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
    setSlideCount(0);
    setResultBlob(null);
    setResultFileName("");
  };

  // Convert PowerPoint to PDF Action
  const handleConvertToPdf = async () => {
    if (!file) return;

    setProcessing(true);
    setStatusMessage("Uploading presentation... 0%");
    setProgressPercent(10);
    setResultBlob(null);

    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append(
        "options",
        JSON.stringify({
          engine: selectedEngine,
          layout: layoutMode,
          handout: handoutMode,
        })
      );

      const xhr = new XMLHttpRequest();
      let progressInterval: NodeJS.Timeout | null = null;

      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatusMessage(`Uploading presentation... ${percent}%`);
            setProgressPercent(Math.min(30, Math.round(percent * 0.3)));
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Analyzing slide master & vector layouts...");
          let pct = 30;
          progressInterval = setInterval(() => {
            if (pct < 95) {
              pct += Math.floor(Math.random() * 4) + 1;
              if (pct > 95) pct = 95;
              setProgressPercent(pct);

              if (pct < 55) {
                setStatusMessage("Constructing vector slide geometry & fonts...");
              } else if (pct < 80) {
                setStatusMessage("Rendering high-res slide images & backgrounds...");
              } else {
                setStatusMessage("Compiling final presentation PDF document...");
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
              reject(new Error(err.error || "PowerPoint to PDF conversion failed"));
            } catch {
              reject(new Error("PowerPoint to PDF conversion failed"));
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

      toast.success("PowerPoint presentation successfully converted to PDF!");
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
    toast.success("Downloaded presentation PDF!");
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
            Presentation Conversion
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
              Convert Another Presentation
            </button>
          )}
        </div>

        {/* Upload Dropzone */}
        {!file && (
          <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
            <input
              type="file"
              accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
            <span className="upload-icon-container group-hover:scale-105 transition-transform">
              <Presentation className="h-8 w-8 text-red-600 dark:text-red-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag a PowerPoint presentation here to convert to PDF
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Convert PowerPoint presentation decks (PPTX, PPT) into universal, print-ready PDF files.
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
            {/* Left Area: Presentation Deck Inspector Card */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Header Document Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 shadow-xs">
                    <Presentation className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs sm:max-w-md truncate">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {originalSizeMb} MB
                      </span>
                      {slideCount > 0 && (
                        <>
                          <span>•</span>
                          <span>~{slideCount} Slides</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                        <FileText className="h-3.5 w-3.5" /> Output: .PDF
                      </span>
                    </div>
                  </div>
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
                        Presentation PDF Ready!
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                          .PDF
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                        High-resolution presentation slides converted to full-bleed PDF pages.
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

              {/* Presentation Visual Summary & Slide Representation Card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[380px] flex flex-col items-center justify-center text-center">
                <div className="relative mb-6 flex h-32 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
                  <Presentation className="h-16 w-16 text-red-600 dark:text-red-400" />
                  <div className="absolute -bottom-2.5 rounded-full bg-red-600 px-3 py-0.5 text-[10px] font-black text-white uppercase shadow-xs">
                    PowerPoint Deck
                  </div>
                </div>

                <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                  Presentation Deck Loaded & Ready
                </h4>
                <p className="mt-1.5 max-w-md text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Our presentation conversion engine will transform each slide into a dedicated high-resolution vector PDF page, preserving all background designs, fonts, diagrams, and vector graphics.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    📐 1 Slide = 1 PDF Page
                  </span>
                  <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    🎨 Vector Vector Assets Retained
                  </span>
                  <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    🖨️ Presentation Print-Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Right Area: Slide Layout & Conversion Strategy */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="sticky top-6 flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Presentation className="h-4 w-4 text-red-600 dark:text-red-400" />
                    PDF Presentation Settings
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Configure slide dimensions, margins, and conversion engine.
                  </p>
                </div>

                {/* Slide Aspect Ratio Layout */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                    Slide Geometry:
                  </label>
                  <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                    <button
                      type="button"
                      onClick={() => setLayoutMode("original")}
                      className={cn(
                        "flex-1 rounded py-1 font-semibold transition",
                        layoutMode === "original"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      Original Master
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutMode("widescreen")}
                      className={cn(
                        "flex-1 rounded py-1 font-semibold transition",
                        layoutMode === "widescreen"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      16:9 Wide
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutMode("standard")}
                      className={cn(
                        "flex-1 rounded py-1 font-semibold transition",
                        layoutMode === "standard"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      4:3 Standard
                    </button>
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

                {/* Presentation PDF Features Checklist */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-2">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Presentation PDF Features:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>1 Slide per Page with Full-Bleed Scaling</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Vector Shapes, SmartArt & Diagrams Preserved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>High-Resolution Background Photos & Gradients</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Universal Presentation Compatibility</span>
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
                      Presentation PDF (1 Slide/Page)
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
                      <Presentation className="h-4 w-4" />
                      <span>Convert PowerPoint to PDF</span>
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
                      <span>Presentation PDF compilation</span>
                      <span>{progressPercent}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
