"use client";

import React, { useState, useEffect, useRef } from "react";
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
  HelpCircle,
  MousePointerClick,
  FileCheck,
  Move,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface SignPdfWorkspaceProps {
  tool: ToolDefinition;
}

export function SignPdfWorkspace({ tool }: SignPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // PDF Viewer State
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1.0);

  // Left Sidebar Signature Creator State
  const [activeTab, setActiveTab] = useState<"draw" | "type" | "upload">("draw");
  const [activeColor, setActiveColor] = useState("#000000");
  const [savedSignatures, setSavedSignatures] = useState<string[]>([]);
  const [activeSignature, setActiveSignature] = useState<string | null>(null);

  // Draw Tab State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Type Tab State
  const [typedText, setTypedText] = useState("Your Signature");
  const [selectedFont, setSelectedFont] = useState<"alex" | "caveat" | "vibes" | "monsieur">("alex");

  // Placed Signatures State
  const [placedSignatures, setPlacedSignatures] = useState<pdf.PlacedSignature[]>([]);

  // Dragging placed signature state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [sigStartPos, setSigStartPos] = useState({ x: 0, y: 0 });

  // Resizing placed signature state
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [sigStartSize, setSigStartSize] = useState({ w: 0, h: 0 });

  // Ink Swatch Colors: Black, Navy, Blue, Dark Blue, Red, Green
  const inkColors = [
    { name: "Black", value: "#000000" },
    { name: "Navy", value: "#091d36" },
    { name: "Blue", value: "#2563eb" },
    { name: "Dark Blue", value: "#1e3a8a" },
    { name: "Red", value: "#ef4444" },
    { name: "Green", value: "#22c55e" },
  ];

  // Dynamic Google Fonts injector
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@400;700&family=Great+Vibes&family=Monsieur+La+Doulaise&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // PDFJS library injector
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

  // Render PDF pages on file change
  useEffect(() => {
    if (!file || !pdfjsLoaded) {
      setPreviewUrls([]);
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }
    const currentFile = file;
    let active = true;

    async function loadPdf() {
      setLoading(true);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (active) {
          const numPages = pdfDoc.numPages;
          setTotalPages(numPages);
          
          const urls: string[] = [];
          for (let pIndex = 1; pIndex <= numPages; pIndex++) {
            const page = await pdfDoc.getPage(pIndex);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");
            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              urls.push(canvas.toDataURL());
            }
          }
          if (active) {
            setPreviewUrls(urls);
          }
        }
      } catch (err) {
        console.error(err);
        if (active) {
          toast.error("Could not load PDF document preview");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPdf();
    return () => {
      active = false;
    };
  }, [file, pdfjsLoaded]);

  // Draw Canvas handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.setPointerCapture(e.pointerId);
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = activeColor;
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSavedSignatures((prev) => [...prev, dataUrl]);
    setActiveSignature(dataUrl);
    clearCanvas();
    toast.success("Signature created!");
  };

  const saveTypedSignature = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = activeColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    
    let fontName = "sans-serif";
    if (selectedFont === "alex") fontName = "'Alex Brush', cursive";
    else if (selectedFont === "caveat") fontName = "'Caveat', cursive";
    else if (selectedFont === "vibes") fontName = "'Great Vibes', cursive";
    else if (selectedFont === "monsieur") fontName = "'Monsieur La Doulaise', cursive";
    
    ctx.font = `64px ${fontName}`;
    ctx.fillText(typedText || "Signature", canvas.width / 2, canvas.height / 2);
    
    const dataUrl = canvas.toDataURL("image/png");
    setSavedSignatures((prev) => [...prev, dataUrl]);
    setActiveSignature(dataUrl);
    toast.success("Typed signature created!");
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uFile = e.target.files?.[0];
    if (!uFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSavedSignatures((prev) => [...prev, dataUrl]);
      setActiveSignature(dataUrl);
      toast.success("Uploaded signature saved!");
    };
    reader.readAsDataURL(uFile);
  };

  // Helper to add signature at specific coordinates (percent)
  const addSignatureAtCoords = (xPercent: number, yPercent: number, signatureUrl: string) => {
    const widthPercent = 22;
    const heightPercent = 9;

    const newSig: pdf.PlacedSignature = {
      pageIndex: currentPage - 1,
      xPercent: Math.max(0, Math.min(100 - widthPercent, xPercent - widthPercent / 2)),
      yPercent: Math.max(0, Math.min(100 - heightPercent, yPercent - heightPercent / 2)),
      widthPercent,
      heightPercent,
      signatureDataUrl: signatureUrl,
    };

    setPlacedSignatures((prev) => [...prev, newSig]);
    toast.success("Signature placed on page!");
  };

  // Pointer resizing event handlers for placed signatures
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizingIndex(idx);
    const sig = placedSignatures[idx];
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setSigStartSize({ w: sig.widthPercent, h: sig.heightPercent });
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if (resizingIndex !== idx) return;
    const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const deltaX = e.clientX - resizeStartPos.x;
    const deltaY = e.clientY - resizeStartPos.y;

    const deltaWPercent = (deltaX / rect.width) * 100;
    const deltaHPercent = (deltaY / rect.height) * 100;

    const sig = placedSignatures[idx];
    const newW = Math.max(5, Math.min(100 - sig.xPercent, sigStartSize.w + deltaWPercent));
    const newH = Math.max(2, Math.min(100 - sig.yPercent, sigStartSize.h + deltaHPercent));

    setPlacedSignatures((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, widthPercent: newW, heightPercent: newH } : s))
    );
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if (resizingIndex === idx) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setResizingIndex(null);
    }
  };

  // Drag over / drop handlers (HTML5 DND from sidebar list to page)
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDropOnPage = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sigUrl = e.dataTransfer.getData("text/plain");
    if (!sigUrl) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;

    const xPercent = (dropX / rect.width) * 100;
    const yPercent = (dropY / rect.height) * 100;

    addSignatureAtCoords(xPercent, yPercent, sigUrl);
  };

  // Pointer drag movement for placed signatures (move around the page)
  const handleSigPointerDown = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingIndex(idx);
    const sig = placedSignatures[idx];
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setSigStartPos({ x: sig.xPercent, y: sig.yPercent });
  };

  const handleSigPointerMove = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if (draggingIndex !== idx) return;
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;

    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;

    const sig = placedSignatures[idx];
    const newX = Math.max(0, Math.min(100 - sig.widthPercent, sigStartPos.x + deltaXPercent));
    const newY = Math.max(0, Math.min(100 - sig.heightPercent, sigStartPos.y + deltaYPercent));

    setPlacedSignatures((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, xPercent: newX, yPercent: newY } : s))
    );
  };

  const handleSigPointerUp = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if (draggingIndex === idx) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDraggingIndex(null);
    }
  };

  const handleRemovePlacedSignature = (index: number) => {
    setPlacedSignatures((prev) => prev.filter((_, i) => i !== index));
    toast.info("Placed signature removed.");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > tool.maxMb * 1024 * 1024) {
        toast.error(`File size exceeds limit of ${tool.maxMb} MB`);
        return;
      }
      setFile(selected);
    }
  };

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
      const resultBlob = await pdf.signPdfAdvanced(file, placedSignatures);
      pdf.downloadBlob(resultBlob, `${file.name.replace(/\.[^/.]+$/, "")}_signed.pdf`);
      toast.success("PDF Signed and downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Could not burn signatures onto PDF document.");
    } finally {
      setProcessing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const Icon = theme.icon;

  return (
    <div className={cn(!file ? "mx-auto max-w-6xl px-4 py-10" : "w-full h-full p-0")}>
      <Toaster position="top-center" richColors />
      {!file && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            PDF Tools
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

      {/* Back Navigation Bar */}
      <div className={cn("flex items-center justify-between mb-4", file ? "px-4 pt-4 lg:px-6" : "")}>
        <Link
          href="/#pdf"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to PDF Tools
        </Link>
      </div>

      <div className={cn(
        "pdf-workspace-theme-wrapper flex flex-col lg:flex-row overflow-hidden bg-white dark:bg-zinc-955 text-zinc-900 dark:text-white lg:h-[calc(100vh-80px)] min-h-[550px] w-full",
        !file
          ? "lg:h-[450px] min-h-[450px] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl justify-center items-center"
          : "lg:h-[calc(100vh-80px)] min-h-[550px] w-full"
      )}>
        {!file ? (
          <div className="flex w-full max-w-xl flex-col items-center justify-center p-6 mx-auto my-auto">
            <label className="group flex w-full cursor-pointer flex-col items-center gap-6 rounded-3xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 backdrop-blur-md px-6 py-20 transition-all duration-300 hover:border-red-500/30 hover:bg-zinc-900/30">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:border-red-500/20">
                <Upload className="h-7 w-7 text-zinc-400 dark:text-zinc-500 group-hover:text-red-500 transition-colors" />
              </span>
              <span className="text-center">
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-red-400 transition-colors">
                  Upload PDF file to sign
                </p>
                <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  Max size {tool.maxMb} MB · Local document processing
                </p>
              </span>
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <>
            {/* LEFT SIDEBAR: SIGNATURE CREATOR */}
            <div className="w-full lg:w-72 bg-zinc-50 dark:bg-zinc-955 border-b border-zinc-200 dark:border-zinc-900 lg:border-b-0 lg:border-r lg:border-zinc-200 dark:border-zinc-900 flex flex-col shrink-0 overflow-y-auto scrollbar-thin">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-555" />
                  <span>Signature Creator</span>
                </span>

            {/* Ink Swatches Selector */}
            <div className="flex items-center justify-between bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-xl p-2.5">
              <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-bold uppercase">Ink Color</span>
              <div className="flex items-center gap-1.5">
                {inkColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setActiveColor(color.value)}
                    className={cn(
                      "h-4.5 w-4.5 rounded-full border transition-all cursor-pointer relative",
                      activeColor === color.value ? "border-zinc-950 dark:border-white scale-110" : "border-zinc-200 dark:border-zinc-850 hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Tool Tabs */}
            <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-850">
              {(["draw", "type", "upload"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider cursor-pointer text-center",
                    activeTab === tab
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  )}
                >
                  {tab === "upload" ? "Upload Stamp" : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-4 border-b border-zinc-200 dark:border-zinc-900">
            {/* Draw Pad Canvas */}
            {activeTab === "draw" && (
              <div className="space-y-2.5">
                <div className="relative border border-dashed border-zinc-300 dark:border-zinc-800 bg-white rounded-2xl overflow-hidden h-36">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    className="w-full h-full cursor-crosshair touch-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearCanvas}
                    className="flex-1 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={saveDrawnSignature}
                    className="flex-1 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-[10px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
                  >
                    Add Signature
                  </button>
                </div>
              </div>
            )}

            {/* Script Text Sign Typer */}
            {activeTab === "type" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-300 font-bold focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                  placeholder="Enter name..."
                />
                
                {/* Script font font preview select */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "alex" as const, label: "Alex Brush", style: "'Alex Brush', cursive" },
                    { key: "caveat" as const, label: "Caveat", style: "'Caveat', cursive" },
                    { key: "vibes" as const, label: "Great Vibes", style: "'Great Vibes', cursive" },
                    { key: "monsieur" as const, label: "Monsieur", style: "'Monsieur La Doulaise', cursive" },
                  ].map((font) => (
                    <button
                      key={font.key}
                      onClick={() => setSelectedFont(font.key)}
                      className={cn(
                        "p-2.5 rounded-xl border text-[10px] text-center transition-all cursor-pointer font-bold",
                        selectedFont === font.key
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-sm"
                          : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-300"
                      )}
                      style={{ fontFamily: font.style }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={saveTypedSignature}
                  className="w-full py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-[10px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
                >
                  Add Signature
                </button>
              </div>
            )}

            {/* Simulated Image Upload */}
            {activeTab === "upload" && (
              <label className="flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-zinc-950/40 rounded-2xl p-6 cursor-pointer hover:border-zinc-700 transition">
                <Upload className="h-6 w-6 text-zinc-500 mb-2" />
                <span className="text-[10px] font-bold text-zinc-400">Upload Stamp Image</span>
                <span className="text-[8px] text-zinc-650 mt-1">PNG, JPG format</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleSignatureUpload}
                />
              </label>
            )}
          </div>

          {/* Saved signatures list below */}
          <div className="flex-1 p-4 space-y-3">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Saved Signatures</span>
            {savedSignatures.length === 0 ? (
              <div className="text-center py-6 text-zinc-650 text-[10px] border border-dashed border-zinc-900/60 rounded-2xl bg-zinc-900/10">
                Create a signature above to drag and drop
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {savedSignatures.map((sig, idx) => {
                  const isActive = activeSignature === sig;
                  return (
                    <div key={idx} className="group relative aspect-video bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-2.5 flex items-center justify-center cursor-grab hover:border-red-500/25 transition">
                      <button
                        onClick={() => setActiveSignature(sig)}
                        className="w-full h-full flex items-center justify-center p-1 cursor-pointer"
                      >
                        <img src={sig} alt="Saved Signature" className="max-h-full max-w-full object-contain" />
                        {isActive && (
                          <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSavedSignatures((prev) => prev.filter((_, i) => i !== idx));
                          if (isActive) setActiveSignature(null);
                        }}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-lg border border-zinc-200 dark:border-zinc-850 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Signature"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drag & Drop active indicator */}
            {activeSignature && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 mt-4">
                <MousePointerClick className="h-4 w-4 text-red-400 shrink-0 animate-bounce" />
                <div>
                  <span className="text-[10px] font-bold text-red-400 block">Drag & Drop Active</span>
                  <span className="text-[8px] text-red-500/80 block leading-tight">Drag signature from above onto the document.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL: INTERACTIVE SIGNING VIEWER */}
        <div className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-[radial-gradient(ellipse_at_top,rgba(20,20,25,0.7),rgba(9,9,11,1))] relative lg:h-full overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              {/* Interactive Document Area */}
              <div className="w-full p-4 flex items-center justify-between border-b border-zinc-900 z-10 bg-zinc-950/40 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800">
                    <FileText className="h-4 w-4 text-zinc-300" />
                  </div>
                  <div>
                    <span className="max-w-[200px] block truncate text-xs font-bold text-zinc-200">
                      {file.name}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono block">
                      {formatBytes(file.size)} • {totalPages} pages
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setFile(null);
                    setPlacedSignatures([]);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-850 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 transition-all cursor-pointer shadow-md"
                >
                  <X className="h-3.5 w-3.5" /> Clear File
                </button>
              </div>

              {/* Viewport page container */}
              <div className="flex-1 w-full flex items-center justify-center relative z-10 overflow-auto scrollbar-thin p-8">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Rendering PDF page...</p>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnPage}
                    className="relative shadow-2xl rounded-lg border border-zinc-900 overflow-hidden bg-white select-none cursor-default"
                    style={{
                      width: `${360 * zoom}px`,
                      height: `${480 * zoom}px`,
                    }}
                  >
                    {previewUrls[currentPage - 1] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrls[currentPage - 1]}
                        alt={`PDF Page ${currentPage}`}
                        className="w-full h-full object-contain pointer-events-none absolute inset-0 z-0"
                        draggable={false}
                      />
                    )}

                    {/* Placed Signatures overlays */}
                    {placedSignatures
                      .map((sig, idx) => ({ sig, idx }))
                      .filter(({ sig }) => sig.pageIndex === currentPage - 1)
                      .map(({ sig, idx }) => (
                        <div
                          key={idx}
                          onPointerDown={(e) => handleSigPointerDown(e, idx)}
                          onPointerMove={(e) => handleSigPointerMove(e, idx)}
                          onPointerUp={(e) => handleSigPointerUp(e, idx)}
                           className={cn(
                             "absolute group border border-dashed p-1 transition-all select-none flex items-center justify-center",
                             draggingIndex === idx
                               ? "border-red-500 bg-red-500/10 cursor-grabbing"
                               : "border-red-300 hover:border-red-500 hover:bg-red-50/5 cursor-grab"
                           )}
                           style={{
                             left: `${sig.xPercent}%`,
                             top: `${sig.yPercent}%`,
                             width: `${sig.widthPercent}%`,
                             height: `${sig.heightPercent}%`,
                             zIndex: 10,
                           }}
                           onClick={(e) => e.stopPropagation()} // prevent placing a signature on top of another signature
                         >
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img
                             src={sig.signatureDataUrl}
                             alt="Signature Overlay"
                             className="w-full h-full object-contain pointer-events-none"
                             draggable={false}
                           />
 
                           {/* Hover indicator of drag capability */}
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                             <Move className="h-4 w-4 text-red-500/80 bg-zinc-950/80 p-0.5 rounded" />
                           </div>
 
                           {/* Resize handle at bottom-right corner */}
                           <div
                             onPointerDown={(e) => handleResizePointerDown(e, idx)}
                             onPointerMove={(e) => handleResizePointerMove(e, idx)}
                             onPointerUp={(e) => handleResizePointerUp(e, idx)}
                             className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-red-500 border border-white rounded-full cursor-se-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                           />

                          {/* Remove Signature Hover button */}
                          <button
                            onPointerDown={(e) => e.stopPropagation()} // prevent starting drag on close click
                            onClick={() => handleRemovePlacedSignature(idx)}
                            className="absolute -top-3.5 -right-3.5 p-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 rounded-lg shadow-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove placed signature"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Page-by-page controls */}
              <div className="w-full p-4 border-t border-zinc-200 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40 backdrop-blur-sm shrink-0 z-10">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850 disabled:opacity-30 disabled:hover:bg-white text-zinc-600 dark:text-zinc-350 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] font-bold font-mono text-zinc-700 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 px-3 py-2 rounded-xl">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850 disabled:opacity-30 disabled:hover:bg-white text-zinc-600 dark:text-zinc-350 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 px-4 py-1.5 rounded-2xl shadow-sm">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] font-bold font-mono text-zinc-650 dark:text-zinc-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.0, z + 0.25))}
                    className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
              </div>
            </div>
        </div>

        {/* RIGHT SIDEBAR: PLACED SIGNATURES & TIPS */}
        <div className="w-full lg:w-72 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 lg:border-t-0 lg:border-l lg:border-zinc-200 dark:border-zinc-900 flex flex-col shrink-0 lg:h-full overflow-hidden">
          
          {/* Running list of placed signatures */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 space-y-3 shrink-0 bg-zinc-50 dark:bg-zinc-950">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-zinc-450 dark:text-zinc-500" />
              <span>Placed Signatures</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {placedSignatures.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-650 text-[10px] leading-relaxed border border-dashed border-zinc-200 dark:border-zinc-900 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/10">
                No signatures placed yet.<br />Drag a signature from the left sidebar and drop it onto the page.
              </div>
            ) : (
              <div className="space-y-2">
                {placedSignatures.map((sig, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800 rounded-xl p-3 gap-3 transition"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="h-10 w-16 bg-white rounded-lg p-1.5 flex items-center justify-center border border-zinc-200 dark:border-zinc-850 shrink-0">
                        <img src={sig.signatureDataUrl} alt="Placed sig thumb" className="max-h-full max-w-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">
                        Page {sig.pageIndex + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemovePlacedSignature(idx)}
                      className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 dark:text-zinc-450 hover:text-red-500 rounded-lg border border-zinc-200 dark:border-zinc-850 transition cursor-pointer"
                      title="Remove signature"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Contextual Tips Panel */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/10 p-4 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-555" />
                <span>Contextual Tips</span>
              </span>
              <ul className="text-[9px] text-zinc-650 dark:text-zinc-500 space-y-1.5 list-disc pl-3.5 leading-relaxed">
                <li>Create drawing, typed name, or upload custom stamp in left sidebar.</li>
                <li><b>Drag and drop</b> signature directly onto the PDF page.</li>
                <li><b>Reposition & Resize</b>: Drag a signature to move it, or drag the bottom-right corner to resize.</li>
              </ul>
            </div>
          </div>

          {/* Action button */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 shrink-0">
            <button
              onClick={handleProcess}
              disabled={!file || processing || loading || placedSignatures.length === 0}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 cursor-pointer",
                theme.button
              )}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing PDF...
                </>
              ) : (
                "Save & Download PDF"
              )}
            </button>
          </div>
        </div>
      </>
    )}
      </div>
    </div>
  );
}
