"use client";

import React, { useState, useRef, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { PDFDocument, PageSizes } from "pdf-lib";
import { toast, Toaster } from "sonner";
import {
  Camera,
  Upload,
  X,
  FileText,
  Download,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Plus,
  Trash2,
  Sliders,
  Maximize2,
  FlipHorizontal,
  Wand2,
  SunMedium,
  Check,
  Layers,
  FileDown,
  Loader2,
  VideoOff,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface ScanToPdfWorkspaceProps {
  tool: ToolDefinition;
}

export type ScanFilter = "magic_bw" | "grayscale" | "enhanced_color" | "original";

interface ScannedPage {
  id: string;
  originalDataUrl: string;
  filteredDataUrl: string;
  rotation: number;
  filter: ScanFilter;
  width: number;
  height: number;
}

export function ScanToPdfWorkspace({ tool }: ScanToPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Camera,
  };

  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Fit">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "auto">("auto");
  const [margin, setMargin] = useState<"none" | "small" | "normal">("small");
  const [globalFilter, setGlobalFilter] = useState<ScanFilter>("enhanced_color");

  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Processing & Export
  const [generating, setGenerating] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);

  // Apply Filter to an Image Data URL using an offscreen canvas
  const applyFilterToImage = (
    dataUrl: string,
    filter: ScanFilter
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);

        if (filter === "original") {
          resolve(canvas.toDataURL("image/jpeg", 0.92));
          return;
        }

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (filter === "grayscale") {
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          } else if (filter === "magic_bw") {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            // High contrast thresholding
            const val = gray > 140 ? 255 : Math.max(0, gray * 0.7);
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          } else if (filter === "enhanced_color") {
            // Contrast and saturation boost
            const factor = 1.25;
            data[i] = Math.min(255, Math.max(0, factor * (r - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (g - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (b - 128) + 128));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.src = dataUrl;
    });
  };

  // Start Camera
  const startCamera = async (facing: "environment" | "user" = cameraFacing) => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        "Camera access denied or unavailable. You can still upload images from your library below."
      );
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Toggle Camera Facing
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    void startCamera(nextFacing);
  };

  // Capture Page from Camera
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const filteredUrl = await applyFilterToImage(rawDataUrl, globalFilter);

    const newPage: ScannedPage = {
      id: Math.random().toString(36).slice(2, 9),
      originalDataUrl: rawDataUrl,
      filteredDataUrl: filteredUrl,
      rotation: 0,
      filter: globalFilter,
      width: canvas.width,
      height: canvas.height,
    };

    setPages((prev) => [...prev, newPage]);
    setActivePageIndex(pages.length);
    setResultPdfUrl(null);
    toast.success(`Page ${pages.length + 1} scanned!`);
  };

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const loadedPages: ScannedPage[] = [];

    for (const file of files) {
      if (file.size > tool.maxMb * 1024 * 1024) {
        toast.error(`${file.name} exceeds max limit of ${tool.maxMb} MB`);
        continue;
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const filteredUrl = await applyFilterToImage(dataUrl, globalFilter);

      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = dataUrl;
      });

      loadedPages.push({
        id: Math.random().toString(36).slice(2, 9),
        originalDataUrl: dataUrl,
        filteredDataUrl: filteredUrl,
        rotation: 0,
        filter: globalFilter,
        width: img.width,
        height: img.height,
      });
    }

    setPages((prev) => [...prev, ...loadedPages]);
    setResultPdfUrl(null);
    toast.success(`Added ${loadedPages.length} image(s)!`);
  };

  // Rotate Page
  const rotatePage = (index: number) => {
    setPages((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        rotation: (next[index].rotation + 90) % 360,
      };
      return next;
    });
  };

  // Change Filter on a Page
  const changePageFilter = async (index: number, newFilter: ScanFilter) => {
    const page = pages[index];
    if (!page) return;
    const newFilteredUrl = await applyFilterToImage(page.originalDataUrl, newFilter);
    setPages((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        filter: newFilter,
        filteredDataUrl: newFilteredUrl,
      };
      return next;
    });
  };

  // Reorder Pages
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    setActivePageIndex(toIndex);
  };

  // Remove Page
  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (activePageIndex >= pages.length - 1) {
      setActivePageIndex(Math.max(0, pages.length - 2));
    }
  };

  // Generate & Download PDF
  const handleGeneratePdf = async () => {
    if (pages.length === 0) {
      toast.error("Please scan or upload at least one page.");
      return;
    }

    setGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();

      for (const pageItem of pages) {
        // Prepare rotated image on canvas
        const img = new Image();
        await new Promise((res) => {
          img.onload = res;
          img.src = pageItem.filteredDataUrl;
        });

        const rot = pageItem.rotation;
        const cvs = document.createElement("canvas");
        if (rot === 90 || rot === 270) {
          cvs.width = img.height;
          cvs.height = img.width;
        } else {
          cvs.width = img.width;
          cvs.height = img.height;
        }

        const ctx = cvs.getContext("2d");
        if (ctx) {
          ctx.translate(cvs.width / 2, cvs.height / 2);
          ctx.rotate((rot * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
        }

        const rotatedJpg = cvs.toDataURL("image/jpeg", 0.92);
        const embeddedImg = await pdfDoc.embedJpg(rotatedJpg);

        // Page sizing
        let targetPageW = cvs.width;
        let targetPageH = cvs.height;

        if (pageSize === "A4") {
          targetPageW = PageSizes.A4[0];
          targetPageH = PageSizes.A4[1];
        } else if (pageSize === "Letter") {
          targetPageW = PageSizes.Letter[0];
          targetPageH = PageSizes.Letter[1];
        }

        // Handle orientation
        if (orientation === "landscape" && targetPageW < targetPageH) {
          const temp = targetPageW;
          targetPageW = targetPageH;
          targetPageH = temp;
        } else if (orientation === "portrait" && targetPageW > targetPageH) {
          const temp = targetPageW;
          targetPageW = targetPageH;
          targetPageH = temp;
        } else if (orientation === "auto") {
          if (cvs.width > cvs.height && targetPageW < targetPageH) {
            const temp = targetPageW;
            targetPageW = targetPageH;
            targetPageH = temp;
          }
        }

        const page = pdfDoc.addPage([targetPageW, targetPageH]);

        // Margins
        const marginPx = margin === "none" ? 0 : margin === "small" ? 18 : 36;
        const availW = targetPageW - marginPx * 2;
        const availH = targetPageH - marginPx * 2;

        const scale = Math.min(availW / embeddedImg.width, availH / embeddedImg.height);
        const drawW = embeddedImg.width * scale;
        const drawH = embeddedImg.height * scale;

        page.drawImage(embeddedImg, {
          x: marginPx + (availW - drawW) / 2,
          y: marginPx + (availH - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResultPdfUrl(url);

      // Auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = `scanned_document_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Scanned PDF generated and downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF document.");
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setPages([]);
    setActivePageIndex(0);
    setResultPdfUrl(null);
  };

  const Icon = theme.icon;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <Toaster position="top-center" richColors />

      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/#pdf"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to PDF Tools
        </Link>

        {pages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Start New Scan
          </button>
        )}
      </div>

      {/* Header */}
      {pages.length === 0 && !isCameraActive && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            Live Mobile Camera & Document Scanner
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

      {/* Camera Error Alert */}
      {cameraError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 flex items-center justify-between">
          <span>{cameraError}</span>
          <button
            onClick={() => setCameraError(null)}
            className="p-1 text-red-500 hover:text-red-800 dark:hover:text-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Live Camera Viewport (When camera is active) */}
      {isCameraActive && (
        <div className="mb-8 flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-950 p-4 sm:p-6 shadow-2xl text-white">
          <div className="relative w-full max-w-lg aspect-[3/4] sm:aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-zinc-800">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* Document Guide Frame Overlay */}
            <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-red-500/80 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="bg-black/60 px-3 py-1 rounded-full text-[11px] font-semibold text-zinc-200 backdrop-blur-sm">
                Align document inside frame
              </span>
            </div>

            {/* Top Camera Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition active:scale-95"
                title="Switch Camera"
              >
                <FlipHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="h-9 w-9 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-sm transition active:scale-95"
                title="Close Camera"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Shutter Button & Page Counter */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={capturePhoto}
                className="flex items-center justify-center h-16 w-16 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition active:scale-90 border-4 border-white/20"
                title="Capture Document Page"
              >
                <Camera className="h-7 w-7" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Tap shutter to scan page ({pages.length} captured so far)
            </p>
          </div>
        </div>
      )}

      {/* Initial Action Options (When 0 pages and camera closed) */}
      {pages.length === 0 && !isCameraActive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {/* Camera Scanner Trigger */}
          <button
            type="button"
            onClick={() => void startCamera()}
            className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-red-500/20 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 hover:border-red-500 transition group cursor-pointer text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform mb-3">
              <Camera className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Open Camera Scanner
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
              Use your phone or tablet camera to snap multiple document pages continuously.
            </p>
          </button>

          {/* File Upload Dropzone */}
          <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-red-500 transition group cursor-pointer text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 group-hover:scale-105 transition-transform mb-3">
              <Upload className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Upload Photos / Scans
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
              Select existing photos or scanned receipts from your photo gallery or files.
            </p>
          </label>
        </div>
      )}

      {/* Active Scanner Workspace (When pages exist) */}
      {pages.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Active Page Preview & Thumbnail Carousel */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {pages.length} Scanned Page{pages.length === 1 ? "" : "s"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Active: Page {activePageIndex + 1}</span>
                    <span>•</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold font-mono">
                      Filter: {pages[activePageIndex]?.filter.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Add Page with Camera or File */}
              <div className="flex items-center gap-2">
                {!isCameraActive && (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 transition"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Snap Page</span>
                  </button>
                )}

                <label className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5 text-red-600" />
                  <span>Add Files</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* Active Page Stage Preview */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[420px] flex flex-col items-center justify-center relative overflow-hidden select-none">
              {pages[activePageIndex] && (
                <>
                  <div className="relative rounded-lg shadow-2xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden w-full max-w-[320px] sm:max-w-[360px] h-[380px] sm:h-[430px] flex items-center justify-center">
                    <img
                      src={pages[activePageIndex].filteredDataUrl}
                      alt={`Page ${activePageIndex + 1}`}
                      style={{
                        transform: `rotate(${pages[activePageIndex].rotation}deg)`,
                      }}
                      className="w-full h-full object-contain pointer-events-none transition-transform duration-200"
                    />
                  </div>

                  {/* Page Edit Controls Bar */}
                  <div className="flex items-center gap-2 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 shadow-xs text-xs">
                    <button
                      type="button"
                      onClick={() => rotatePage(activePageIndex)}
                      className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-red-600 p-1 font-semibold transition"
                      title="Rotate 90°"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Rotate</span>
                    </button>

                    <span className="text-zinc-300 dark:text-zinc-700">|</span>

                    <button
                      type="button"
                      disabled={activePageIndex === 0}
                      onClick={() => movePage(activePageIndex, activePageIndex - 1)}
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 p-1 transition"
                      title="Move Left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Page {activePageIndex + 1} of {pages.length}
                    </span>
                    <button
                      type="button"
                      disabled={activePageIndex >= pages.length - 1}
                      onClick={() => movePage(activePageIndex, activePageIndex + 1)}
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 p-1 transition"
                      title="Move Right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <span className="text-zinc-300 dark:text-zinc-700">|</span>

                    <button
                      type="button"
                      onClick={() => removePage(activePageIndex)}
                      className="text-red-500 hover:text-red-700 p-1 transition"
                      title="Delete Page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 scrollbar-thin">
              {pages.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePageIndex(idx)}
                  className={cn(
                    "relative shrink-0 w-16 h-20 rounded-lg border-2 overflow-hidden transition",
                    activePageIndex === idx
                      ? "border-red-600 shadow-md ring-2 ring-red-500/20"
                      : "border-zinc-200 dark:border-zinc-800 opacity-70 hover:opacity-100"
                  )}
                >
                  <img
                    src={p.filteredDataUrl}
                    alt={`Thumb ${idx + 1}`}
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white rounded text-[9px] px-1 font-bold">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Scanner Filters & Output PDF Settings */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Wand2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  Document Filter Engine
                </h3>
                <p className="text-xs text-zinc-500">
                  Select color enhancements to eliminate shadows and background noise.
                </p>
              </div>

              {/* Filter Selection Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setGlobalFilter("enhanced_color");
                    if (pages[activePageIndex]) changePageFilter(activePageIndex, "enhanced_color");
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left font-semibold transition flex flex-col gap-0.5",
                    pages[activePageIndex]?.filter === "enhanced_color"
                      ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <span className="font-bold flex items-center gap-1">
                    <SunMedium className="h-3.5 w-3.5" /> Enhanced Color
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">Sharp vivid text</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGlobalFilter("magic_bw");
                    if (pages[activePageIndex]) changePageFilter(activePageIndex, "magic_bw");
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left font-semibold transition flex flex-col gap-0.5",
                    pages[activePageIndex]?.filter === "magic_bw"
                      ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <span className="font-bold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Magic B&W
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">Clear scan document</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGlobalFilter("grayscale");
                    if (pages[activePageIndex]) changePageFilter(activePageIndex, "grayscale");
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left font-semibold transition flex flex-col gap-0.5",
                    pages[activePageIndex]?.filter === "grayscale"
                      ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <span className="font-bold">Monochrome Gray</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Smooth grayscale</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGlobalFilter("original");
                    if (pages[activePageIndex]) changePageFilter(activePageIndex, "original");
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left font-semibold transition flex flex-col gap-0.5",
                    pages[activePageIndex]?.filter === "original"
                      ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <span className="font-bold">Original Photo</span>
                  <span className="text-[10px] text-zinc-400 font-normal">No filters applied</span>
                </button>
              </div>

              {/* Page Format & Margins */}
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  PDF Page Size & Layout:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(["A4", "Letter", "Fit"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPageSize(sz)}
                      className={cn(
                        "py-2 rounded-lg border text-center font-semibold transition",
                        pageSize === sz
                          ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      {sz === "Fit" ? "Auto Fit" : sz}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(["auto", "portrait", "landscape"] as const).map((ori) => (
                    <button
                      key={ori}
                      type="button"
                      onClick={() => setOrientation(ori)}
                      className={cn(
                        "py-2 rounded-lg border text-center font-semibold capitalize transition",
                        orientation === ori
                          ? "border-red-500 bg-red-50/60 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      {ori}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  100% Client-Side Privacy:
                </span>
                <p>
                  Documents are rendered directly inside your browser. No photos or scans are ever uploaded to any server.
                </p>
              </div>

              {/* Generate PDF Button */}
              <button
                onClick={() => void handleGeneratePdf()}
                disabled={generating || pages.length === 0}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (generating || pages.length === 0) && "opacity-75 cursor-not-allowed"
                )}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Compiling Scanned PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    <span>Save {pages.length} Page{pages.length === 1 ? "" : "s"} to PDF</span>
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
