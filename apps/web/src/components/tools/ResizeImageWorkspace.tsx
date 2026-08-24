"use client";

import React, { useState, useEffect } from "react";
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
  Lock,
  Unlock,
  Maximize2,
  Sliders,
  Plus,
  Trash2,
  Image as ImageIcon,
  FileDown,
  Loader2,
  ShieldCheck,
  Percent,
  Scaling,
  Check,
  Smartphone,
  Monitor,
  Tv,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface ResizeImageWorkspaceProps {
  tool: ToolDefinition;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  targetWidth: number;
  targetHeight: number;
  resizedBlob?: Blob;
  resizedSize?: number;
}

const PRESETS = [
  { name: "Instagram Square", width: 1080, height: 1080, icon: Smartphone, tag: "1:1" },
  { name: "Story / Reels", width: 1080, height: 1920, icon: Smartphone, tag: "9:16" },
  { name: "YouTube Thumb", width: 1280, height: 720, icon: Tv, tag: "16:9" },
  { name: "Full HD Display", width: 1920, height: 1080, icon: Monitor, tag: "1080p" },
  { name: "Social Post", width: 1200, height: 630, icon: Monitor, tag: "1.91:1" },
  { name: "Passport / ID", width: 600, height: 600, icon: Smartphone, tag: "Square" },
];

