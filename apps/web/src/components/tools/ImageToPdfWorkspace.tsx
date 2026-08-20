"use client";

import React, { useState, useMemo } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Trash2,
  Plus,
  ZoomIn,
  RefreshCw,
  FileCheck,
  Layout,
  Maximize2,
  Sliders,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface ImageToPdfWorkspaceProps {
  tool: ToolDefinition;
}

interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
  width?: number;
  height?: number;
}

type PageOrientation = "portrait" | "landscape" | "auto";
type PageSize = "a4" | "letter" | "fit";
type MarginSize = "none" | "small" | "big";

export function ImageToPdfWorkspace({ tool }: ImageToPdfWorkspaceProps) {
  const isImageCategory = tool.category === "image";
  const isJpgTool = tool.slug === "jpg-to-pdf";
  const isPngTool = tool.slug === "png-to-pdf";

  // Category Theme
  const theme = CATEGORY_THEME[tool.category] || (isImageCategory
    ? {
        button: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20",
        accent: "text-blue-600 dark:text-blue-400",
        accentBg: "bg-blue-500/10",
        accentBorder: "border-blue-500/20",
        icon: ImageIcon,
      }
    : {
        button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
        accent: "text-red-600 dark:text-red-400",
        accentBg: "bg-red-500/10",
        accentBorder: "border-red-500/20",
        icon: ImageIcon,
      });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Layout settings
  const [orientation, setOrientation] = useState<PageOrientation>("auto");
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<MarginSize>("none");
  const [mergeIntoOne, setMergeIntoOne] = useState<boolean>(true);

  // Drag and drop reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Zoom preview modal
  const [previewModalImage, setPreviewModalImage] = useState<ImageItem | null>(null);
  const [thumbSize, setThumbSize] = useState<"sm" | "md" | "lg">("md");

  // File MIME types filter based on tool
  const acceptedMimeTypes = isJpgTool
    ? ".jpg,.jpeg,image/jpeg,image/jpg"
    : isPngTool
    ? ".png,image/png"
    : "image/*,.jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.avif";

  // Dynamic UI Text
  const uploadTitle = isJpgTool
    ? "Click or drag JPG images here to convert to PDF"
    : isPngTool
    ? "Click or drag PNG images here to convert to PDF"
    : "Click or drag images here to convert to PDF";

  const uploadSubtitle = isJpgTool
    ? "Supports JPG, JPEG. Upload multiple images to create a single PDF document."
    : isPngTool
    ? "Supports PNG. Upload multiple images to create a single PDF document."
    : "Supports JPG, PNG, WebP, GIF, BMP, TIFF. Upload multiple images to create a single PDF document.";

  const addMoreLabel = isJpgTool
    ? "Add More JPGs"
    : isPngTool
    ? "Add More PNGs"
    : "Add More Images";

  // Handle uploaded files
  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const uploadedFiles = Array.from(e.target.files);

    // Filter valid, non-empty files
    const validImages = uploadedFiles.filter((f) => {
      if (f.size === 0) return false;

      if (isJpgTool) {
        return f.type === "image/jpeg" || /\.(jpg|jpeg)$/i.test(f.name);
      }
      if (isPngTool) {
        return f.type === "image/png" || /\.png$/i.test(f.name);
      }
      // Image category allows all image types
      return f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp|gif|tiff|avif)$/i.test(f.name);
    });

    if (validImages.length === 0) {
      if (isJpgTool) {
        toast.error("Please upload JPG/JPEG image files only.");
      } else if (isPngTool) {
        toast.error("Please upload PNG image files only.");
      } else {
        toast.error("Please select valid, uncorrupted image files.");
      }
      return;
    }

    if (images.length + validImages.length > 50) {
      toast.error("Maximum 50 images allowed at a time.");
      return;
    }

    const newItems: ImageItem[] = validImages.map((file) => {
      const url = URL.createObjectURL(file);
      const item: ImageItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        previewUrl: url,
        rotation: 0,
      };

      // Load natural dimensions & verify file integrity
      const img = new Image();
      img.onload = () => {
        setImages((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, width: img.width, height: img.height } : i))
        );
      };
      img.onerror = () => {
        toast.error(`Could not load "${file.name}" (file may be corrupted).`);
        setImages((prev) => prev.filter((i) => i.id !== item.id));
      };
      img.src = url;

      return item;
    });

    setImages((prev) => [...prev, ...newItems]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const moveImage = (fromIndex: number, direction: "left" | "right") => {
    const toIndex = direction === "left" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;

    const updated = [...images];
    const item = updated[fromIndex];
    updated[fromIndex] = updated[toIndex];
    updated[toIndex] = item;
    setImages(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...images];
    const item = updated.splice(draggedIndex, 1)[0];
    updated.splice(index, 0, item);
    setDraggedIndex(index);
    setImages(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const rotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    );
  };

  const rotateAllImages = () => {
    setImages((prev) =>
      prev.map((img) => ({ ...img, rotation: (img.rotation + 90) % 360 }))
    );
  };

  const handleClearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  };

  // Helper to convert rotated/format image to canvas/bytes
  const getProcessedImageBytes = async (
    item: ImageItem
  ): Promise<{ bytes: Uint8Array; isPng: boolean; width: number; height: number }> => {
    const isPng = item.file.type === "image/png" || item.file.name.toLowerCase().endsWith(".png");
    const isJpg = item.file.type === "image/jpeg" || /\.(jpg|jpeg)$/i.test(item.file.name);

    if (item.rotation === 0 && (isPng || isJpg)) {
      const arrayBuf = await item.file.arrayBuffer();
      return {
        bytes: new Uint8Array(arrayBuf),
        isPng,
        width: item.width || 800,
        height: item.height || 1000,
      };
    }

    // Render through canvas for rotation & other image formats (webp/gif/etc)
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));

        const angle = item.rotation;
        const isSwapped = angle === 90 || angle === 270;
        canvas.width = isSwapped ? img.height : img.width;
        canvas.height = isSwapped ? img.width : img.height;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob(
          async (blob) => {
            if (!blob) return reject(new Error("Blob creation failed"));
            const buf = await blob.arrayBuffer();
            resolve({
              bytes: new Uint8Array(buf),
              isPng: false, // Export as JPEG for universal PDF embedding
              width: canvas.width,
              height: canvas.height,
            });
          },
          "image/jpeg",
          0.94
        );
      };
      img.onerror = () => reject(new Error(`Failed to load ${item.name}`));
      img.src = item.previewUrl;
    });
  };

  // Generate PDF from Images
  const handleConvertToPdf = async () => {
    if (images.length === 0) {
      toast.error("Please add at least one image.");
      return;
    }

    setProcessing(true);
    setStatusMessage("Creating PDF document...");

    try {
      const { PDFDocument } = await import("pdf-lib");

      // Margins in points
      let marginPts = 0;
      if (margin === "small") marginPts = 20;
      else if (margin === "big") marginPts = 45;

      if (mergeIntoOne) {
        const doc = await PDFDocument.create();

        for (let i = 0; i < images.length; i++) {
          const item = images[i];
          setStatusMessage(`Embedding image ${i + 1} of ${images.length}...`);

          const { bytes, isPng, width: imgW, height: imgH } =
            await getProcessedImageBytes(item);

          const embeddedImage = isPng
            ? await doc.embedPng(bytes)
            : await doc.embedJpg(bytes);

          let pageWidth = imgW;
          let pageHeight = imgH;

          // Determine page orientation
          let isLandscape = false;
          if (orientation === "auto") {
            isLandscape = imgW > imgH;
          } else if (orientation === "landscape") {
            isLandscape = true;
          }

          if (pageSize === "a4") {
            pageWidth = isLandscape ? 841.89 : 595.28;
            pageHeight = isLandscape ? 595.28 : 841.89;
          } else if (pageSize === "letter") {
            pageWidth = isLandscape ? 792 : 612;
            pageHeight = isLandscape ? 612 : 792;
          } else if (pageSize === "fit") {
            pageWidth = imgW + 2 * marginPts;
            pageHeight = imgH + 2 * marginPts;
          }

          const page = doc.addPage([pageWidth, pageHeight]);
          const printableW = pageWidth - 2 * marginPts;
          const printableH = pageHeight - 2 * marginPts;

          const scale = Math.min(printableW / imgW, printableH / imgH);
          const drawW = imgW * scale;
          const drawH = imgH * scale;

          const x = marginPts + (printableW - drawW) / 2;
          const y = marginPts + (printableH - drawH) / 2;

          page.drawImage(embeddedImage, {
            x,
            y,
            width: drawW,
            height: drawH,
          });
        }

        setStatusMessage("Finalizing PDF...");
        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes as any], { type: "application/pdf" });

        const baseName = images[0].name.replace(/\.[^/.]+$/, "");
        const downloadName = images.length === 1 ? `${baseName}.pdf` : "images_combined.pdf";

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(`Successfully converted ${images.length} images into PDF!`);
      } else {
        // Individual PDF per image into ZIP
        setStatusMessage("Converting images into individual PDFs...");
        const zip = new JSZip();

        for (let i = 0; i < images.length; i++) {
          const item = images[i];
          setStatusMessage(`Processing image ${i + 1} of ${images.length}...`);

          const doc = await PDFDocument.create();
          const { bytes, isPng, width: imgW, height: imgH } =
            await getProcessedImageBytes(item);

          const embeddedImage = isPng
            ? await doc.embedPng(bytes)
            : await doc.embedJpg(bytes);

          let pageWidth = imgW;
          let pageHeight = imgH;
          let isLandscape = orientation === "auto" ? imgW > imgH : orientation === "landscape";

          if (pageSize === "a4") {
            pageWidth = isLandscape ? 841.89 : 595.28;
            pageHeight = isLandscape ? 595.28 : 841.89;
          } else if (pageSize === "letter") {
            pageWidth = isLandscape ? 792 : 612;
            pageHeight = isLandscape ? 612 : 792;
          } else if (pageSize === "fit") {
            pageWidth = imgW + 2 * marginPts;
            pageHeight = imgH + 2 * marginPts;
          }

          const page = doc.addPage([pageWidth, pageHeight]);
          const printableW = pageWidth - 2 * marginPts;
          const printableH = pageHeight - 2 * marginPts;
          const scale = Math.min(printableW / imgW, printableH / imgH);
          const drawW = imgW * scale;
          const drawH = imgH * scale;

          page.drawImage(embeddedImage, {
            x: marginPts + (printableW - drawW) / 2,
            y: marginPts + (printableH - drawH) / 2,
            width: drawW,
            height: drawH,
          });

          const pdfBytes = await doc.save();
          const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
          const singleName = `${item.name.replace(/\.[^/.]+$/, "")}.pdf`;
          zip.file(singleName, blob);
        }

        setStatusMessage("Archiving into ZIP package...");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "converted_pdfs.zip";
        a.click();
        URL.revokeObjectURL(url);

        toast.success(`Downloaded ${images.length} converted PDFs in a ZIP archive!`);
      }
    } catch (err) {
      console.error("Image to PDF Error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to convert images to PDF.");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  };

  const totalSizeMb = useMemo(() => {
    const bytes = images.reduce((acc, curr) => acc + curr.size, 0);
    return (bytes / (1024 * 1024)).toFixed(2);
  }, [images]);

  const Icon = theme.icon;

  // Active theme classes based on category (Blue for Image, Red for PDF)
  const activeBorderClass = isImageCategory
    ? "border-blue-500 bg-blue-50/50 text-blue-600 dark:border-blue-500 dark:bg-blue-950/20"
    : "border-red-500 bg-red-50/50 text-red-600 dark:border-red-500 dark:bg-red-950/20";

  const activeRadioClass = isImageCategory
    ? "text-blue-600 focus:ring-blue-500"
    : "text-red-600 focus:ring-red-500";

  const iconBgClass = isImageCategory
    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
    : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";

  const hoverBorderClass = isImageCategory
    ? "hover:border-blue-500 hover:bg-blue-50/20 dark:hover:border-blue-500/50"
    : "hover:border-red-500 hover:bg-red-50/20 dark:hover:border-red-500/50";

  const addMoreIconHover = isImageCategory
    ? "group-hover:bg-blue-50 group-hover:text-blue-600"
    : "group-hover:bg-red-50 group-hover:text-red-600";

  const backLinkHref = isImageCategory ? "/#image" : "/#pdf";
  const backLinkLabel = isImageCategory ? "Back to Image Tools" : "Back to PDF Tools";

  return (
    <>
      <Toaster position="top-center" richColors />

      {images.length === 0 && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tool.name}
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
            href={backLinkHref}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLinkLabel}
          </Link>

          {images.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Clear All Images
            </button>
          )}
        </div>

        {/* Initial Upload State */}
        {images.length === 0 && (
          <label
            className={cn(
              "upload-dropzone w-full relative group cursor-pointer",
              isImageCategory ? "upload-dropzone-image" : "upload-dropzone-pdf"
            )}
          >
            <input
              type="file"
              accept={acceptedMimeTypes}
              multiple
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={handleFilesUpload}
            />
            <span className="upload-icon-container group-hover:scale-105 transition-transform">
              <ImageIcon className={cn("h-8 w-8", isImageCategory ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400")} />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                {uploadTitle}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {uploadSubtitle}
              </p>
              <p className="mt-2 text-[11px] font-medium text-zinc-400">
                Max 50 images • {tool.maxMb} MB per file
              </p>
            </span>
          </label>
        )}

        {/* Loaded Images Workspace */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Area: Visual Images Gallery */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Header Info & Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBgClass)}>
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {images.length} {images.length === 1 ? "Image" : "Images"} Ready
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Total size: {totalSizeMb} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Rotate All Button */}
                  <button
                    onClick={rotateAllImages}
                    className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Rotate All 90°
                  </button>

                  {/* Thumbnail Sizing */}
                  <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                    <button
                      onClick={() => setThumbSize("sm")}
                      className={cn(
                        "rounded px-2 py-0.5 font-medium transition",
                        thumbSize === "sm"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      S
                    </button>
                    <button
                      onClick={() => setThumbSize("md")}
                      className={cn(
                        "rounded px-2 py-0.5 font-medium transition",
                        thumbSize === "md"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      M
                    </button>
                    <button
                      onClick={() => setThumbSize("lg")}
                      className={cn(
                        "rounded px-2 py-0.5 font-medium transition",
                        thumbSize === "lg"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      L
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick instructions bar */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <span>Drag cards or use arrow buttons to arrange PDF page order.</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Page 1 of {images.length}
                </span>
              </div>

              {/* Images Grid */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[400px] max-h-[calc(100vh-220px)] overflow-y-auto">
                <div
                  className={cn(
                    "grid gap-4",
                    thumbSize === "sm" && "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8",
                    thumbSize === "md" && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                    thumbSize === "lg" && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  )}
                >
                  {images.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group relative flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/50 p-2 transition-all duration-150 select-none hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 cursor-grab active:cursor-grabbing",
                        draggedIndex === idx && (isImageCategory ? "opacity-30 border-dashed border-blue-500" : "opacity-30 border-dashed border-red-500")
                      )}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative mb-2 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 aspect-[3/4] w-full">
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="h-full w-full object-contain pointer-events-none transition-transform duration-200"
                          style={{ transform: `rotate(${item.rotation}deg)` }}
                          loading="lazy"
                        />

                        {/* Page Number Badge */}
                        <div className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/80 text-[10px] font-bold text-white shadow-sm">
                          {idx + 1}
                        </div>

                        {/* Zoom Button */}
                        <button
                          type="button"
                          onClick={() => setPreviewModalImage(item)}
                          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white sm:opacity-0 transition sm:group-hover:opacity-100 hover:bg-black/80 shadow-sm"
                          title="Zoom Preview"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between px-1 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[70px]">
                          {item.name}
                        </span>

                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => rotateImage(item.id)}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            title="Rotate 90°"
                          >
                            <RotateCw className="h-3 w-3" />
                          </button>
                          <button
                            disabled={idx === 0}
                            onClick={() => moveImage(idx, "left")}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200 disabled:opacity-20 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            title="Move Left"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>
                          <button
                            disabled={idx === images.length - 1}
                            onClick={() => moveImage(idx, "right")}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200 disabled:opacity-20 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            title="Move Right"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeImage(item.id)}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add More Images Tile */}
                  {images.length < 50 && (
                    <label className={cn("group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 p-4 text-center transition cursor-pointer min-h-[160px] dark:border-zinc-800", hoverBorderClass)}>
                      <input
                        type="file"
                        accept={acceptedMimeTypes}
                        multiple
                        className="hidden"
                        onChange={handleFilesUpload}
                      />
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition dark:bg-zinc-800 dark:text-zinc-400", addMoreIconHover)}>
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="mt-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {addMoreLabel}
                      </span>
                      <span className="text-[10px] text-zinc-400">({images.length}/50)</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Right Area: PDF Layout & Conversion Controls */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="sticky top-6 flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <FileText className={cn("h-4 w-4", isImageCategory ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400")} />
                    PDF Layout Settings
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Customize page orientation, size, and margins.
                  </p>
                </div>

                {/* Page Orientation */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Page Orientation
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setOrientation("auto")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        orientation === "auto"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => setOrientation("portrait")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        orientation === "portrait"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => setOrientation("landscape")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        orientation === "landscape"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                {/* Page Size */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Page Size
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setPageSize("a4")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        pageSize === "a4"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      A4 Standard
                    </button>
                    <button
                      onClick={() => setPageSize("fit")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        pageSize === "fit"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      Fit Image
                    </button>
                    <button
                      onClick={() => setPageSize("letter")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        pageSize === "letter"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      US Letter
                    </button>
                  </div>
                </div>

                {/* Page Margin */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Page Margins
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setMargin("none")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        margin === "none"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      No Margin
                    </button>
                    <button
                      onClick={() => setMargin("small")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        margin === "small"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      Small
                    </button>
                    <button
                      onClick={() => setMargin("big")}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs font-semibold transition",
                        margin === "big"
                          ? activeBorderClass
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      Large
                    </button>
                  </div>
                </div>

                {/* Merge Options */}
                <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="imagePdfMergeOption"
                      checked={mergeIntoOne}
                      onChange={() => setMergeIntoOne(true)}
                      className={cn("mt-0.5 h-4 w-4 border-zinc-300", activeRadioClass)}
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Merge all images into 1 PDF
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        Creates a multi-page PDF document in order.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="imagePdfMergeOption"
                      checked={!mergeIntoOne}
                      onChange={() => setMergeIntoOne(false)}
                      className={cn("mt-0.5 h-4 w-4 border-zinc-300", activeRadioClass)}
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Convert each image separately (ZIP)
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        Creates individual PDF files for each picture.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Summary */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs space-y-2.5">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Uploaded Images:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {images.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Resulting Pages:</span>
                    <span className={cn("font-bold", isImageCategory ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400")}>
                      {images.length} pages
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Output Format:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {mergeIntoOne ? "1 PDF Document" : "ZIP Archive"}
                    </span>
                  </div>
                </div>

                {/* Convert Button */}
                <button
                  onClick={() => void handleConvertToPdf()}
                  disabled={processing || images.length === 0}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                    theme.button,
                    (processing || images.length === 0) && "opacity-80 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{statusMessage || "Generating PDF..."}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Convert ({images.length}) Images to PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Full Image Zoom View */}
      {previewModalImage !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] max-w-2xl w-full rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h4 className="font-bold text-zinc-900 dark:text-white truncate max-w-md">
                {previewModalImage.name}
              </h4>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[400px]">
              <img
                src={previewModalImage.previewUrl}
                alt={previewModalImage.name}
                className="max-h-[70vh] max-w-full rounded shadow-md object-contain transition-transform"
                style={{ transform: `rotate(${previewModalImage.rotation}deg)` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
