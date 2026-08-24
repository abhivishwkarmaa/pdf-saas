"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  Crop,
  Loader2,
  Image as ImageIcon,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  FileCheck,
  ArrowLeft,
  Sliders,
  Maximize2,
  Check,
  ShieldCheck,
  Download,
  FlipHorizontal,
  FlipVertical,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface CropImageWorkspaceProps {
  tool: ToolDefinition;
}

interface CropBox {
  x: number; // Left % (0 - 100)
  y: number; // Top % (0 - 100)
  w: number; // Width % (0 - 100)
  h: number; // Height % (0 - 100)
}

const ASPECT_PRESETS = [
  { name: "Freeform", ratio: null, label: "Custom" },
  { name: "Square", ratio: 1 / 1, label: "1:1" },
  { name: "Story / Reel", ratio: 9 / 16, label: "9:16" },
  { name: "YouTube / HD", ratio: 16 / 9, label: "16:9" },
  { name: "Standard", ratio: 4 / 3, label: "4:3" },
  { name: "DSLR Photo", ratio: 3 / 2, label: "3:2" },
];

export function CropImageWorkspace({ tool }: CropImageWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20",
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    icon: Crop,
  };

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);

  // Rotation & Flipping
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Crop Coordinates in Percentages
  const [cropBox, setCropBox] = useState<CropBox>({ x: 10, y: 10, w: 80, h: 80 });
  const [activeAspect, setActiveAspect] = useState<number | null>(null);

  // Zoom & View
  const [zoom, setZoom] = useState(1.0);
  const [outputFormat, setOutputFormat] = useState<"auto" | "webp" | "jpeg" | "png">("auto");
  const [quality, setQuality] = useState<number>(92);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Canvas & Stage references
  const stageRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef<string | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; box: CropBox }>({
    startX: 0,
    startY: 0,
    box: { x: 0, y: 0, w: 0, h: 0 },
  });

  // Load preview and natural dimensions
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setNaturalWidth(0);
      setNaturalHeight(0);
      setResultBlob(null);
      setResultUrl(null);
      return;
    }

    const currentFile = file;
    const url = URL.createObjectURL(currentFile);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      setNaturalWidth(img.naturalWidth);
      setNaturalHeight(img.naturalHeight);
      setCropBox({ x: 10, y: 10, w: 80, h: 80 });
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > tool.maxMb * 1024 * 1024) {
        toast.error(`File exceeds maximum size of ${tool.maxMb} MB`);
        return;
      }
      setFile(selected);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setResultBlob(null);
      setResultUrl(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCropBox({ x: 10, y: 10, w: 80, h: 80 });
    setResultBlob(null);
    setResultUrl(null);
  };

  // Apply Aspect Ratio Preset
  const applyAspectRatio = (ratio: number | null) => {
    setActiveAspect(ratio);
    if (!ratio) return;

    setCropBox((prev) => {
      const currentRatio = (prev.w * (naturalWidth || 1)) / (prev.h * (naturalHeight || 1));
      let newW = prev.w;
      let newH = prev.h;

      if (currentRatio > ratio) {
        newW = Math.min(100, Math.max(10, (prev.h * (naturalHeight || 1) * ratio) / (naturalWidth || 1)));
      } else {
        newH = Math.min(100, Math.max(10, (prev.w * (naturalWidth || 1)) / (ratio * (naturalHeight || 1))));
      }

      const newX = Math.min(100 - newW, Math.max(0, prev.x));
      const newY = Math.min(100 - newH, Math.max(0, prev.y));

      return { x: newX, y: newY, w: newW, h: newH };
    });
    toast.success("Applied aspect ratio!");
  };

  // ----------------------------------------------------
  // TOUCH & POINTER EVENT HANDLERS (Native Touch Engine)
  // ----------------------------------------------------
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      box: { ...cropBox },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerDownResize = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    isResizingRef.current = handle;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      box: { ...cropBox },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stageRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) return;

    const deltaXPercent = ((e.clientX - dragStartRef.current.startX) / stageRect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartRef.current.startY) / stageRect.height) * 100;
    const initial = dragStartRef.current.box;

    if (isDraggingRef.current) {
      let newX = Math.max(0, Math.min(100 - initial.w, initial.x + deltaXPercent));
      let newY = Math.max(0, Math.min(100 - initial.h, initial.y + deltaYPercent));
      setCropBox({ ...initial, x: newX, y: newY });
    } else if (isResizingRef.current) {
      const handle = isResizingRef.current;
      let newX = initial.x;
      let newY = initial.y;
      let newW = initial.w;
      let newH = initial.h;

      if (handle.includes("e")) {
        newW = Math.max(5, Math.min(100 - initial.x, initial.w + deltaXPercent));
      }
      if (handle.includes("s")) {
        newH = Math.max(5, Math.min(100 - initial.y, initial.h + deltaYPercent));
      }
      if (handle.includes("w")) {
        const potentialW = initial.w - deltaXPercent;
        if (potentialW >= 5 && initial.x + deltaXPercent >= 0) {
          newX = initial.x + deltaXPercent;
          newW = potentialW;
        }
      }
      if (handle.includes("n")) {
        const potentialH = initial.h - deltaYPercent;
        if (potentialH >= 5 && initial.y + deltaYPercent >= 0) {
          newY = initial.y + deltaYPercent;
          newH = potentialH;
        }
      }

      // Maintain aspect ratio if locked
      if (activeAspect && (naturalWidth > 0 && naturalHeight > 0)) {
        if (handle.includes("e") || handle.includes("w")) {
          newH = (newW * naturalWidth) / (activeAspect * naturalHeight);
          if (newY + newH > 100) {
            newH = 100 - newY;
            newW = (newH * activeAspect * naturalHeight) / naturalWidth;
          }
        } else if (handle.includes("n") || handle.includes("s")) {
          newW = (newH * activeAspect * naturalHeight) / naturalWidth;
          if (newX + newW > 100) {
            newW = 100 - newX;
            newH = (newW * naturalWidth) / (activeAspect * naturalHeight);
          }
        }
      }

      setCropBox({
        x: Math.max(0, Math.min(100, newX)),
        y: Math.max(0, Math.min(100, newY)),
        w: Math.max(5, Math.min(100 - newX, newW)),
        h: Math.max(5, Math.min(100 - newY, newH)),
      });
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    isResizingRef.current = null;
  };

  // Perform Client-Side Canvas Cropping
  const handlePerformCrop = async () => {
    if (!file || !previewUrl) return;

    setProcessing(true);
    try {
      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = previewUrl;
      });

      // 1. Calculate actual crop coordinates on the source image
      const srcX = (cropBox.x / 100) * img.naturalWidth;
      const srcY = (cropBox.y / 100) * img.naturalHeight;
      const srcW = (cropBox.w / 100) * img.naturalWidth;
      const srcH = (cropBox.h / 100) * img.naturalHeight;

      // 2. Offscreen canvas for rotated/flipped crop
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const targetW = isRotated90or270 ? srcH : srcW;
      const targetH = isRotated90or270 ? srcW : srcH;

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(targetW));
      canvas.height = Math.max(1, Math.round(targetH));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Transform matrix (translation, rotation, flipping)
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcW,
        srcH,
        -srcW / 2,
        -srcH / 2,
        srcW,
        srcH
      );

      let mimeType = file.type || "image/jpeg";
      if (outputFormat === "webp") mimeType = "image/webp";
      else if (outputFormat === "jpeg") mimeType = "image/jpeg";
      else if (outputFormat === "png") mimeType = "image/png";

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setResultUrl(url);

            // Auto download
            const a = document.createElement("a");
            a.href = url;
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const ext =
              outputFormat === "webp"
                ? "webp"
                : outputFormat === "jpeg"
                ? "jpg"
                : outputFormat === "png"
                ? "png"
                : file.name.split(".").pop() || "jpg";
            a.download = `${baseName}_cropped.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            toast.success("Image cropped and saved!");
          } else {
            toast.error("Failed to export cropped image.");
          }
          setProcessing(false);
        },
        mimeType,
        mimeType === "image/png" ? undefined : quality / 100
      );
    } catch (err) {
      console.error(err);
      toast.error("Error cropping image.");
      setProcessing(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const ext =
      outputFormat === "webp"
        ? "webp"
        : outputFormat === "jpeg"
        ? "jpg"
        : outputFormat === "png"
        ? "png"
        : file.name.split(".").pop() || "jpg";
    a.download = `${baseName}_cropped.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Downloaded cropped image!");
  };

  // Dimensions computation
  const calcOutputW = naturalWidth > 0 ? Math.round((cropBox.w / 100) * naturalWidth) : 0;
  const calcOutputH = naturalHeight > 0 ? Math.round((cropBox.h / 100) * naturalHeight) : 0;
  const originalSizeMb = file ? (file.size / (1024 * 1024)).toFixed(2) : "0";

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

        {file && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Crop Another Image
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
            Touch-Native Image Trimmer & Framing
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
        <label className="upload-dropzone upload-dropzone-image w-full relative group cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={handleFileChange}
          />
          <span className="upload-icon-container group-hover:scale-105 transition-transform">
            <Crop className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag an image here to crop
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Crop with custom framing, Rule-of-Thirds grid, and social aspect ratios.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max file size: {tool.maxMb} MB · 100% Private in Browser
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {file && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Visual Touch Crop Stage */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs truncate">
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                      {naturalWidth} × {naturalHeight} px
                    </span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                      Crop: {calcOutputW} × {calcOutputH} px
                    </span>
                  </div>
                </div>
              </div>

              {/* Rotate & Flip Controls */}
              <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded text-zinc-700 dark:text-zinc-300 hover:text-blue-600 transition"
                  title="Rotate 90°"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFlipH((f) => !f)}
                  className={cn(
                    "p-1.5 rounded transition",
                    flipH ? "bg-blue-600 text-white" : "text-zinc-700 dark:text-zinc-300 hover:text-blue-600"
                  )}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV((f) => !f)}
                  className={cn(
                    "p-1.5 rounded transition",
                    flipV ? "bg-blue-600 text-white" : "text-zinc-700 dark:text-zinc-300 hover:text-blue-600"
                  )}
                  title="Flip Vertical"
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Cropped Success Result Banner */}
            {resultBlob && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      Image Cropped Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Saved
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Exported at {calcOutputW} × {calcOutputH} px.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadAgain}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Again
                </button>
              </div>
            )}

            {/* VISUAL CROP CANVAS STAGE */}
            <div
              className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[420px] flex flex-col items-center justify-center relative overflow-hidden select-none"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {previewUrl && (
                <div
                  ref={stageRef}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    touchAction: "none",
                  }}
                  className="relative rounded-lg shadow-2xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden max-w-full max-h-[460px] flex items-center justify-center"
                >
                  {/* Image Display */}
                  <img
                    src={previewUrl}
                    alt="Source"
                    style={{
                      transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                    }}
                    className="max-w-[320px] sm:max-w-[420px] max-h-[420px] w-auto h-auto object-contain pointer-events-none block"
                  />

                  {/* Darkened Semi-Transparent Backdrop Overlay outside crop */}
                  <div className="absolute inset-0 pointer-events-none bg-black/45" />

                  {/* THE INTERACTIVE CROP BOX */}
                  <div
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.w}%`,
                      height: `${cropBox.h}%`,
                      touchAction: "none",
                    }}
                    className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] cursor-move group"
                    onPointerDown={handlePointerDownDrag}
                  >
                    {/* Rule-of-Thirds 3x3 Composition Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-60">
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-r border-white/60" />
                      <div className="border-r border-white/60" />
                      <div />
                    </div>

                    {/* Dimensions Pill Badge in Center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-md">
                      {calcOutputW} × {calcOutputH} px
                    </div>

                    {/* OVERSIZED TOUCH RESIZE HANDLERS (36px Touch Areas) */}
                    {/* Top-Left */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize("nw", e)}
                      className="absolute -top-3.5 -left-3.5 w-9 h-9 flex items-center justify-center cursor-nwse-resize z-20"
                    >
                      <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                    </div>

                    {/* Top-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize("ne", e)}
                      className="absolute -top-3.5 -right-3.5 w-9 h-9 flex items-center justify-center cursor-nesw-resize z-20"
                    >
                      <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                    </div>

                    {/* Bottom-Left */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize("sw", e)}
                      className="absolute -bottom-3.5 -left-3.5 w-9 h-9 flex items-center justify-center cursor-nesw-resize z-20"
                    >
                      <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                    </div>

                    {/* Bottom-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize("se", e)}
                      className="absolute -bottom-3.5 -right-3.5 w-9 h-9 flex items-center justify-center cursor-nwse-resize z-20"
                    >
                      <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                    </div>

                    {/* Middle Edges */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize("n", e)}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center cursor-ns-resize z-20"
                    >
                      <div className="w-4 h-1.5 bg-blue-600 rounded-full border border-white" />
                    </div>
                    <div
                      onPointerDown={(e) => handlePointerDownResize("s", e)}
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center cursor-ns-resize z-20"
                    >
                      <div className="w-4 h-1.5 bg-blue-600 rounded-full border border-white" />
                    </div>
                    <div
                      onPointerDown={(e) => handlePointerDownResize("w", e)}
                      className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-8 flex items-center justify-center cursor-ew-resize z-20"
                    >
                      <div className="w-1.5 h-4 bg-blue-600 rounded-full border border-white" />
                    </div>
                    <div
                      onPointerDown={(e) => handlePointerDownResize("e", e)}
                      className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-8 flex items-center justify-center cursor-ew-resize z-20"
                    >
                      <div className="w-1.5 h-4 bg-blue-600 rounded-full border border-white" />
                    </div>
                  </div>
                </div>
              )}

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
          </div>

          {/* Right Column: Aspect Ratio Presets & Output Settings */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Crop className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Aspect Ratio Presets
                </h3>
                <p className="text-xs text-zinc-500">
                  Select standard photo & social framing ratios.
                </p>
              </div>

              {/* Aspect Ratio Cards Grid */}
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {ASPECT_PRESETS.map((pst, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyAspectRatio(pst.ratio)}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-0.5",
                      activeAspect === pst.ratio
                        ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-bold"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 font-semibold"
                    )}
                  >
                    <span className="text-[11px] truncate">{pst.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono font-normal">
                      {pst.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* 4-Side Fine-Tuning Margin Sliders */}
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-600" />
                  Fine-Tuning Margin Offsets (%):
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-1">Left ({Math.round(cropBox.x)}%):</span>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={cropBox.x}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCropBox((p) => ({ ...p, x: val, w: Math.min(p.w, 100 - val) }));
                      }}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div>
                    <span className="text-zinc-500 block mb-1">Top ({Math.round(cropBox.y)}%):</span>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={cropBox.y}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCropBox((p) => ({ ...p, y: val, h: Math.min(p.h, 100 - val) }));
                      }}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div>
                    <span className="text-zinc-500 block mb-1">Width ({Math.round(cropBox.w)}%):</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={cropBox.w}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCropBox((p) => ({ ...p, w: Math.min(val, 100 - p.x) }));
                      }}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div>
                    <span className="text-zinc-500 block mb-1">Height ({Math.round(cropBox.h)}%):</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={cropBox.h}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCropBox((p) => ({ ...p, h: Math.min(val, 100 - p.y) }));
                      }}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
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
                  Images are trimmed and cropped directly in your browser canvas. No photos are uploaded to any server.
                </p>
              </div>

              {/* Crop & Save Action Button */}
              <button
                onClick={() => void handlePerformCrop()}
                disabled={processing || !file}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || !file) && "opacity-75 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Exporting Cropped Image...</span>
                  </>
                ) : (
                  <>
                    <Crop className="h-4 w-4" />
                    <span>Crop & Save Image ({calcOutputW} × {calcOutputH} px)</span>
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