export function ResizeImageWorkspace({ tool }: ResizeImageWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20",
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    icon: Scaling,
  };

  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Resize Settings
  const [resizeMode, setResizeMode] = useState<"pixels" | "percentage">("pixels");
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [targetWidth, setTargetWidth] = useState<number>(1080);
  const [targetHeight, setTargetHeight] = useState<number>(1080);
  const [percentage, setPercentage] = useState<number>(50);
  const [fitMode, setFitMode] = useState<"stretch" | "contain" | "cover">("contain");
  const [outputFormat, setOutputFormat] = useState<"auto" | "webp" | "jpeg" | "png">("auto");
  const [quality, setQuality] = useState<number>(90);

  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isResized, setIsResized] = useState(false);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newItems: ImageItem[] = [];

    for (const f of files) {
      if (f.size > tool.maxMb * 1024 * 1024) {
        toast.error(`${f.name} exceeds max limit of ${tool.maxMb} MB`);
        continue;
      }

      const previewUrl = URL.createObjectURL(f);
      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = previewUrl;
      });

      newItems.push({
        id: Math.random().toString(36).slice(2, 9),
        file: f,
        previewUrl,
        originalWidth: img.width,
        originalHeight: img.height,
        originalSize: f.size,
        targetWidth: img.width,
        targetHeight: img.height,
      });
    }

    setImages((prev) => {
      const combined = [...prev, ...newItems].slice(0, tool.maxFiles);
      if (prev.length === 0 && combined.length > 0) {
        setTargetWidth(combined[0].originalWidth);
        setTargetHeight(combined[0].originalHeight);
      }
      return combined;
    });

    setIsResized(false);
    toast.success(`Added ${newItems.length} image(s)!`);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    setIsResized(false);
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setIsResized(false);
  };

  // Keep aspect ratio calculation
  const handleWidthChange = (val: number) => {
    setTargetWidth(val);
    if (lockAspectRatio && images[activeImageIndex]) {
      const current = images[activeImageIndex];
      const ratio = current.originalHeight / current.originalWidth;
      setTargetHeight(Math.round(val * ratio));
    }
  };

  const handleHeightChange = (val: number) => {
    setTargetHeight(val);
    if (lockAspectRatio && images[activeImageIndex]) {
      const current = images[activeImageIndex];
      const ratio = current.originalWidth / current.originalHeight;
      setTargetWidth(Math.round(val * ratio));
    }
  };

  const applyPreset = (w: number, h: number) => {
    setResizeMode("pixels");
    setTargetWidth(w);
    setTargetHeight(h);
    toast.success(`Applied ${w} × ${h} preset!`);
  };

  // Resize a single image using canvas
  const resizeSingleImage = (
    item: ImageItem,
    outW: number,
    outH: number,
    mode: "stretch" | "contain" | "cover",
    format: "auto" | "webp" | "jpeg" | "png",
    qualityPercent: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        // Enable high quality bicubic scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        if (mode === "stretch") {
          ctx.drawImage(img, 0, 0, outW, outH);
        } else if (mode === "contain") {
          // Fill background white
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, outW, outH);
          const scale = Math.min(outW / img.width, outH / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          ctx.drawImage(img, (outW - drawW) / 2, (outH - drawH) / 2, drawW, drawH);
        } else if (mode === "cover") {
          const scale = Math.max(outW / img.width, outH / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          ctx.drawImage(img, (outW - drawW) / 2, (outH - drawH) / 2, drawW, drawH);
        }

        let mimeType = item.file.type || "image/jpeg";
        if (format === "webp") mimeType = "image/webp";
        else if (format === "jpeg") mimeType = "image/jpeg";
        else if (format === "png") mimeType = "image/png";

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Resize failed"));
          },
          mimeType,
          mimeType === "image/png" ? undefined : qualityPercent / 100
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = item.previewUrl;
    });
  };

  // Batch resize all images
  const handleResizeAll = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one image.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Resizing images with client-side canvas... 0%");

    try {
      const updated: ImageItem[] = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setStatusMessage(`Resizing image ${i + 1} of ${images.length}...`);

        let finalW = targetWidth;
        let finalH = targetHeight;

        if (resizeMode === "percentage") {
          finalW = Math.max(1, Math.round((item.originalWidth * percentage) / 100));
          finalH = Math.max(1, Math.round((item.originalHeight * percentage) / 100));
        }

        const resizedBlob = await resizeSingleImage(
          item,
          finalW,
          finalH,
          fitMode,
          outputFormat,
          quality
        );

        updated.push({
          ...item,
          targetWidth: finalW,
          targetHeight: finalH,
          resizedBlob,
          resizedSize: resizedBlob.size,
        });
      }

      setImages(updated);
      setIsResized(true);
      toast.success("All images resized successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to resize images.");
    } finally {
      setProcessing(false);
    }
  };

  // Download single resized image
  const downloadSingleImage = (item: ImageItem) => {
    if (!item.resizedBlob) return;
    const url = URL.createObjectURL(item.resizedBlob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = item.file.name.replace(/\.[^/.]+$/, "");
    const ext = outputFormat === "webp" ? "webp" : outputFormat === "jpeg" ? "jpg" : outputFormat === "png" ? "png" : item.file.name.split(".").pop() || "jpg";
    a.download = `${baseName}_${item.targetWidth}x${item.targetHeight}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all as ZIP
  const downloadAllAsZip = async () => {
    if (!isResized || images.length === 0) return;

    if (images.length === 1 && images[0].resizedBlob) {
      downloadSingleImage(images[0]);
      return;
    }

    setProcessing(true);
    setStatusMessage("Bundling resized images into ZIP archive...");

    try {
      const zip = new JSZip();
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (item.resizedBlob) {
          const baseName = item.file.name.replace(/\.[^/.]+$/, "");
          const ext = outputFormat === "webp" ? "webp" : outputFormat === "jpeg" ? "jpg" : outputFormat === "png" ? "png" : item.file.name.split(".").pop() || "jpg";
          zip.file(`${baseName}_${item.targetWidth}x${item.targetHeight}.${ext}`, item.resizedBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resized_images_${Date.now()}.zip`;
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

  const activeImg = images[activeImageIndex] || images[0];
  const Icon = theme.icon;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <Toaster position="top-center" richColors />

      {/* Navigation */}
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
            Resize Other Images
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
            High-Precision Image Dimension Scaler
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
            <Scaling className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag images here to resize
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Scale dimensions by exact pixels, percentage, or social media aspect ratios.
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
          {/* Left Column: Image Preview & Batch Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {images.length} Image{images.length === 1 ? "" : "s"} Selected
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {activeImg && (
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                        Original: {activeImg.originalWidth} × {activeImg.originalHeight} px
                      </span>
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

            {/* Resized Result Banner (When completed) */}
            {isResized && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      Images Resized Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Ready
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      New dimensions applied with high quality bicubic interpolation.
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

            {/* Active Image Visual Canvas Stage */}
            {activeImg && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[380px] flex flex-col items-center justify-center relative overflow-hidden select-none">
                <div className="relative rounded-lg shadow-xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden w-full max-w-[340px] sm:max-w-[400px] h-[280px] sm:h-[340px] flex items-center justify-center">
                  <img
                    src={activeImg.previewUrl}
                    alt={activeImg.file.name}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>

                <div className="flex items-center gap-2 mt-3 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  <span>{activeImg.file.name}</span>
                  <span>•</span>
                  <span>{(activeImg.originalSize / 1024).toFixed(0)} KB</span>
                </div>
              </div>
            )}

            {/* Thumbnail Strip (When >1 image) */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 scrollbar-thin">
                {images.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveImageIndex(idx)}
                    className={cn(
                      "relative shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition cursor-pointer group",
                      activeImageIndex === idx
                        ? "border-blue-600 shadow-md ring-2 ring-blue-500/20"
                        : "border-zinc-200 dark:border-zinc-800 opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(item.id);
                      }}
                      className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Resize Controls, Presets & Action Button */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {/* Mode Tabs */}
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setResizeMode("pixels")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded py-2 font-semibold transition",
                    resizeMode === "pixels"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Scaling className="h-3.5 w-3.5 text-blue-600" />
                  <span>By Pixels</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResizeMode("percentage")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded py-2 font-semibold transition",
                    resizeMode === "percentage"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Percent className="h-3.5 w-3.5 text-blue-600" />
                  <span>By Percentage</span>
                </button>
              </div>

              {/* MODE 1: BY PIXELS */}
              {resizeMode === "pixels" && (
                <div className="space-y-4">
                  {/* Width & Height Inputs with Lock Aspect Ratio */}
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Width (px):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={targetWidth}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-mono font-semibold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Height (px):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={targetHeight}
                        onChange={(e) => handleHeightChange(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-mono font-semibold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Lock Aspect Ratio Toggle */}
                  <button
                    type="button"
                    onClick={() => setLockAspectRatio((p) => !p)}
                    className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 transition"
                  >
                    {lockAspectRatio ? (
                      <>
                        <Lock className="h-3.5 w-3.5 text-blue-600" />
                        <span>Aspect ratio is locked (proportions maintained)</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5 text-amber-500" />
                        <span>Aspect ratio unlocked (free stretch)</span>
                      </>
                    )}
                  </button>

                  {/* Social Media & Screen Presets */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                      Quick Presets:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESETS.map((pst, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyPreset(pst.width, pst.height)}
                          className="p-2 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-left text-xs transition"
                        >
                          <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {pst.name}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {pst.width} × {pst.height} ({pst.tag})
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: BY PERCENTAGE */}
              {resizeMode === "percentage" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      <span>Scale Factor:</span>
                      <span className="font-mono text-blue-600 text-sm">{percentage}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={percentage}
                      onChange={(e) => setPercentage(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Quick Percentage Chips */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[25, 50, 75, 150].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPercentage(pct)}
                        className={cn(
                          "py-2 rounded-lg border text-center font-semibold transition text-xs",
                          percentage === pct
                            ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  {activeImg && (
                    <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50 text-xs flex justify-between font-mono">
                      <span className="text-zinc-500">Result Dimensions:</span>
                      <span className="font-bold text-blue-600">
                        {Math.round((activeImg.originalWidth * percentage) / 100)} ×{" "}
                        {Math.round((activeImg.originalHeight * percentage) / 100)} px
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Output Format & Quality */}
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
                  Images are scaled locally using your device's browser canvas engine. No files are uploaded to any server.
                </p>
              </div>

              {/* Resize Action Button */}
              <button
                onClick={() => void handleResizeAll()}
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
                    <span>Resizing Images...</span>
                  </>
                ) : (
                  <>
                    <Scaling className="h-4 w-4" />
                    <span>Resize {images.length} Image{images.length === 1 ? "" : "s"}</span>
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
