"use client";

import React, { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Download,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  FileCheck,
  ZoomIn,
  ZoomOut,
  Sliders,
  Plus,
  Trash2,
  Image as ImageIcon,
  FileDown,
  Loader2,
  ShieldCheck,
  Check,
  Maximize2,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface RotateImageWorkspaceProps {
  tool: ToolDefinition;
}

interface RotateItem {
  id: string;
  file: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  rotationAngle: number; // 0 - 360 or custom
  flipH: boolean;
  flipV: boolean;
  rotatedBlob?: Blob;
  rotatedSize?: number;
}

export function RotateImageWorkspace({ tool }: RotateImageWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20",
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    icon: RotateCw,
  };

  const [images, setImages] = useState<RotateItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Common Controls State (Applies to active or all)
  const [applyToAll, setApplyToAll] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [outputFormat, setOutputFormat] = useState<"auto" | "webp" | "jpeg" | "png">("auto");
  const [quality, setQuality] = useState<number>(92);

  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isRotated, setIsRotated] = useState(false);

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newItems: RotateItem[] = [];

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
        rotationAngle: 0,
        flipH: false,
        flipV: false,
      });
    }

    setImages((prev) => [...prev, ...newItems].slice(0, tool.maxFiles));
    setIsRotated(false);
    toast.success(`Added ${newItems.length} image(s)!`);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    setIsRotated(false);
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setIsRotated(false);
  };

  // Rotation & Flip operations
  const updateRotation = (delta: number) => {
    setImages((prev) =>
      prev.map((item, idx) => {
        if (!applyToAll && idx !== activeImageIndex) return item;
        const newAngle = (item.rotationAngle + delta + 360) % 360;
        return { ...item, rotationAngle: newAngle };
      })
    );
    setIsRotated(false);
  };

  const setExactAngle = (angle: number) => {
    setImages((prev) =>
      prev.map((item, idx) => {
        if (!applyToAll && idx !== activeImageIndex) return item;
        return { ...item, rotationAngle: angle };
      })
    );
    setIsRotated(false);
  };

  const toggleFlipH = () => {
    setImages((prev) =>
      prev.map((item, idx) => {
        if (!applyToAll && idx !== activeImageIndex) return item;
        return { ...item, flipH: !item.flipH };
      })
    );
    setIsRotated(false);
  };

  const toggleFlipV = () => {
    setImages((prev) =>
      prev.map((item, idx) => {
        if (!applyToAll && idx !== activeImageIndex) return item;
        return { ...item, flipV: !item.flipV };
      })
    );
    setIsRotated(false);
  };

  // Rotate single image using canvas with full bounding box calculation
  const renderRotatedImage = (
    item: RotateItem,
    format: "auto" | "webp" | "jpeg" | "png",
    qualityPercent: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const rad = (item.rotationAngle * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));

        const w = img.width * cos + img.height * sin;
        const h = img.width * sin + img.height * cos;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w));
        canvas.height = Math.max(1, Math.round(h));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Translate to center, rotate & flip
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        let mimeType = item.file.type || "image/jpeg";
        if (format === "webp") mimeType = "image/webp";
        else if (format === "jpeg") mimeType = "image/jpeg";
        else if (format === "png") mimeType = "image/png";

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Rotation failed"));
          },
          mimeType,
          mimeType === "image/png" ? undefined : qualityPercent / 100
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = item.previewUrl;
    });
  };

  // Batch rotate all images
  const handleRotateAll = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one image.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Rotating and saving images... 0%");

    try {
      const updated: RotateItem[] = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setStatusMessage(`Processing image ${i + 1} of ${images.length}...`);

        const rotatedBlob = await renderRotatedImage(item, outputFormat, quality);

        updated.push({
          ...item,
          rotatedBlob,
          rotatedSize: rotatedBlob.size,
        });
      }

      setImages(updated);
      setIsRotated(true);
      toast.success("All images rotated and processed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to rotate images.");
    } finally {
      setProcessing(false);
    }
  };

  // Download single rotated image
  const downloadSingleImage = (item: RotateItem) => {
    if (!item.rotatedBlob) return;
    const url = URL.createObjectURL(item.rotatedBlob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = item.file.name.replace(/\.[^/.]+$/, "");
    const ext =
      outputFormat === "webp"
        ? "webp"
        : outputFormat === "jpeg"
        ? "jpg"
        : outputFormat === "png"
        ? "png"
        : item.file.name.split(".").pop() || "jpg";
    a.download = `${baseName}_rotated.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all as ZIP
  const downloadAllAsZip = async () => {
    if (!isRotated || images.length === 0) return;

    if (images.length === 1 && images[0].rotatedBlob) {
      downloadSingleImage(images[0]);
      return;
    }

    setProcessing(true);
    setStatusMessage("Bundling rotated images into ZIP archive...");

    try {
      const zip = new JSZip();
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (item.rotatedBlob) {
          const baseName = item.file.name.replace(/\.[^/.]+$/, "");
          const ext =
            outputFormat === "webp"
              ? "webp"
              : outputFormat === "jpeg"
              ? "jpg"
              : outputFormat === "png"
              ? "png"
              : item.file.name.split(".").pop() || "jpg";
          zip.file(`${baseName}_rotated.${ext}`, item.rotatedBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rotated_images_${Date.now()}.zip`;
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
            Rotate Other Images
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
            Instant Image Rotation & Flipping
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
            <RotateCw className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag images here to rotate
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Rotate by 90°, 180°, custom angles, or flip horizontally & vertically.
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
          {/* Left Column: Image Canvas Stage & Batch Strip */}
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
                        Angle: {activeImg.rotationAngle}° ·{" "}
                        {activeImg.flipH ? "Flipped H" : ""}{" "}
                        {activeImg.flipV ? "Flipped V" : ""}
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

            {/* Rotated Result Banner (When completed) */}
            {isRotated && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      Images Rotated Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Ready
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      New orientation saved with no clipping or quality loss.
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

            {/* Visual Rotation Canvas Stage */}
            {activeImg && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[380px] flex flex-col items-center justify-center relative overflow-hidden select-none">
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                  className="relative rounded-lg shadow-xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden max-w-[340px] sm:max-w-[400px] max-h-[340px] sm:max-h-[400px] flex items-center justify-center transition-transform duration-200"
                >
                  <img
                    src={activeImg.previewUrl}
                    alt={activeImg.file.name}
                    style={{
                      transform: `rotate(${activeImg.rotationAngle}deg) scale(${activeImg.flipH ? -1 : 1}, ${activeImg.flipV ? -1 : 1})`,
                    }}
                    className="max-w-[320px] sm:max-w-[380px] max-h-[340px] w-auto h-auto object-contain pointer-events-none transition-transform duration-300"
                  />
                </div>

                {/* Zoom Controls Bar */}
                <div className="flex items-center gap-2 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-xs text-xs">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                    className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
                    className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1.0)}
                    className="ml-1 text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Reset Fit
                  </button>
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
                      style={{
                        transform: `rotate(${item.rotationAngle}deg) scale(${item.flipH ? -1 : 1}, ${item.flipV ? -1 : 1})`,
                      }}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white rounded text-[8px] px-1 font-mono">
                      {item.rotationAngle}°
                    </span>
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

          {/* Right Column: Rotation Tools, Flip Controls & Export */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {/* Batch Apply Checkbox (When >1 image) */}
              {images.length > 1 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 pb-1 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Apply rotation to all {images.length} images</span>
                </label>
              )}

              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <RotateCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Quick Rotation
                </h3>
                <p className="text-xs text-zinc-500">
                  Rotate 90 degrees or flip orientation.
                </p>
              </div>

              {/* 1-Tap Quick Rotation Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => updateRotation(90)}
                  className="p-3 rounded-xl border border-zinc-200 bg-white hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-blue-950/30 text-zinc-800 dark:text-zinc-200 flex flex-col items-center gap-1.5 transition font-semibold active:scale-95"
                >
                  <RotateCw className="h-5 w-5 text-blue-600" />
                  <span>+90° CW</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateRotation(-90)}
                  className="p-3 rounded-xl border border-zinc-200 bg-white hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-blue-950/30 text-zinc-800 dark:text-zinc-200 flex flex-col items-center gap-1.5 transition font-semibold active:scale-95"
                >
                  <RotateCcw className="h-5 w-5 text-blue-600" />
                  <span>-90° CCW</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateRotation(180)}
                  className="p-3 rounded-xl border border-zinc-200 bg-white hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-blue-950/30 text-zinc-800 dark:text-zinc-200 flex flex-col items-center gap-1.5 transition font-semibold active:scale-95"
                >
                  <RotateCw className="h-5 w-5 text-purple-600" />
                  <span>180° Invert</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExactAngle(0)}
                  className="p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex flex-col items-center gap-1.5 transition font-semibold active:scale-95"
                >
                  <RefreshCw className="h-5 w-5 text-zinc-400" />
                  <span>Reset 0°</span>
                </button>
              </div>

              {/* Mirror & Flip Buttons */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Mirror & Flip:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={toggleFlipH}
                    className={cn(
                      "p-2.5 rounded-xl border text-center font-semibold transition flex items-center justify-center gap-2",
                      activeImg?.flipH
                        ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <FlipHorizontal className="h-4 w-4" />
                    <span>Flip Horizontal</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFlipV}
                    className={cn(
                      "p-2.5 rounded-xl border text-center font-semibold transition flex items-center justify-center gap-2",
                      activeImg?.flipV
                        ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <FlipVertical className="h-4 w-4" />
                    <span>Flip Vertical</span>
                  </button>
                </div>
              </div>

              {/* Fine-Tuning Arbitrary Angle Slider */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-blue-600" />
                    Fine-Tuning Angle:
                  </span>
                  <span className="font-mono font-bold text-blue-600">
                    {activeImg?.rotationAngle || 0}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={activeImg?.rotationAngle || 0}
                  onChange={(e) => setExactAngle(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

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
                  Images are rotated locally in your browser canvas. No photos are uploaded to any server.
                </p>
              </div>

              {/* Rotate & Save Action Button */}
              <button
                onClick={() => void handleRotateAll()}
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
                    <span>Processing Rotated Images...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="h-4 w-4" />
                    <span>Save {images.length} Rotated Image{images.length === 1 ? "" : "s"}</span>
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
