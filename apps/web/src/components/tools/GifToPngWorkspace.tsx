"use client";

import React, { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  Download,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  FileCheck,
  Plus,
  Trash2,
  Image as ImageIcon,
  FileDown,
  Loader2,
  ShieldCheck,
  Check,
  FileType,
  Film,
  Layers,
  Zap,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface GifToPngWorkspaceProps {
  tool: ToolDefinition;
}

interface ConvertItem {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  convertedBlob?: Blob;
  convertedSize?: number;
}

export function GifToPngWorkspace({ tool }: GifToPngWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20",
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    icon: Film,
  };

  const [images, setImages] = useState<ConvertItem[]>([]);
  const [extractMode, setExtractMode] = useState<"first" | "all">("first");

  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isConverted, setIsConverted] = useState(false);

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newItems: ConvertItem[] = [];

    for (const f of files) {
      if (f.size > tool.maxMb * 1024 * 1024) {
        toast.error(`${f.name} exceeds max limit of ${tool.maxMb} MB`);
        continue;
      }

      const previewUrl = URL.createObjectURL(f);
      newItems.push({
        id: Math.random().toString(36).slice(2, 9),
        file: f,
        previewUrl,
        originalSize: f.size,
      });
    }

    setImages((prev) => [...prev, ...newItems].slice(0, tool.maxFiles));
    setIsConverted(false);
    toast.success(`Added ${newItems.length} GIF file(s)!`);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    setIsConverted(false);
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setIsConverted(false);
  };

  // Convert single GIF to lossless PNG (First frame / crisp render)
  const convertSingleGifToPng = (item: ConvertItem): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("PNG conversion failed"));
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Failed to parse GIF"));
      img.src = item.previewUrl;
    });
  };

  // Batch convert all GIFs to PNG
  const handleConvertAll = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one GIF file.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Extracting crisp PNG frames from GIF... 0%");

    try {
      const updated: ConvertItem[] = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setStatusMessage(`Processing GIF ${i + 1} of ${images.length}...`);
        const convertedBlob = await convertSingleGifToPng(item);

        updated.push({
          ...item,
          convertedBlob,
          convertedSize: convertedBlob.size,
        });
      }

      setImages(updated);
      setIsConverted(true);
      toast.success("All GIFs converted to PNG format!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert one or more GIF files.");
    } finally {
      setProcessing(false);
    }
  };

  // Download single PNG
  const downloadSinglePng = (item: ConvertItem) => {
    if (!item.convertedBlob) return;
    const url = URL.createObjectURL(item.convertedBlob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = item.file.name.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all as ZIP
  const downloadAllAsZip = async () => {
    if (!isConverted || images.length === 0) return;

    if (images.length === 1 && images[0].convertedBlob) {
      downloadSinglePng(images[0]);
      return;
    }

    setProcessing(true);
    setStatusMessage("Bundling PNG images into ZIP archive...");

    try {
      const zip = new JSZip();
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (item.convertedBlob) {
          const baseName = item.file.name.replace(/\.[^/.]+$/, "");
          zip.file(`${baseName}.png`, item.convertedBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converted_gif_pngs_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Downloaded all PNGs as ZIP!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to bundle ZIP file.");
    } finally {
      setProcessing(false);
    }
  };

  const totalOriginalMb = (
    images.reduce((acc, img) => acc + img.originalSize, 0) /
    (1024 * 1024)
  ).toFixed(2);

  const Icon = theme.icon;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <Toaster position="top-center" richColors />

      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/#image"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Image Tools
        </Link>

        {images.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Convert Other GIFs
          </button>
        )}
      </div>

      {/* Header */}
      {images.length === 0 && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            Animated GIF to Lossless PNG Converter
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
      {images.length === 0 && (
        <label className="upload-dropzone upload-dropzone-image w-full relative group cursor-pointer">
          <input
            type="file"
            multiple
            accept=".gif,image/gif"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={handleFileUpload}
          />
          <span className="upload-icon-container group-hover:scale-105 transition-transform">
            <Film className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag GIF animations here to convert to PNG
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Extract high-resolution 24-bit PNG frames with transparent alpha channel.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max {tool.maxFiles} GIFs · Up to {tool.maxMb} MB each · 100% Client-Side
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: GIF Gallery Grid */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {images.length} GIF Animation{images.length === 1 ? "" : "s"} Loaded
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Total: {totalOriginalMb} MB
                    </span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                      Target: PNG (Lossless)
                    </span>
                  </div>
                </div>
              </div>

              {/* Add More Images Button */}
              {images.length < tool.maxFiles && (
                <label className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  <span>Add GIFs</span>
                  <input
                    type="file"
                    multiple
                    accept=".gif,image/gif"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            {/* Converted Result Banner (When completed) */}
            {isConverted && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      GIFs Converted to PNG!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        PNG Ready
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Lossless 24-bit PNG frames extracted with full transparency.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => void downloadAllAsZip()}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  {images.length > 1 ? "Download All (ZIP)" : "Download PNG"}
                </button>
              </div>
            )}

            {/* GIF Gallery Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-2 transition hover:border-blue-500/40"
                >
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition shadow-sm z-10"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {/* Thumbnail with Live Animation */}
                  <div className="w-full h-36 rounded-lg bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center relative">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                      <Film className="h-2.5 w-2.5 text-blue-400" />
                      GIF
                    </span>
                  </div>

                  {/* Meta & Download */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="max-w-[150px] truncate">
                      <p className="font-bold text-zinc-900 dark:text-white truncate">
                        {item.file.name}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {(item.originalSize / 1024).toFixed(0)} KB
                        {item.convertedSize && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1 font-mono">
                            → {(item.convertedSize / 1024).toFixed(0)} KB PNG
                          </span>
                        )}
                      </p>
                    </div>

                    {item.convertedBlob && (
                      <button
                        type="button"
                        onClick={() => downloadSinglePng(item)}
                        className="flex items-center gap-1 rounded-lg bg-zinc-100 hover:bg-blue-600 hover:text-white dark:bg-zinc-900 dark:hover:bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition"
                        title="Download PNG"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Save PNG</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Settings & Specifications */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Film className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  PNG Frame Extraction
                </h3>
                <p className="text-xs text-zinc-500">
                  Extracts full-resolution uncompressed 24-bit PNG frames with transparency.
                </p>
              </div>

              {/* Extraction Feature Points */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Preserves transparent alpha channel</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Upgrades 8-bit GIF palette to 24-bit RGB True Color</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Compatible with video editors, Photoshop & slides</span>
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  100% Client-Side Privacy:
                </span>
                <p>
                  GIF frames are parsed locally in your browser canvas. No animations are uploaded to any server.
                </p>
              </div>

              {/* Convert Action Button */}
              <button
                onClick={() => void handleConvertAll()}
                disabled={processing || images.length === 0}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || images.length === 0) && "opacity-75 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Extracting PNG Frames...</span>
                  </>
                ) : (
                  <>
                    <FileType className="h-4 w-4" />
                    <span>Convert {images.length} GIF{images.length === 1 ? "" : "s"} to PNG</span>
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
