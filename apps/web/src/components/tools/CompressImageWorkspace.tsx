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
  Zap,
  Sliders,
  Plus,
  Trash2,
  Image as ImageIcon,
  FileDown,
  Loader2,
  ShieldCheck,
  Layers,
  ArrowDown,
  Check,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface CompressImageWorkspaceProps {
  tool: ToolDefinition;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedBlob?: Blob;
  compressedSize?: number;
}

export function CompressImageWorkspace({ tool }: CompressImageWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20",
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    icon: ImageIcon,
  };

  const [images, setImages] = useState<ImageItem[]>([]);
  const [qualityPreset, setQualityPreset] = useState<"extreme" | "recommended" | "light" | "custom">("recommended");
  const [customQuality, setCustomQuality] = useState<number>(75);
  const [outputFormat, setOutputFormat] = useState<"auto" | "webp" | "jpeg" | "png">("auto");

  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isCompressed, setIsCompressed] = useState(false);

  const getEffectiveQuality = () => {
    switch (qualityPreset) {
      case "extreme":
        return 40;
      case "recommended":
        return 72;
      case "light":
        return 90;
      case "custom":
        return customQuality;
      default:
        return 72;
    }
  };

  // Upload images
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newItems: ImageItem[] = [];
    for (const f of files) {
      if (f.size > tool.maxMb * 1024 * 1024) {
        toast.error(`${f.name} exceeds max limit of ${tool.maxMb} MB`);
        continue;
      }
      newItems.push({
        id: Math.random().toString(36).slice(2, 9),
        file: f,
        previewUrl: URL.createObjectURL(f),
        originalSize: f.size,
      });
    }

    setImages((prev) => [...prev, ...newItems].slice(0, tool.maxFiles));
    setIsCompressed(false);
    toast.success(`Added ${newItems.length} image(s)!`);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    setIsCompressed(false);
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setIsCompressed(false);
  };

  // Client-Side Canvas Image Compression
  const compressSingleImage = (
    file: File,
    qualityPercent: number,
    format: "auto" | "webp" | "jpeg" | "png"
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0);

        let mimeType = file.type || "image/jpeg";
        if (format === "webp") mimeType = "image/webp";
        else if (format === "jpeg") mimeType = "image/jpeg";
        else if (format === "png") mimeType = "image/png";

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          mimeType,
          mimeType === "image/png" ? undefined : qualityPercent / 100
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  // Compress all images
  const handleCompressAll = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one image.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Compressing images with client-side canvas... 0%");

    try {
      const quality = getEffectiveQuality();
      const updated: ImageItem[] = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setStatusMessage(`Compressing image ${i + 1} of ${images.length}...`);
        const compressedBlob = await compressSingleImage(item.file, quality, outputFormat);

        updated.push({
          ...item,
          compressedBlob,
          compressedSize: compressedBlob.size,
        });
      }

      setImages(updated);
      setIsCompressed(true);
      toast.success("Images compressed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compress one or more images.");
    } finally {
      setProcessing(false);
    }
  };

  // Download single image
  const downloadSingleImage = (item: ImageItem) => {
    if (!item.compressedBlob) return;
    const url = URL.createObjectURL(item.compressedBlob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = item.file.name.replace(/\.[^/.]+$/, "");
    const ext = outputFormat === "webp" ? "webp" : outputFormat === "jpeg" ? "jpg" : outputFormat === "png" ? "png" : item.file.name.split(".").pop() || "jpg";
    a.download = `${baseName}_min.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all as ZIP
  const downloadAllAsZip = async () => {
    if (!isCompressed || images.length === 0) return;

    if (images.length === 1 && images[0].compressedBlob) {
      downloadSingleImage(images[0]);
      return;
    }

    setProcessing(true);
    setStatusMessage("Bundling compressed images into ZIP archive...");

    try {
      const zip = new JSZip();
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (item.compressedBlob) {
          const baseName = item.file.name.replace(/\.[^/.]+$/, "");
          const ext = outputFormat === "webp" ? "webp" : outputFormat === "jpeg" ? "jpg" : outputFormat === "png" ? "png" : item.file.name.split(".").pop() || "jpg";
          zip.file(`${baseName}_min.${ext}`, item.compressedBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compressed_images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Downloaded ZIP archive!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create ZIP file.");
    } finally {
      setProcessing(false);
    }
  };

  // Metrics
  const totalOriginalBytes = images.reduce((acc, img) => acc + img.originalSize, 0);
  const totalCompressedBytes = images.reduce(
    (acc, img) => acc + (img.compressedSize || img.originalSize),
    0
  );

  const totalOriginalMb = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
  const totalCompressedMb = (totalCompressedBytes / (1024 * 1024)).toFixed(2);
  const totalSavedPercent =
    totalOriginalBytes > 0 && isCompressed
      ? Math.max(0, Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100))
      : 0;

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
            Compress Other Images
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
            Lossy & Lossless Image Compression
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
            accept="image/*"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={handleFileUpload}
          />
          <span className="upload-icon-container group-hover:scale-105 transition-transform">
            <ImageIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag images here to compress
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Shrink JPG, PNG, WebP, and GIF file size by up to 80% without losing visual clarity.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max {tool.maxFiles} images · Up to {tool.maxMb} MB each · 100% Private in Browser
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Image Grid & Compression Stats */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {images.length} Image{images.length === 1 ? "" : "s"} Loaded
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Original: {totalOriginalMb} MB
                    </span>
                    {isCompressed && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          Compressed: {totalCompressedMb} MB (-{totalSavedPercent}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Add More Images Button */}
              {images.length < tool.maxFiles && (
                <label className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  <span>Add Images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            {/* Savings Banner (When compressed) */}
            {isCompressed && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      Saved {totalSavedPercent}% Disk Space!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Optimized
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Reduced from {totalOriginalMb} MB to {totalCompressedMb} MB.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => void downloadAllAsZip()}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  {images.length > 1 ? "Download All (ZIP)" : "Download Image"}
                </button>
              </div>
            )}

            {/* Image Gallery Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((item, idx) => {
                const origKb = (item.originalSize / 1024).toFixed(0);
                const compKb = item.compressedSize ? (item.compressedSize / 1024).toFixed(0) : null;
                const savedRatio =
                  compKb && item.originalSize > 0
                    ? Math.max(0, Math.round(((item.originalSize - item.compressedSize!) / item.originalSize) * 100))
                    : 0;

                return (
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

                    {/* Thumbnail */}
                    <div className="w-full h-36 rounded-lg bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    </div>

                    {/* Meta & Download */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="max-w-[140px] sm:max-w-[160px] truncate">
                        <p className="font-bold text-zinc-900 dark:text-white truncate">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {origKb} KB
                          {compKb && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                              → {compKb} KB (-{savedRatio}%)
                            </span>
                          )}
                        </p>
                      </div>

                      {item.compressedBlob && (
                        <button
                          type="button"
                          onClick={() => downloadSingleImage(item)}
                          className="flex items-center gap-1 rounded-lg bg-zinc-100 hover:bg-blue-600 hover:text-white dark:bg-zinc-900 dark:hover:bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition"
                          title="Download compressed image"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Save</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Compression Presets & Action Button */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Compression Level
                </h3>
                <p className="text-xs text-zinc-500">
                  Select how aggressively to compress your images.
                </p>
              </div>

              {/* Compression Preset Cards */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setQualityPreset("recommended")}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition flex items-center justify-between",
                    qualityPreset === "recommended"
                      ? "border-blue-500 bg-blue-50/60 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Recommended (Good Quality)</p>
                      <p className="text-[11px] text-zinc-400">Best balance (~60% size reduction)</p>
                    </div>
                  </div>
                  {qualityPreset === "recommended" && <Check className="h-4 w-4 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setQualityPreset("extreme")}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition flex items-center justify-between",
                    qualityPreset === "extreme"
                      ? "border-blue-500 bg-blue-50/60 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Extreme Compression</p>
                      <p className="text-[11px] text-zinc-400">Smallest file size (~75-80% reduction)</p>
                    </div>
                  </div>
                  {qualityPreset === "extreme" && <Check className="h-4 w-4 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setQualityPreset("light")}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition flex items-center justify-between",
                    qualityPreset === "light"
                      ? "border-blue-500 bg-blue-50/60 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Light Compression (High Quality)</p>
                      <p className="text-[11px] text-zinc-400">High quality preservation (~30% reduction)</p>
                    </div>
                  </div>
                  {qualityPreset === "light" && <Check className="h-4 w-4 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setQualityPreset("custom")}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition flex items-center justify-between",
                    qualityPreset === "custom"
                      ? "border-blue-500 bg-blue-50/60 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="h-4 w-4 text-purple-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Custom Quality Slider</p>
                      <p className="text-[11px] text-zinc-400">Manual quality percentage ({customQuality}%)</p>
                    </div>
                  </div>
                  {qualityPreset === "custom" && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              </div>

              {/* Custom Precision Slider (When custom selected) */}
              {qualityPreset === "custom" && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Quality: {customQuality}%
                    </span>
                    <span className="text-zinc-400">
                      {customQuality < 50 ? "High Compression" : "High Quality"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={customQuality}
                    onChange={(e) => setCustomQuality(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}

              {/* Output Format Options */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Output Format:
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {(["auto", "webp", "jpeg", "png"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOutputFormat(fmt)}
                      className={cn(
                        "py-2 rounded-lg border text-center font-semibold uppercase transition text-[11px]",
                        outputFormat === fmt
                          ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  100% Client-Side Privacy:
                </span>
                <p>
                  Images are compressed locally using your device's browser canvas engine. No files are uploaded to any server.
                </p>
              </div>

              {/* Compress Action Button */}
              <button
                onClick={() => void handleCompressAll()}
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
                    <span>Compressing Images...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Compress {images.length} Image{images.length === 1 ? "" : "s"}</span>
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
