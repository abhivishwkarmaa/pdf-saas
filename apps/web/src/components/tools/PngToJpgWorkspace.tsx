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
  Sliders,
  Palette,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface PngToJpgWorkspaceProps {
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

export function PngToJpgWorkspace({ tool }: PngToJpgWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20",
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    icon: FileType,
  };

  const [images, setImages] = useState<ConvertItem[]>([]);
  const [quality, setQuality] = useState<number>(92);
  const [bgFill, setBgFill] = useState<"white" | "black">("white");

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
    toast.success(`Added ${newItems.length} PNG image(s)!`);
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

  // Convert single PNG to JPG using canvas
  const convertSinglePngToJpg = (
    item: ConvertItem,
    qualityPercent: number,
    fillColor: "white" | "black"
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }

        // Fill background color for transparent PNGs
        ctx.fillStyle = fillColor === "white" ? "#ffffff" : "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("JPG conversion failed"));
          },
          "image/jpeg",
          qualityPercent / 100
        );
      };
      img.onerror = () => reject(new Error("Failed to load source PNG"));
      img.src = item.previewUrl;
    });
  };

  // Batch convert all PNGs to JPG
  const handleConvertAll = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one PNG image.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Converting PNG images to JPG... 0%");

    try {
      const updated: ConvertItem[] = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setStatusMessage(`Converting image ${i + 1} of ${images.length} to JPG...`);
        const convertedBlob = await convertSinglePngToJpg(item, quality, bgFill);

        updated.push({
          ...item,
          convertedBlob,
          convertedSize: convertedBlob.size,
        });
      }

      setImages(updated);
      setIsConverted(true);
      toast.success("All PNGs converted to JPG successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert one or more PNG images.");
    } finally {
      setProcessing(false);
    }
  };

  // Download single JPG
  const downloadSingleJpg = (item: ConvertItem) => {
    if (!item.convertedBlob) return;
    const url = URL.createObjectURL(item.convertedBlob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = item.file.name.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all as ZIP
  const downloadAllAsZip = async () => {
    if (!isConverted || images.length === 0) return;

    if (images.length === 1 && images[0].convertedBlob) {
      downloadSingleJpg(images[0]);
      return;
    }

    setProcessing(true);
    setStatusMessage("Bundling converted JPG files into ZIP archive...");

    try {
      const zip = new JSZip();
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (item.convertedBlob) {
          const baseName = item.file.name.replace(/\.[^/.]+$/, "");
          zip.file(`${baseName}.jpg`, item.convertedBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converted_jpgs_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Downloaded all JPGs as ZIP!");
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
            Convert Other PNGs
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
            PNG to JPEG / JPG Converter
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
            accept=".png,image/png"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={handleFileUpload}
          />
          <span className="upload-icon-container group-hover:scale-105 transition-transform">
            <FileType className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag PNG images here to convert to JPG
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Compress heavy PNG graphics into standard lightweight JPG photos.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max {tool.maxFiles} images · Up to {tool.maxMb} MB each · 100% Client-Side
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Image Batch Gallery Grid */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {images.length} PNG Image{images.length === 1 ? "" : "s"} Loaded
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Total: {totalOriginalMb} MB
                    </span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                      Target: JPEG (.jpg)
                    </span>
                  </div>
                </div>
              </div>

              {/* Add More Images Button */}
              {images.length < tool.maxFiles && (
                <label className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  <span>Add PNGs</span>
                  <input
                    type="file"
                    multiple
                    accept=".png,image/png"
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
                      PNGs Converted to JPG!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        JPG Ready
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Reduced file size with standard JPEG compression.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => void downloadAllAsZip()}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  {images.length > 1 ? "Download All (ZIP)" : "Download JPG"}
                </button>
              </div>
            )}

            {/* Image Gallery Cards */}
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

                  {/* Thumbnail */}
                  <div className="w-full h-36 rounded-lg bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center relative">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      PNG
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
                            → {(item.convertedSize / 1024).toFixed(0)} KB JPG
                          </span>
                        )}
                      </p>
                    </div>

                    {item.convertedBlob && (
                      <button
                        type="button"
                        onClick={() => downloadSingleJpg(item)}
                        className="flex items-center gap-1 rounded-lg bg-zinc-100 hover:bg-blue-600 hover:text-white dark:bg-zinc-900 dark:hover:bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition"
                        title="Download JPG"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Save JPG</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: JPG Quality & Settings */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  JPG Output Settings
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure output quality and background fill for transparent PNGs.
                </p>
              </div>

              {/* Quality Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>JPG Quality:</span>
                  <span className="font-mono text-blue-600 text-sm">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Smaller File (30%)</span>
                  <span>Recommended (92%)</span>
                  <span>Maximum (100%)</span>
                </div>
              </div>

              {/* Transparency Fill Color */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-blue-600" />
                  Transparency Background Fill:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBgFill("white")}
                    className={cn(
                      "p-2.5 rounded-xl border font-semibold transition flex items-center justify-center gap-2",
                      bgFill === "white"
                        ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <span className="h-3.5 w-3.5 rounded-full bg-white border border-zinc-300 shadow-xs" />
                    <span>White Background</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgFill("black")}
                    className={cn(
                      "p-2.5 rounded-xl border font-semibold transition flex items-center justify-center gap-2",
                      bgFill === "black"
                        ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <span className="h-3.5 w-3.5 rounded-full bg-black border border-zinc-700 shadow-xs" />
                    <span>Black Background</span>
                  </button>
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  100% Client-Side Privacy:
                </span>
                <p>
                  Images are converted locally in your browser canvas. No files are uploaded to any server.
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
                    <span>Converting to JPG...</span>
                  </>
                ) : (
                  <>
                    <FileType className="h-4 w-4" />
                    <span>Convert {images.length} PNG{images.length === 1 ? "" : "s"} to JPG</span>
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
