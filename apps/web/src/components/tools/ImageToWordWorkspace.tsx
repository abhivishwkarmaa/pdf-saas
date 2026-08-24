"use client";

import React, { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  FileSpreadsheet,
  Languages,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  CheckCircle2,
  FileCheck,
  ArrowLeft,
  Sliders,
  Eye,
  FileCode,
  ShieldCheck,
  Image as ImageIcon,
  Plus,
  Trash2,
  FileType,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface ImageToWordWorkspaceProps {
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

export function ImageToWordWorkspace({ tool }: ImageToWordWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: FileType,
  };

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>("eng");
  const [outputMode, setOutputMode] = useState<"merge" | "separate">("merge");
  const [enhanceScan, setEnhanceScan] = useState<boolean>(true);

  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const f of selected) {
      if (f.size > tool.maxMb * 1024 * 1024) {
        toast.error(`${f.name} exceeds max limit of ${tool.maxMb} MB`);
        continue;
      }
      validFiles.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }

    setFiles((prev) => [...prev, ...validFiles].slice(0, tool.maxFiles));
    setFilePreviews((prev) => [...prev, ...newPreviews].slice(0, tool.maxFiles));
    setResultBlob(null);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    filePreviews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setFilePreviews([]);
    setResultBlob(null);
    setResultFileName("");
  };

  // Run Conversion via API
  const handleProcessConvert = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one image.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Uploading images... 0%");

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append(
        "options",
        JSON.stringify({
          language: selectedLang,
          mode: outputMode,
          enhanceScan,
        })
      );

      const xhr = new XMLHttpRequest();
      let progressInterval: NodeJS.Timeout | null = null;

      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatusMessage(`Uploading images... ${percent}%`);
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Analyzing images & running Tesseract OCR... 20%");
          let percent = 20;
          progressInterval = setInterval(() => {
            if (percent < 95) {
              percent += Math.floor(Math.random() * 3) + 1;
              if (percent > 95) percent = 95;

              if (percent < 45) {
                setStatusMessage(`Analyzing images & running Tesseract OCR... ${percent}%`);
              } else if (percent < 80) {
                setStatusMessage(`Generating Word (.docx) paragraphs & formatting... ${percent}%`);
              } else {
                setStatusMessage(`Finalizing Word document... ${percent}%`);
              }
            }
          }, 260);
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
            const baseName = files[0].name.replace(/\.[^/.]+$/, "");
            const outFileName = match?.[1] ?? `${baseName}.docx`;
            resolve({ blob, fileName: outFileName });
          } else {
            try {
              const blob = xhr.response as Blob;
              const responseText = blob ? await blob.text() : "";
              const err = JSON.parse(responseText);
              reject(new Error(err.error ?? "Conversion failed"));
            } catch (parseErr: any) {
              reject(new Error(parseErr?.message || "Conversion failed"));
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

      toast.success("Images converted to Word document (.docx) successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to convert images to Word");
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
    toast.success("Downloaded Word document!");
  };

  const totalSizeMb = files
    .reduce((acc, f) => acc + f.size / (1024 * 1024), 0)
    .toFixed(2);
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
            Convert Other Images
          </button>
        )}
      </div>

      {/* Header */}
      {files.length === 0 && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            Image OCR to Word DOCX
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
      {files.length === 0 && (
        <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/bmp,image/heic,.jpg,.jpeg,.png,.webp,.bmp,.heic"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={handleFileChange}
          />
          <span className="upload-icon-container group-hover:scale-105 transition-transform">
            <ImageIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag images here to convert to Word (.docx)
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Extract text from JPG, PNG, WebP, HEIC & photos into editable Word documents.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max {tool.maxFiles} images · Up to {tool.maxMb} MB each
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Image Gallery Grid */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-xs">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {files.length} Image{files.length === 1 ? "" : "s"} Selected
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {totalSizeMb} MB Total
                    </span>
                    <span>•</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold font-mono">
                      Output: {outputMode === "merge" ? "Single Word Doc (.docx)" : "Separate Docs (.zip)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add More Images Button */}
              {files.length < tool.maxFiles && (
                <label className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5 text-red-600" />
                  <span>Add Images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/bmp,image/heic,.jpg,.jpeg,.png,.webp,.bmp,.heic"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
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
                      Word Document Created!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        DOCX Ready
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Text and image layouts have been compiled into an editable Microsoft Word document.
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

            {/* Image Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map((fileItem, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col items-center overflow-hidden transition hover:border-red-500/40"
                >
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition shadow-sm z-10"
                    title="Remove Image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {/* Thumbnail */}
                  <div className="w-full h-32 rounded-lg bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center mb-2">
                    <img
                      src={filePreviews[idx]}
                      alt={fileItem.name}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>

                  {/* Caption */}
                  <div className="w-full text-left">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {idx + 1}. {fileItem.name}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {(fileItem.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: OCR Language, Settings & Conversion Action */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Languages className="h-4 w-4 text-red-600 dark:text-red-400" />
                  OCR Language & Settings
                </h3>
                <p className="text-xs text-zinc-500">
                  Select image text language for optimal recognition accuracy in Word.
                </p>
              </div>

              {/* Language Selection Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Image Text Language:
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
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

              {/* Output Mode Option (When >1 image) */}
              {files.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    Output Organization:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setOutputMode("merge")}
                      className={cn(
                        "p-2.5 rounded-xl border text-center font-semibold transition",
                        outputMode === "merge"
                          ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      Single Merged Doc
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutputMode("separate")}
                      className={cn(
                        "p-2.5 rounded-xl border text-center font-semibold transition",
                        outputMode === "separate"
                          ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      Separate Docs (ZIP)
                    </button>
                  </div>
                </div>
              )}

              {/* Status Message / Progress indicator */}
              {processing && statusMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900/40 dark:bg-red-950/20 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Word Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Editable DOCX Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Formatted paragraphs compatible with Microsoft Word & Google Docs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Includes both embedded source photo and recognized text</span>
                  </div>
                </div>
              </div>

              {/* Convert Action Button */}
              <button
                onClick={() => void handleProcessConvert()}
                disabled={processing || files.length === 0}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || files.length === 0) && "opacity-75 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Extracting Text & Creating DOCX...</span>
                  </>
                ) : (
                  <>
                    <FileType className="h-4 w-4" />
                    <span>Convert {files.length} Image{files.length === 1 ? "" : "s"} to Word</span>
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
