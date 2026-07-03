"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  Settings,
  FileText,
  Sliders,
  Type,
  Layout,
  HelpCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Layers,
  Palette,
  RotateCw,
  Image as ImageIcon,
} from "lucide-react";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface WatermarkPdfWorkspaceProps {
  tool: ToolDefinition;
}

export function WatermarkPdfWorkspace({ tool }: WatermarkPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);

  // Watermark Mode Toggle: "text" | "image"
  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");

  // Text Settings
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontFamily, setFontFamily] = useState<
    "Helvetica" | "HelveticaBold" | "TimesRoman" | "TimesRomanBold" | "Courier" | "CourierBold"
  >("HelveticaBold");
  const [fontSize, setFontSize] = useState<number>(36);
  const [color, setColor] = useState<string>("#e5e7eb");

  // Image Settings
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageScale, setImageScale] = useState<number>(100);
  const [watermarkImgUrl, setWatermarkImgUrl] = useState<string | null>(null);

  // Universal Settings
  const [opacity, setOpacity] = useState<number>(0.35);
  const [rotation, setRotation] = useState<number>(-45);
  const [position, setPosition] = useState<
    | "top-left"
    | "top-center"
    | "top-right"
    | "middle-left"
    | "middle-center"
    | "middle-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right"
  >("middle-center");
  const [layer, setLayer] = useState<"over" | "under">("over");

  // Page Targeting Settings
  const [pageRangeType, setPageRangeType] = useState<"all" | "odd" | "even" | "custom">("all");
  const [customRange, setCustomRange] = useState("");

  // Preset Colors
  const swatches = [
    "#e5e7eb", // Light Gray (Default watermark)
    "#000000", // Black
    "#ef4444", // Red
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Yellow / Gold
  ];

  // Watermark Image URL creator
  useEffect(() => {
    if (!imageFile) {
      setWatermarkImgUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setWatermarkImgUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Dynamic PDFJS injection
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

  // Initialize PDF file & render first page
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;
    const currentFile = file;
    let active = true;

    async function loadPdf() {
      setLoading(true);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (active) {
          setTotalPages(pdfDoc.numPages);
          
          // Render page 1
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            if (active) {
              setPreviewUrl(canvas.toDataURL());
            }
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

  const handleWatermarkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG/JPG)");
        return;
      }
      setImageFile(selected);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    if (watermarkType === "image" && !imageFile) {
      toast.error("Please select a watermark image first.");
      return;
    }
    
    setProcessing(true);
    try {
      const options: Partial<pdf.WatermarkOptions> = {
        watermarkType,
        text,
        fontFamily,
        fontSize,
        opacity,
        rotation,
        color,
        position,
        layer,
        pageRangeType,
        customRange,
        imageFile: imageFile || undefined,
        imageScale,
      };

      const resultBlob = await pdf.watermarkPdf(file, text, options);
      pdf.downloadBlob(resultBlob, `${file.name.replace(/\.[^/.]+$/, "")}_watermarked.pdf`);
      toast.success("Successfully added watermark!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to add watermark");
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

  const getCssFontFamily = () => {
    if (fontFamily.startsWith("Times")) return "'Times New Roman', Times, serif";
    if (fontFamily.startsWith("Courier")) return "'Courier New', Courier, monospace";
    return "sans-serif";
  };

  const getCssFontWeight = () => {
    return fontFamily.endsWith("Bold") ? "bold" : "normal";
  };

  // Watermark mockup CSS positioning
  const getMockupPositionStyle = (): React.CSSProperties => {
    const styleObj: React.CSSProperties = {
      position: "absolute",
      opacity: opacity,
      transform: `rotate(${rotation}deg)`,
      transformOrigin: "center center",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      transition: "all 0.15s ease-out",
      zIndex: layer === "over" ? 10 : 2,
    };

    if (watermarkType === "text") {
      styleObj.fontFamily = getCssFontFamily();
      styleObj.fontWeight = getCssFontWeight(),
      styleObj.fontSize = `${fontSize * 0.45 * zoom}px`;
      styleObj.color = color;
    } else {
      const baseWidth = 100;
      styleObj.width = `${baseWidth * (imageScale / 100) * zoom}px`;
      styleObj.height = "auto";
    }

    const pad = "24px"; // padding from edges

    if (position === "middle-center") {
      styleObj.top = "50%";
      styleObj.left = "50%";
      styleObj.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    } else if (position === "top-center") {
      styleObj.top = pad;
      styleObj.left = "50%";
      styleObj.transform = `translateX(-50%) rotate(${rotation}deg)`;
    } else if (position === "bottom-center") {
      styleObj.bottom = pad;
      styleObj.left = "50%";
      styleObj.transform = `translateX(-50%) rotate(${rotation}deg)`;
    } else if (position === "middle-left") {
      styleObj.top = "50%";
      styleObj.left = pad;
      styleObj.transform = `translateY(-50%) rotate(${rotation}deg)`;
    } else if (position === "middle-right") {
      styleObj.top = "50%";
      styleObj.right = pad;
      styleObj.transform = `translateY(-50%) rotate(${rotation}deg)`;
    } else if (position === "top-left") {
      styleObj.top = pad;
      styleObj.left = pad;
    } else if (position === "top-right") {
      styleObj.top = pad;
      styleObj.right = pad;
    } else if (position === "bottom-left") {
      styleObj.bottom = pad;
      styleObj.left = pad;
    } else if (position === "bottom-right") {
      styleObj.bottom = pad;
      styleObj.right = pad;
    }

    return styleObj;
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="pdf-workspace-theme-wrapper flex lg:h-[calc(100vh-140px)] lg:min-h-[550px] min-h-[680px] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl lg:flex-row">
        
        {/* CENTER PANEL: LIVE PREVIEW */}
        <div className="flex flex-1 flex-col items-center bg-[radial-gradient(ellipse_at_top,rgba(20,20,25,0.7),rgba(9,9,11,1))] relative lg:h-full overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {!file ? (
            <div className="flex w-full max-w-xl flex-col items-center justify-center p-12 my-auto z-10">
              <label className="group flex w-full cursor-pointer flex-col items-center gap-6 rounded-3xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md px-6 py-20 transition-all duration-300 hover:border-red-500/30 hover:bg-zinc-900/30">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:border-red-500/20">
                  <Upload className="h-7 w-7 text-zinc-400 group-hover:text-red-500 transition-colors" />
                </span>
                <span className="text-center">
                  <p className="text-sm font-bold text-zinc-300 group-hover:text-red-400 transition-colors">
                    Upload PDF file to watermark
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Max size {tool.maxMb} MB · Fully private in-browser editing
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
              {/* Preview Header / File info */}
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
                    setPreviewUrl(null);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-850 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 transition-all duration-200 shadow-md cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> Clear File
                </button>
              </div>

              {/* Viewport Frame with interactive zoom */}
              <div className="flex-1 w-full flex items-center justify-center relative z-10 overflow-auto scrollbar-thin p-8">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Rendering preview...</p>
                  </div>
                ) : (
                  previewUrl && (
                    <div
                      className="relative shadow-2xl rounded-lg border border-zinc-900 overflow-hidden bg-white select-none"
                      style={{
                        width: `${360 * zoom}px`,
                        height: `${480 * zoom}px`,
                      }}
                    >
                      {/* PDF Preview background */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="PDF Live Mockup"
                        className="w-full h-full object-contain pointer-events-none absolute inset-0 z-0"
                        draggable={false}
                      />

                      {/* Mockup content lines layer if under watermark is previewed */}
                      {layer === "under" && (
                        <div className="absolute inset-0 bg-transparent pointer-events-none select-none z-5 mix-blend-multiply opacity-90">
                          <div className="absolute inset-0 p-8 space-y-4 opacity-5 pointer-events-none">
                            <div className="h-2.5 w-full bg-zinc-800 rounded" />
                            <div className="h-2.5 w-5/6 bg-zinc-800 rounded" />
                            <div className="h-2.5 w-11/12 bg-zinc-800 rounded" />
                            <div className="h-2.5 w-3/4 bg-zinc-800 rounded" />
                            <div className="h-2.5 w-2/3 bg-zinc-800 rounded" />
                          </div>
                        </div>
                      )}

                      {/* Watermark Overlay Element */}
                      {watermarkType === "image" && watermarkImgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={watermarkImgUrl}
                          alt="Watermark Overlay"
                          style={getMockupPositionStyle()}
                          className="pointer-events-none"
                        />
                      ) : watermarkType === "text" ? (
                        <div style={getMockupPositionStyle()}>
                          {text || "CONFIDENTIAL"}
                        </div>
                      ) : (
                        <div className="absolute text-[9px] text-zinc-400 bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl z-10">
                          Select watermark image in settings
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Zoom controls */}
              <div className="w-full p-4 border-t border-zinc-900 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm shrink-0 z-10">
                <div className="flex items-center gap-4 bg-zinc-950/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-zinc-800 shadow-lg">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4.5 w-4.5" />
                  </button>
                  <span className="text-[10px] font-bold font-mono text-zinc-400 w-10 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.0, z + 0.25))}
                    className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL: SETTINGS & TRIGGER ACTIONS (FIXED TO HEIGHT) */}
        <div className="w-full bg-zinc-950 border-t border-zinc-900 lg:w-80 lg:border-t-0 lg:border-l lg:border-zinc-900 flex flex-col z-20 lg:h-full overflow-hidden shrink-0">
          
          {file ? (
            <>
              {/* Header & Tabs */}
              <div className="p-4 border-b border-zinc-900 space-y-3 shrink-0 bg-zinc-950">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Watermark Settings</span>
                </span>

                {/* Placing Text vs Placing Image toggle */}
                <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
                  <button
                    onClick={() => setWatermarkType("text")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      watermarkType === "text"
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Place Text
                  </button>
                  <button
                    onClick={() => setWatermarkType("image")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      watermarkType === "image"
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Place Image
                  </button>
                </div>
              </div>

              {/* Settings scrollable area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                
                {/* Conditional Type Configs */}
                {watermarkType === "text" ? (
                  /* TEXT CONFIGURATIONS */
                  <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Text & Font</span>
                    </span>

                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Watermark Text</label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-300 font-bold focus:border-white focus:outline-none transition"
                        placeholder="CONFIDENTIAL"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Font Family</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as any)}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-300 font-bold focus:border-white focus:outline-none transition cursor-pointer"
                      >
                        <option value="Helvetica">Helvetica</option>
                        <option value="HelveticaBold">Helvetica Bold</option>
                        <option value="TimesRoman">Times New Roman</option>
                        <option value="TimesRomanBold">Times New Roman Bold</option>
                        <option value="Courier">Courier</option>
                        <option value="CourierBold">Courier Bold</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Font Size</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={10}
                          max={120}
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="flex-1 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <input
                          type="number"
                          min={10}
                          max={120}
                          value={fontSize}
                          onChange={(e) => setFontSize(Math.max(10, Math.min(120, Number(e.target.value) || 36)))}
                          className="w-14 bg-zinc-950 border border-zinc-900 rounded-xl py-1 text-center text-xs font-bold font-mono text-zinc-300 focus:border-white focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Preset Color Swatches */}
                    <div className="space-y-2 pt-2 border-t border-zinc-900">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Text Color</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {swatches.map((s) => (
                          <button
                            key={s}
                            onClick={() => setColor(s)}
                            className={cn(
                              "h-5 w-5 rounded-full border transition-all cursor-pointer relative",
                              color === s ? "border-white scale-110 ring-2 ring-white/10" : "border-zinc-800 hover:scale-105"
                            )}
                            style={{ backgroundColor: s }}
                          />
                        ))}
                        
                        {/* Custom color selector */}
                        <label className="h-5 w-5 rounded-full border border-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-all">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-10 h-10 border-0 p-0 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* IMAGE CONFIGURATIONS */
                  <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Image settings</span>
                    </span>

                    {/* Image Dropzone */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Watermark Image</label>
                      {!imageFile ? (
                        <label className="flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-zinc-950/40 rounded-xl p-6 cursor-pointer hover:border-zinc-700 transition">
                          <Upload className="h-5 w-5 text-zinc-500 mb-1.5" />
                          <span className="text-[9px] font-bold text-zinc-400">Upload PNG/JPG</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleWatermarkImageChange}
                          />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-xl p-3">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-200 truncate max-w-[120px]">
                              {imageFile.name}
                            </span>
                          </div>
                          <button
                            onClick={() => setImageFile(null)}
                            className="p-1 hover:bg-zinc-900 rounded border border-zinc-850 hover:text-red-400 transition"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Scale Slider */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                      <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase">
                        <span>Image Scale</span>
                        <span className="font-mono text-zinc-350">{imageScale}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={10}
                          max={300}
                          step={5}
                          value={imageScale}
                          onChange={(e) => setImageScale(Number(e.target.value))}
                          className="flex-1 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <input
                          type="number"
                          min={10}
                          max={300}
                          value={imageScale}
                          onChange={(e) => setImageScale(Math.max(10, Math.min(300, Number(e.target.value) || 100)))}
                          className="w-14 bg-zinc-950 border border-zinc-900 rounded-xl py-1 text-center text-xs font-bold font-mono text-zinc-300 focus:border-white focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Position & Layer */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Layout className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Alignment & Layer</span>
                  </span>

                  {/* 3x3 grid selector */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase block">Position Placement</label>
                    <div className="flex justify-center py-1">
                      <div className="grid grid-cols-3 gap-2.5 p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl">
                        {(
                          [
                            "top-left", "top-center", "top-right",
                            "middle-left", "middle-center", "middle-right",
                            "bottom-left", "bottom-center", "bottom-right",
                          ] as const
                        ).map((pos) => {
                          const isSelected = position === pos;
                          return (
                            <button
                              key={pos}
                              onClick={() => setPosition(pos)}
                              className={cn(
                                "h-7 w-7 rounded-md flex items-center justify-center border transition-all cursor-pointer relative group",
                                isSelected
                                  ? "bg-white border-white text-zinc-950 shadow-md"
                                  : "bg-zinc-900 border-zinc-850 text-zinc-650 hover:border-zinc-700 hover:text-zinc-400"
                              )}
                              title={pos.replace("-", " ")}
                            >
                              <span className={cn(
                                "h-1.5 w-1.5 rounded-full transition-all",
                                isSelected 
                                  ? "bg-zinc-950 scale-110" 
                                  : "bg-zinc-700 group-hover:bg-zinc-500"
                              )} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Over/Under Layer Toggle */}
                  <div className="space-y-2 pt-3 border-t border-zinc-900">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase block">Watermark Layer</label>
                    <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-900">
                      <button
                        onClick={() => setLayer("over")}
                        className={cn(
                          "flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          layer === "over"
                            ? "bg-white text-zinc-950 shadow-sm"
                            : "text-zinc-455 hover:text-zinc-200"
                        )}
                      >
                        Over Content
                      </button>
                      <button
                        onClick={() => setLayer("under")}
                        className={cn(
                          "flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          layer === "under"
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-455 hover:text-zinc-200"
                        )}
                      >
                        Under Content
                      </button>
                    </div>
                  </div>
                </div>

                {/* Universal Effects: Opacity, Rotation */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Opacity & Rotation</span>
                  </span>

                  {/* Opacity */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase">
                      <span>Opacity</span>
                      <span className="font-mono text-zinc-350">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1.0}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  {/* Rotation */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase">
                      <span>Rotation Angle</span>
                      <span className="font-mono text-zinc-350">{rotation}°</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={rotation}
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="flex-1 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                      <button
                        onClick={() => setRotation(0)}
                        className="p-1 text-xs hover:bg-zinc-900 rounded border border-zinc-800 text-zinc-455"
                        title="Reset to 0"
                      >
                        <RotateCw className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Page Range Targeting */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Page Range</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "all" as const, label: "All Pages" },
                      { key: "odd" as const, label: "Odd Pages" },
                      { key: "even" as const, label: "Even Pages" },
                      { key: "custom" as const, label: "Custom Range" },
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        onClick={() => setPageRangeType(btn.key)}
                        className={cn(
                          "py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          pageRangeType === btn.key
                            ? "bg-white border-white text-zinc-950"
                            : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300"
                        )}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {pageRangeType === "custom" && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-900 animate-fadeIn">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Pages range string</label>
                      <input
                        type="text"
                        placeholder="e.g. 1-3, 5, 7-10"
                        value={customRange}
                        onChange={(e) => setCustomRange(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-300 font-bold focus:border-white focus:outline-none transition"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Action trigger button - FIXED/LOCKED at the bottom of sidebar to fit view screen height */}
              <div className="p-5 border-t border-zinc-900 bg-zinc-950 shrink-0">
                <button
                  onClick={handleProcess}
                  disabled={!file || processing || loading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 cursor-pointer",
                    theme.button
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Watermarking PDF...
                    </>
                  ) : (
                    "Watermark PDF"
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
              <HelpCircle className="h-8 w-8 text-zinc-700 mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider">No PDF Uploaded</p>
              <p className="text-[10px] mt-1.5 text-zinc-650 leading-relaxed">
                Please upload a PDF document first. Once uploaded, you will be able to place text or upload a custom watermark image.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
