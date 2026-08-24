"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Type,
  Image as ImageIcon,
  Trash2,
  Calendar,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  MousePointer,
  Move,
  RotateCw,
  Plus,
  Undo2,
  Layers,
  Palette,
} from "lucide-react";
import Link from "next/link";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface SignPdfWorkspaceProps {
  tool: ToolDefinition;
}

type TabType = "draw" | "type" | "upload" | "date";
type FontChoice = "alex" | "caveat" | "vibes" | "dancing" | "monsieur";
type HandleType = "tl" | "tr" | "bl" | "br" | "move";

export function SignPdfWorkspace({ tool }: SignPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: PenTool,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // PDF Viewer State
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [zoom, setZoom] = useState(1.0);

  // Signature Creator State
  const [activeTab, setActiveTab] = useState<TabType>("draw");
  const [inkColor, setInkColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [savedSignatures, setSavedSignatures] = useState<string[]>([]);
  const [selectedSignatureUrl, setSelectedSignatureUrl] = useState<string | null>(null);

  // Draw Canvas Ref & Stroke History
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

  // Type Signature State
  const [typedText, setTypedText] = useState("John Doe");
  const [selectedFont, setSelectedFont] = useState<FontChoice>("alex");

  // Date Stamp State
  const [dateCustomText, setDateCustomText] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  });

  // Placed Signatures on PDF pages
  const [placedSignatures, setPlacedSignatures] = useState<pdf.PlacedSignature[]>([]);
  const [selectedSigIndex, setSelectedSigIndex] = useState<number | null>(null);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // Refs for Placed Signature Drag & Resize
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const isTransformingRef = useRef(false);
  const transformHandleRef = useRef<HandleType | null>(null);
  const transformStartRef = useRef<{ clientX: number; clientY: number; sig: pdf.PlacedSignature }>({
    clientX: 0,
    clientY: 0,
    sig: { pageIndex: 0, xPercent: 0, yPercent: 0, widthPercent: 0, heightPercent: 0, signatureDataUrl: "" },
  });

  // Google Fonts dynamic injection
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@400;700&family=Dancing+Script:wght@600&family=Great+Vibes&family=Monsieur+La+Doulaise&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // PDF.js script loader
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfjsLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Load PDF on file change
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;
    const currentFile = file;
    let active = true;

    async function loadPdf() {
      setLoading(true);
      setResultBlob(null);

      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages;

        if (active) {
          setTotalPages(total);
          setCurrentPage(1);
          setPlacedSignatures([]);
          setSelectedSigIndex(null);

          // Render first page
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (active) {
              setPageImages({ 1: canvas.toDataURL() });
            }
          }
        }
      } catch (err) {
        console.error("PDF load error:", err);
        if (active) toast.error("Could not load PDF document.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPdf();
    return () => {
      active = false;
    };
  }, [file, pdfjsLoaded]);

  // Load specific page dynamically
  const loadPageImage = useCallback(
    async (pageNum: number) => {
      if (pageImages[pageNum] || !file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          setPageImages((prev) => ({ ...prev, [pageNum]: canvas.toDataURL() }));
        }
      } catch (err) {
        console.error("Error loading page:", err);
      }
    },
    [file, pageImages]
  );

  useEffect(() => {
    if (file && currentPage > 0) {
      void loadPageImage(currentPage);
    }
  }, [file, currentPage, loadPageImage]);

  // ----------------------------------------------------
  // DRAW CANVAS CONTROLLER (Touch & Mouse Native Support)
  // ----------------------------------------------------
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);

    // Save history for undo
    setDrawHistory((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = strokeWidth * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = inkColor;
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    try {
      drawCanvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(false);
  };

  const clearDrawingCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setDrawHistory([]);
    }
  };

  const undoLastStroke = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || drawHistory.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lastState = drawHistory[drawHistory.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setDrawHistory((prev) => prev.slice(0, -1));
  };

  // Generate PNG data URL from draw canvas
  const saveDrawnSignature = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSavedSignatures((prev) => [...prev, dataUrl]);
    setSelectedSignatureUrl(dataUrl);
    clearDrawingCanvas();
    toast.success("Drawn signature ready! Click 'Stamp on Page' or tap on the PDF.");
  };

  // Generate PNG data URL from typed text
  const saveTypedSignature = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = inkColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    let fontName = "'Alex Brush', cursive";
    if (selectedFont === "caveat") fontName = "'Caveat', cursive";
    else if (selectedFont === "vibes") fontName = "'Great Vibes', cursive";
    else if (selectedFont === "dancing") fontName = "'Dancing Script', cursive";
    else if (selectedFont === "monsieur") fontName = "'Monsieur La Doulaise', cursive";

    ctx.font = `72px ${fontName}`;
    ctx.fillText(typedText || "Signature", canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL("image/png");
    setSavedSignatures((prev) => [...prev, dataUrl]);
    setSelectedSignatureUrl(dataUrl);
    toast.success("Typed signature ready! Click 'Stamp on Page' or tap on the PDF.");
  };

  // Generate PNG data URL for date stamp
  const saveDateStamp = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 140;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = inkColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`📅 ${dateCustomText}`, canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL("image/png");
    setSavedSignatures((prev) => [...prev, dataUrl]);
    setSelectedSignatureUrl(dataUrl);
    toast.success("Date stamp ready! Click 'Stamp on Page' or tap on the PDF.");
  };

  // Upload image handler
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uFile = e.target.files?.[0];
    if (!uFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSavedSignatures((prev) => [...prev, dataUrl]);
      setSelectedSignatureUrl(dataUrl);
      toast.success("Uploaded signature ready! Click 'Stamp on Page' or tap on the PDF.");
    };
    reader.readAsDataURL(uFile);
  };

  // ----------------------------------------------------
  // PLACING SIGNATURE ON PDF (1-Click or Tap on Canvas)
  // ----------------------------------------------------
  const placeActiveSignature = (xPercent = 65, yPercent = 80) => {
    let sigUrl = selectedSignatureUrl;

    // If no signature is explicitly selected, generate on the fly from current active tab
    if (!sigUrl) {
      if (activeTab === "draw" && drawCanvasRef.current) {
        sigUrl = drawCanvasRef.current.toDataURL("image/png");
      } else if (activeTab === "type") {
        saveTypedSignature();
        return;
      } else if (activeTab === "date") {
        saveDateStamp();
        return;
      }
    }

    if (!sigUrl) {
      toast.error("Please create or select a signature first.");
      return;
    }

    const widthPercent = 25;
    const heightPercent = 10;

    const newSig: pdf.PlacedSignature = {
      pageIndex: currentPage - 1,
      xPercent: Math.max(0, Math.min(100 - widthPercent, xPercent)),
      yPercent: Math.max(0, Math.min(100 - heightPercent, yPercent)),
      widthPercent,
      heightPercent,
      signatureDataUrl: sigUrl,
    };

    setPlacedSignatures((prev) => [...prev, newSig]);
    setSelectedSigIndex(placedSignatures.length);
    toast.success("Signature stamped! Drag or resize anywhere on the page.");
  };

  const handleCanvasClickToPlace = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedSignatureUrl || !pdfContainerRef.current) return;
    // If user clicked directly on an existing placed signature, ignore placement
    if ((e.target as HTMLElement).closest(".placed-sig-element")) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100 - 12.5;
    const y = ((e.clientY - rect.top) / rect.height) * 100 - 5;

    placeActiveSignature(Math.max(0, x), Math.max(0, y));
  };

  // ----------------------------------------------------
  // TRANSFORM PLACED SIGNATURE (Native Touch & Mouse)
  // ----------------------------------------------------
  const handleSigHandlePointerDown = (
    e: React.PointerEvent,
    idx: number,
    handle: HandleType
  ) => {
    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isTransformingRef.current = true;
    transformHandleRef.current = handle;
    setSelectedSigIndex(idx);
    transformStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      sig: { ...placedSignatures[idx] },
    };
  };

  const handleSigHandlePointerMove = (e: React.PointerEvent) => {
    if (!isTransformingRef.current || !pdfContainerRef.current || selectedSigIndex === null) return;
    e.preventDefault();

    const rect = pdfContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPercent = ((e.clientX - transformStartRef.current.clientX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - transformStartRef.current.clientY) / rect.height) * 100;
    const init = transformStartRef.current.sig;
    const handle = transformHandleRef.current;

    let newX = init.xPercent;
    let newY = init.yPercent;
    let newW = init.widthPercent;
    let newH = init.heightPercent;
    const minW = 8;
    const minH = 3;

    if (handle === "move") {
      newX = Math.max(0, Math.min(100 - init.widthPercent, init.xPercent + deltaXPercent));
      newY = Math.max(0, Math.min(100 - init.heightPercent, init.yPercent + deltaYPercent));
    } else {
      if (handle === "tl" || handle === "tr") {
        const proposedY = Math.max(0, Math.min(init.yPercent + init.heightPercent - minH, init.yPercent + deltaYPercent));
        newH = init.yPercent + init.heightPercent - proposedY;
        newY = proposedY;
      }
      if (handle === "bl" || handle === "br") {
        newH = Math.max(minH, Math.min(100 - init.yPercent, init.heightPercent + deltaYPercent));
      }
      if (handle === "tl" || handle === "bl") {
        const proposedX = Math.max(0, Math.min(init.xPercent + init.widthPercent - minW, init.xPercent + deltaXPercent));
        newW = init.xPercent + init.widthPercent - proposedX;
        newX = proposedX;
      }
      if (handle === "tr" || handle === "br") {
        newW = Math.max(minW, Math.min(100 - init.xPercent, init.widthPercent + deltaXPercent));
      }
    }

    setPlacedSignatures((prev) =>
      prev.map((s, i) =>
        i === selectedSigIndex
          ? {
              ...s,
              xPercent: Math.round(newX * 10) / 10,
              yPercent: Math.round(newY * 10) / 10,
              widthPercent: Math.round(newW * 10) / 10,
              heightPercent: Math.round(newH * 10) / 10,
            }
          : s
      )
    );
  };

  const handleSigHandlePointerUp = (e: React.PointerEvent) => {
    if (isTransformingRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isTransformingRef.current = false;
      transformHandleRef.current = null;
    }
  };

  // ----------------------------------------------------
  // PROCESS & BURN SIGNATURES
  // ----------------------------------------------------
  const handleProcess = async () => {
    if (!file) {
      toast.error("Please upload a PDF document first.");
      return;
    }
    if (placedSignatures.length === 0) {
      toast.error("Please place at least one signature on the document.");
      return;
    }

    setProcessing(true);
    try {
      const outBlob = await pdf.signPdfAdvanced(file, placedSignatures);
      const outName = `${file.name.replace(/\.[^/.]+$/, "")}_signed.pdf`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      // Download
      pdf.downloadBlob(outBlob, outName);
      toast.success("PDF signed and saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to burn signatures into PDF");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!resultBlob || !resultFileName) return;
    pdf.downloadBlob(resultBlob, resultFileName);
    toast.success("Downloaded signed PDF!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > tool.maxMb * 1024 * 1024) {
        toast.error(`File size exceeds limit of ${tool.maxMb} MB`);
        return;
      }
      setFile(selected);
      setResultBlob(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPageImages({});
    setPlacedSignatures([]);
    setSelectedSigIndex(null);
    setResultBlob(null);
    setResultFileName("");
  };

  const inkColors = [
    { name: "Black", value: "#000000" },
    { name: "Navy Blue", value: "#1e3a8a" },
    { name: "Royal Blue", value: "#2563eb" },
    { name: "Ruby Red", value: "#dc2626" },
    { name: "Emerald", value: "#059669" },
  ];

  const currentPageSignatures = placedSignatures.filter((s) => s.pageIndex === currentPage - 1);
  const originalSizeMb = file ? (file.size / (1024 * 1024)).toFixed(2) : "0";
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

        {file && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sign Another File
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
            Digital Signatures & Stamps
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
        <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={handleFileChange}
          />
          <span className="upload-icon-container group-hover:scale-105 transition-transform">
            <PenTool className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag a PDF document here to sign
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Draw your signature, type in calligraphic styles, or upload an image stamp.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max file size: {tool.maxMb} MB
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {file && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Visual Stage & PDF Preview with Placed Signatures */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Document Header Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs truncate">
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {originalSizeMb} MB
                    </span>
                    <span>•</span>
                    <span>{totalPages} Pages</span>
                    <span>•</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold font-mono">
                      {placedSignatures.length} Signature{placedSignatures.length === 1 ? "" : "s"} Placed
                    </span>
                  </div>
                </div>
              </div>

              {/* Zoom Action Buttons */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
                  className="rounded p-1 text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                  className="rounded p-1 text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
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
                      PDF Signed Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Signed
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      All signatures have been permanently burned onto your document.
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

            {/* Live Interactive PDF Canvas Stage */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[440px] flex flex-col items-center justify-center relative overflow-hidden select-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Loading PDF document for signing...
                  </p>
                </div>
              ) : pageImages[currentPage] ? (
                <>
                  <div
                    ref={pdfContainerRef}
                    onClick={handleCanvasClickToPlace}
                    className="relative rounded-lg shadow-2xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden select-none transition-transform cursor-crosshair"
                    style={{
                      width: `${320 * zoom}px`,
                      height: `${440 * zoom}px`,
                      touchAction: "none",
                    }}
                  >
                    {/* PDF Page Canvas Image */}
                    <img
                      src={pageImages[currentPage]}
                      alt={`PDF Page ${currentPage}`}
                      className="w-full h-full object-contain pointer-events-none absolute inset-0 z-0"
                      draggable={false}
                    />

                    {/* Placed Signatures on this Page */}
                    {placedSignatures.map((sig, idx) => {
                      if (sig.pageIndex !== currentPage - 1) return null;
                      const isSelected = selectedSigIndex === idx;

                      return (
                        <div
                          key={idx}
                          style={{
                            left: `${sig.xPercent}%`,
                            top: `${sig.yPercent}%`,
                            width: `${sig.widthPercent}%`,
                            height: `${sig.heightPercent}%`,
                          }}
                          className={cn(
                            "placed-sig-element absolute z-20 flex items-center justify-center select-none touch-none transition-shadow group",
                            isSelected
                              ? "border-2 border-red-500 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.4)] rounded"
                              : "border border-dashed border-red-400/60 hover:border-red-500"
                          )}
                          onPointerDown={(e) => handleSigHandlePointerDown(e, idx, "move")}
                          onPointerMove={handleSigHandlePointerMove}
                          onPointerUp={handleSigHandlePointerUp}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSigIndex(idx);
                          }}
                        >
                          {/* Signature Graphic */}
                          <img
                            src={sig.signatureDataUrl}
                            alt="Signature"
                            className="w-full h-full object-contain pointer-events-none select-none"
                            draggable={false}
                          />

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlacedSignatures((prev) => prev.filter((_, i) => i !== idx));
                              if (selectedSigIndex === idx) setSelectedSigIndex(null);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute -top-2.5 -right-2.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md border border-white hover:bg-red-500 transition cursor-pointer z-40"
                            title="Remove Signature"
                          >
                            <X className="h-3 w-3" />
                          </button>

                          {/* 4 Corner Touch Handles for Selected Signature */}
                          {isSelected && (
                            <>
                              <div
                                className="absolute -top-3.5 -left-3.5 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-30"
                                onPointerDown={(e) => handleSigHandlePointerDown(e, idx, "tl")}
                                onPointerMove={handleSigHandlePointerMove}
                                onPointerUp={handleSigHandlePointerUp}
                              >
                                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md" />
                              </div>

                              <div
                                className="absolute -top-3.5 -right-3.5 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-30"
                                onPointerDown={(e) => handleSigHandlePointerDown(e, idx, "tr")}
                                onPointerMove={handleSigHandlePointerMove}
                                onPointerUp={handleSigHandlePointerUp}
                              >
                                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md" />
                              </div>

                              <div
                                className="absolute -bottom-3.5 -left-3.5 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-30"
                                onPointerDown={(e) => handleSigHandlePointerDown(e, idx, "bl")}
                                onPointerMove={handleSigHandlePointerMove}
                                onPointerUp={handleSigHandlePointerUp}
                              >
                                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md" />
                              </div>

                              <div
                                className="absolute -bottom-3.5 -right-3.5 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-30"
                                onPointerDown={(e) => handleSigHandlePointerDown(e, idx, "br")}
                                onPointerMove={handleSigHandlePointerMove}
                                onPointerUp={handleSigHandlePointerUp}
                              >
                                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md" />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Multi-Page Navigation Bar */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-xs text-xs">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-400">Loading page preview...</p>
              )}
            </div>
          </div>

          {/* Right Column: Signature Creator Tabs & Actions */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {/* Tab Navigation */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Create Signature / Stamp:
                </label>
                <div className="grid grid-cols-4 gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                  {[
                    { id: "draw" as TabType, label: "Draw", icon: PenTool },
                    { id: "type" as TabType, label: "Type", icon: Type },
                    { id: "upload" as TabType, label: "Upload", icon: ImageIcon },
                    { id: "date" as TabType, label: "Date", icon: Calendar },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 rounded font-semibold transition text-center",
                        activeTab === t.id
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB 1: DRAW SIGNATURE */}
              {activeTab === "draw" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      Sign in the box below:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={undoLastStroke}
                        disabled={drawHistory.length === 0}
                        className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white disabled:opacity-30 flex items-center gap-1"
                      >
                        <Undo2 className="h-3 w-3" />
                        Undo
                      </button>
                      <button
                        type="button"
                        onClick={clearDrawingCanvas}
                        className="text-xs text-red-600 hover:underline font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden shadow-inner">
                    <canvas
                      ref={drawCanvasRef}
                      width={400}
                      height={150}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      className="w-full h-36 touch-none cursor-crosshair"
                    />
                  </div>

                  {/* Stroke Width Selector */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-zinc-500">Pen Thickness:</span>
                    <div className="flex gap-2">
                      {[
                        { label: "Fine", width: 2 },
                        { label: "Medium", width: 3.5 },
                        { label: "Bold", width: 5.5 },
                      ].map((w) => (
                        <button
                          key={w.label}
                          type="button"
                          onClick={() => setStrokeWidth(w.width)}
                          className={cn(
                            "px-2.5 py-1 rounded border text-[11px] font-semibold transition",
                            strokeWidth === w.width
                              ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                              : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TYPE SIGNATURE */}
              {activeTab === "type" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Type Your Name:
                    </label>
                    <input
                      type="text"
                      value={typedText}
                      onChange={(e) => setTypedText(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>

                  {/* Font Choice Previews */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">
                      Choose Calligraphy Style:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                      {[
                        { id: "alex" as FontChoice, name: "Alex Brush", style: { fontFamily: "'Alex Brush', cursive" } },
                        { id: "caveat" as FontChoice, name: "Caveat", style: { fontFamily: "'Caveat', cursive" } },
                        { id: "vibes" as FontChoice, name: "Great Vibes", style: { fontFamily: "'Great Vibes', cursive" } },
                        { id: "dancing" as FontChoice, name: "Dancing Script", style: { fontFamily: "'Dancing Script', cursive" } },
                        { id: "monsieur" as FontChoice, name: "Monsieur", style: { fontFamily: "'Monsieur La Doulaise', cursive" } },
                      ].map((f) => (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFont(f.id)}
                          className={cn(
                            "p-2 rounded-lg border cursor-pointer flex items-center justify-between transition",
                            selectedFont === f.id
                              ? "border-red-500 bg-red-50/60 dark:bg-red-950/30"
                              : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                          )}
                        >
                          <span className="text-lg text-zinc-900 dark:text-white px-2" style={f.style}>
                            {typedText || "Signature"}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-sans">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: UPLOAD SIGNATURE */}
              {activeTab === "upload" && (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-red-500 transition group">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                    <Upload className="h-6 w-6 text-zinc-400 group-hover:text-red-500 transition mb-2" />
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Upload Signature Image
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-0.5">
                      PNG with transparent background recommended
                    </span>
                  </label>
                </div>
              )}

              {/* TAB 4: DATE STAMP */}
              {activeTab === "date" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Date Stamp Text:
                    </label>
                    <input
                      type="text"
                      value={dateCustomText}
                      onChange={(e) => setDateCustomText(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Ink Color Swatches */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">
                  Ink Color:
                </label>
                <div className="flex items-center gap-2">
                  {inkColors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setInkColor(c.value)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-transform flex items-center justify-center",
                        inkColor === c.value
                          ? "ring-2 ring-red-500 ring-offset-2 scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Stamp on Document Button */}
              <button
                type="button"
                onClick={() => placeActiveSignature()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 py-3 text-xs font-bold transition shadow-md active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Stamp on Page {currentPage}</span>
              </button>

              {/* Placed Signatures Summary List */}
              {placedSignatures.length > 0 && (
                <div className="space-y-1.5 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-zinc-400" />
                      Active Signatures ({placedSignatures.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPlacedSignatures([]);
                        setSelectedSigIndex(null);
                      }}
                      className="text-[11px] text-red-600 hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {placedSignatures.map((sig, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setCurrentPage(sig.pageIndex + 1);
                          setSelectedSigIndex(i);
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition",
                          selectedSigIndex === i
                            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            #{i + 1}
                          </span>
                          <span className="text-zinc-500">Page {sig.pageIndex + 1}</span>
                          <img
                            src={sig.signatureDataUrl}
                            alt="thumb"
                            className="h-4 w-12 object-contain bg-zinc-100 dark:bg-zinc-800 rounded px-1"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlacedSignatures((prev) => prev.filter((_, idx) => idx !== i));
                            if (selectedSigIndex === i) setSelectedSigIndex(null);
                          }}
                          className="text-zinc-400 hover:text-red-600 p-1 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital Signature Security Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Legal & Local Processing Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Permanent vector burning into document stream</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>100% Client-side local execution & confidentiality</span>
                  </div>
                </div>
              </div>

              {/* Final Burn & Save PDF Button */}
              <button
                onClick={() => void handleProcess()}
                disabled={processing || placedSignatures.length === 0}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || placedSignatures.length === 0) && "opacity-80 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Burning Signatures & Saving...</span>
                  </>
                ) : (
                  <>
                    <PenTool className="h-4 w-4" />
                    <span>Burn Signatures & Download ({placedSignatures.length})</span>
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
