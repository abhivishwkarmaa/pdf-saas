"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import { Rnd } from "react-rnd";
import {
  Upload,
  X,
  Settings,
  Crop,
  Info,
  Loader2,
  Image as ImageIcon,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  RefreshCw,
  Layers,
  FileCheck,
} from "lucide-react";
import * as img from "@/lib/client/image-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface CropImageWorkspaceProps {
  tool: ToolDefinition;
}

export function CropImageWorkspace({ tool }: CropImageWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rotation: 0, 90, 180, 270
  const [rotation, setRotation] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Original and rotated image dimension states (loaded from natural dimensions)
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [rotatedDimensions, setRotatedDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Crop coordinates (percentages 0-100)
  const [cropBox, setCropBox] = useState({ x: 15, y: 15, w: 70, h: 70 });

  // Zoom factor (default 1.0, ranges from 0.5 to 2.0)
  const [zoom, setZoom] = useState(1.0);

  // Aspect ratio state
  const [aspectRatioMode, setAspectRatioMode] = useState<"free" | "1:1" | "4:3" | "16:9">("free");

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Load preview URL and measure size once
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setNaturalDimensions({ width: 0, height: 0 });
      setBaseSize({ width: 0, height: 0 });
      return;
    }

    const currentFile = file;
    const url = URL.createObjectURL(currentFile);
    setPreviewUrl(url);

    const imgEl = new Image();
    imgEl.onload = () => {
      setNaturalDimensions({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
    };
    imgEl.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Compute rotated dimensions for show
  useEffect(() => {
    if (naturalDimensions.width === 0) return;
    const isSwapped = rotation === 90 || rotation === 270;
    setRotatedDimensions({
      width: isSwapped ? naturalDimensions.height : naturalDimensions.width,
      height: isSwapped ? naturalDimensions.width : naturalDimensions.height,
    });
  }, [naturalDimensions, rotation]);

  const isSwapped = rotation === 90 || rotation === 270;
  const imageSize = {
    width: isSwapped ? baseSize.height : baseSize.width,
    height: isSwapped ? baseSize.width : baseSize.height,
  };

  // Update rendered image size for react-rnd mapping
  const handleImageLoad = () => {
    if (imageRef.current) {
      setBaseSize({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    handleImageLoad();
  }, [previewUrl, zoom, rotation]);

  // Helper to convert crop percentages to pixels
  const getPixelBox = () => {
    return {
      x: (cropBox.x / 100) * imageSize.width,
      y: (cropBox.y / 100) * imageSize.height,
      width: (cropBox.w / 100) * imageSize.width,
      height: (cropBox.h / 100) * imageSize.height,
    };
  };

  // Convert pixels back to percentages
  const handleRndDragStop = (d: { x: number; y: number }) => {
    if (imageSize.width === 0 || imageSize.height === 0) return;
    const newX = Math.round((d.x / imageSize.width) * 100);
    const newY = Math.round((d.y / imageSize.height) * 100);
    setCropBox((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(100 - prev.w, newX)),
      y: Math.max(0, Math.min(100 - prev.h, newY)),
    }));
  };

  const handleRndResizeStop = (
    ref: HTMLElement,
    position: { x: number; y: number }
  ) => {
    if (imageSize.width === 0 || imageSize.height === 0) return;
    const newW = Math.round((ref.offsetWidth / imageSize.width) * 100);
    const newH = Math.round((ref.offsetHeight / imageSize.height) * 100);
    const newX = Math.round((position.x / imageSize.width) * 100);
    const newY = Math.round((position.y / imageSize.height) * 100);

    setCropBox({
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
      w: Math.max(5, Math.min(100 - newX, newW)),
      h: Math.max(5, Math.min(100 - newY, newH)),
    });
  };

  // Lock Ratio Resolver
  const getAspectRatioValue = () => {
    if (aspectRatioMode === "1:1") return 1;
    if (aspectRatioMode === "4:3") return 4 / 3;
    if (aspectRatioMode === "16:9") return 16 / 9;
    return undefined;
  };

  // Apply Ratio presets
  useEffect(() => {
    const ratio = getAspectRatioValue();
    if (ratio) {
      setCropBox((prev) => {
        let targetW = prev.w;
        let targetH = Math.round(prev.w / ratio);
        if (prev.y + targetH > 100) {
          targetH = 100 - prev.y;
          targetW = Math.round(targetH * ratio);
        }
        return { ...prev, w: targetW, h: targetH };
      });
    }
  }, [aspectRatioMode]);

  // Rotates current preview
  const rotateCurrentPage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const processCrop = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const croppedBlob = await img.cropImage(file, {
        xPercent: cropBox.x,
        yPercent: cropBox.y,
        widthPercent: cropBox.w,
        heightPercent: cropBox.h,
        rotation: rotation,
      });

      const extension = file.name.split(".").pop() || "png";
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      
      const url = URL.createObjectURL(croppedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}_cropped.${extension}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Successfully cropped and formatted Image!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to process crop operation");
    } finally {
      setProcessing(false);
    }
  };

  const pixelBox = getPixelBox();
  const currentSize = rotatedDimensions.width > 0 ? rotatedDimensions : null;

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="image-workspace-theme-wrapper flex lg:h-[calc(100vh-140px)] lg:min-h-[550px] min-h-[680px] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white lg:flex-row">
        
        {/* LEFT SIDEBAR: Image Preview card */}
        {file && (
          <div className="w-full bg-zinc-50/80 border-b border-zinc-200 lg:w-48 lg:border-b-0 lg:border-r lg:border-zinc-200 dark:bg-zinc-950/80 dark:border-zinc-900 flex flex-col shrink-0 lg:h-full">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Source Image
              </span>
            </div>
            
            <div className="flex flex-row lg:flex-col flex-1 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-4 gap-3 max-h-36 lg:max-h-none scrollbar-thin">
              <button
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border shrink-0 bg-blue-50 border-blue-500/30 dark:bg-blue-950/5 dark:border-blue-500/50 shadow-md shadow-blue-500/5"
              >
                <span className="text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400">
                  IMAGE
                </span>
                
                <div className="w-20 h-28 bg-zinc-150 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden relative">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Thumbnail"
                      className="max-w-full max-h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <FileCheck className="h-5 w-5 text-zinc-400 dark:text-zinc-800 animate-pulse" />
                  )}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* CENTER VIEWPORT: Large Preview & Rnd Crop Selector */}
        <div className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-[radial-gradient(ellipse_at_top,rgba(20,20,25,0.7),rgba(9,9,11,1))] relative lg:h-full overflow-hidden">
          {/* Grid Backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {!file ? (
            <div className="flex w-full max-w-xl flex-col items-center justify-center p-12 my-auto z-10">
              <label className="group flex w-full cursor-pointer flex-col items-center gap-6 rounded-3xl border border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/10 backdrop-blur-md px-6 py-20 transition-all duration-300 hover:border-blue-500/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/30">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:border-blue-500/20">
                  <Upload className="h-7 w-7 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                </span>
                <span className="text-center">
                  <p className="text-sm font-bold text-zinc-650 dark:text-zinc-300 group-hover:text-zinc-800 dark:group-hover:text-zinc-100 transition-colors">
                    Upload an Image to begin cropping
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Max size {tool.maxMb} MB · Pure client-side canvas rendering
                  </p>
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files[0]) {
                      setFile(files[0]);
                      setRotation(0);
                    }
                  }}
                />
              </label>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="w-full p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 z-10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="max-w-[200px] truncate text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    {file.name}
                  </span>
                </div>
                
                <button
                  onClick={() => {
                    setFile(null);
                    setRotation(0);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 px-3.5 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-red-50 hover:border-red-500/30 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:border-red-500/30 dark:hover:text-red-400 transition-all duration-200 shadow-sm cursor-pointer"
                >
                  <X className="h-4 w-4" /> Clear File
                </button>
              </div>

              {/* Viewport Frame (Scrollable Body) */}
              <div className="flex-1 w-full flex items-center justify-center relative z-10 overflow-auto scrollbar-thin p-8">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Rendering preview canvas...</p>
                  </div>
                ) : error ? (
                  <div className="text-center">
                    <p className="text-sm text-red-500 font-semibold">{error}</p>
                    <button
                      onClick={() => setFile(null)}
                      className="mt-3 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white underline"
                    >
                      Choose another file
                    </button>
                  </div>
                ) : (
                  previewUrl && (
                    <div
                      ref={containerRef}
                      className="relative select-none shadow-2xl rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-900"
                      style={{
                        width: imageSize.width || "auto",
                        height: imageSize.height || "auto",
                        transform: `scale(${zoom})`,
                        transition: "transform 0.2s ease-out",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={imageRef}
                        src={previewUrl}
                        alt="Preview"
                        onLoad={handleImageLoad}
                        className={cn(
                          "max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-280px)] min-h-[300px] w-auto object-contain",
                          baseSize.width > 0 && "absolute"
                        )}
                        style={
                          baseSize.width > 0
                            ? {
                                top: "50%",
                                left: "50%",
                                width: baseSize.width,
                                height: baseSize.height,
                                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                              }
                            : {}
                        }
                        draggable={false}
                      />

                      {/* Rotate Icon directly on the image */}
                      {baseSize.width > 0 && (
                        <button
                          onClick={rotateCurrentPage}
                          className="absolute top-3 right-3 z-30 p-2 bg-white/80 hover:bg-blue-650 border border-zinc-200 rounded-full text-zinc-700 hover:text-white transition-all shadow-lg hover:scale-110 active:scale-95 cursor-pointer dark:bg-zinc-950/80 dark:hover:bg-blue-600 dark:border-zinc-800 dark:text-zinc-300"
                          title="Rotate Image"
                        >
                          <RotateCw className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400 hover:text-white" />
                        </button>
                      )}

                      {/* Dark Overlay Mask */}
                      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

                      {/* Rnd Crop Selector */}
                      {imageSize.width > 0 && (
                        <Rnd
                          bounds="parent"
                          lockAspectRatio={getAspectRatioValue()}
                          size={{ width: pixelBox.width, height: pixelBox.height }}
                          position={{ x: pixelBox.x, y: pixelBox.y }}
                          onDragStop={(_, d) => handleRndDragStop(d)}
                          onResizeStop={(_, __, ref, ___, pos) => handleRndResizeStop(ref, pos)}
                          className="border-2 border-blue-500 bg-blue-500/5 shadow-[0_0_0_9999px_rgba(9,9,11,0.6)] rounded"
                          style={{
                            boxShadow: "0 0 20px rgba(59, 130, 246, 0.25), 0 0 0 9999px rgba(9,9,11,0.65)",
                          }}
                        >
                          {/* Inner dashed grid lines */}
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-b border-white" />
                            <div className="border-r border-white" />
                            <div className="border-r border-white" />
                            <div />
                          </div>

                          {/* Interactive corner indicator dots */}
                          {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => {
                            const cornerClass = {
                              "top-left": "-left-1.5 -top-1.5",
                              "top-right": "-right-1.5 -top-1.5",
                              "bottom-left": "-left-1.5 -bottom-1.5",
                              "bottom-right": "-right-1.5 -bottom-1.5",
                            }[corner];
                            return (
                              <div
                                key={corner}
                                className={cn(
                                  "absolute h-3 w-3 rounded-full border border-white bg-blue-500 shadow-md ring-2 ring-blue-500/20",
                                  cornerClass
                                )}
                              />
                            );
                          })}

                          {/* Dimension tool-tip */}
                          <div className="absolute bottom-2.5 right-2.5 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 border border-zinc-200 dark:border-zinc-800 pointer-events-none shadow-sm">
                            {cropBox.w}% × {cropBox.h}%
                          </div>
                        </Rnd>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Toolbar Zoom & Rotate Controls (Fixed Footer) */}
              <div className="w-full p-4 border-t border-zinc-250 dark:border-zinc-900 flex items-center justify-center bg-white/40 dark:bg-zinc-950/40 backdrop-blur-sm shrink-0 z-10">
                <div className="flex items-center gap-4 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-zinc-250 dark:border-zinc-800 shadow-lg">
                  <div className="flex items-center gap-2 border-r border-zinc-250 dark:border-zinc-900 pr-4">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-all cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4.5 w-4.5" />
                    </button>
                    <span className="text-[10px] font-bold font-mono text-zinc-600 dark:text-zinc-400 w-10 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((z) => Math.min(2.0, z + 0.25))}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-all cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  <button
                    onClick={rotateCurrentPage}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="h-4 w-4 text-blue-500" />
                    <span>Rotate Image</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT SIDEBAR: Settings & Operations Panel */}
        <div className="w-full bg-white border-t border-zinc-200 lg:w-80 lg:border-t-0 lg:border-l lg:border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 flex flex-col z-20 lg:h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-4">
              <Settings className="h-4 w-4 text-blue-500" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
                Crop Settings
              </h2>
            </div>

            {/* Coordinates & Aspect Ratio Presets */}
            <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/10 p-4">
              
              {/* Aspect Ratio Lock Presets */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 flex items-center gap-1">
                  {aspectRatioMode === "free" ? (
                    <Unlock className="h-3.5 w-3.5 text-zinc-500" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-blue-500" />
                  )}
                  <span>Aspect Ratio</span>
                </span>
                
                <div className="grid grid-cols-2 gap-1.5">
                  {(["free", "1:1", "4:3", "16:9"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAspectRatioMode(mode)}
                      className={cn(
                        "py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-200 cursor-pointer",
                        aspectRatioMode === mode
                          ? "bg-blue-50 dark:bg-blue-950/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                          : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:bg-zinc-950 dark:border-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-800 dark:hover:text-zinc-300"
                      )}
                    >
                      {mode === "free" ? "Free" : mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual fine-tuning coordinates */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-900">
                {[
                  { label: "Left (X)", key: "x" as const },
                  { label: "Top (Y)", key: "y" as const },
                  { label: "Width", key: "w" as const },
                  { label: "Height", key: "h" as const },
                ].map((coord) => (
                  <div key={coord.key} className="space-y-1">
                    <label className="text-[9px] text-zinc-550 dark:text-zinc-500 font-semibold block">{coord.label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={!file}
                        value={cropBox[coord.key]}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                          setCropBox((prev) => {
                            const next = { ...prev, [coord.key]: val };
                            if (coord.key === "x" && next.x + next.w > 100) next.w = 100 - next.x;
                            if (coord.key === "y" && next.y + next.h > 100) next.h = 100 - next.y;
                            if (coord.key === "w" && next.x + next.w > 100) next.x = 100 - next.w;
                            if (coord.key === "h" && next.y + next.h > 100) next.y = 100 - next.h;
                            return next;
                          });
                        }}
                        className="w-full bg-white border border-zinc-200 rounded-xl pl-2 pr-6 py-2 text-xs text-zinc-800 dark:bg-zinc-950 dark:border-zinc-900 dark:text-zinc-300 font-bold font-mono focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all disabled:opacity-40"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-500 dark:text-zinc-600">%</span>
                    </div>
                  </div>
                ))}
              </div>

              {file && currentSize && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2.5 border border-zinc-200 dark:border-zinc-900 flex items-start gap-2 text-[10px] text-zinc-650 dark:text-zinc-400">
                  <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    Dimensions: <span className="font-mono text-zinc-500">{Math.round(currentSize.width)}×{Math.round(currentSize.height)} px</span>
                    <br />
                    Cropped: <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{Math.round((cropBox.w / 100) * currentSize.width)}×{Math.round((cropBox.h / 100) * currentSize.height)} px</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-900 space-y-3 shrink-0">
            {file && (
              <button
                onClick={() => {
                  setCropBox({ x: 15, y: 15, w: 70, h: 70 });
                  setAspectRatioMode("free");
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-900 py-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
                Reset Crop Area
              </button>
            )}

            <button
              onClick={processCrop}
              disabled={!file || processing}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 cursor-pointer",
                theme.button
              )}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Crop...
                </>
              ) : (
                <>
                  <Crop className="h-4 w-4" />
                  Crop Image File
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
