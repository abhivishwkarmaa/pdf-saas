"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Layers,
  ArrowLeft,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Search,
  Mail,
  Phone,
  Trash2,
  Plus,
  Edit3,
  MousePointer,
  Eye,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface RedactPdfWorkspaceProps {
  tool: ToolDefinition;
}

interface RedactionRegion {
  id: string;
  pageIndex: number; // 0-based
  xPercent: number;  // 0 to 100
  yPercent: number;  // 0 to 100
  widthPercent: number; // 0 to 100
  heightPercent: number; // 0 to 100
  type: "custom" | "text" | "email" | "phone";
  text?: string;
}

type InteractionMode = "draw" | "select";
type HandleType = "tl" | "tr" | "bl" | "br" | "move";

export function RedactPdfWorkspace({ tool }: RedactPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: ShieldAlert,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // PDF Page states
  const [totalPages, setTotalPages] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);
  const [pageImages, setPageImages] = useState<Record<string, string>>({});
  const [rotations, setRotations] = useState<Record<number, number>>({});

  // Redaction regions
  const [regions, setRegions] = useState<RedactionRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // Interaction Mode: "draw" to draw new boxes, "select" to move/resize existing ones
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("draw");

  // Search & Auto-redact states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "email" | "phone">("text");
  const [searchScope, setSearchScope] = useState<"all" | "current">("all");
  const [searching, setSearching] = useState(false);

  // Zoom factor
  const [zoom, setZoom] = useState(1.0);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // Refs for drawing & touch handling
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ xPercent: number; yPercent: number }>({ xPercent: 0, yPercent: 0 });
  const [drawingBox, setDrawingBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Refs for dragging / resizing selected box
  const isTransformingRef = useRef(false);
  const transformHandleRef = useRef<HandleType | null>(null);
  const transformStartRef = useRef<{ clientX: number; clientY: number; region: RedactionRegion }>({
    clientX: 0,
    clientY: 0,
    region: { id: "", pageIndex: 0, xPercent: 0, yPercent: 0, widthPercent: 0, heightPercent: 0, type: "custom" },
  });

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

  // Initialize PDF & render first page
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
          setPreviewPage(1);
          setRegions([]);
          setSelectedRegionId(null);

          // Render Page 1
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (active) {
              setPageImages({ "1-0": canvas.toDataURL() });
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
  const loadPage = useCallback(
    async (pageNum: number, rotationAngle: number) => {
      const key = `${pageNum}-${rotationAngle}`;
      if (pageImages[key] || !file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5, rotation: rotationAngle });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          setPageImages((prev) => ({ ...prev, [key]: canvas.toDataURL() }));
        }
      } catch (err) {
        console.error("Error loading page:", err);
      }
    },
    [file, pageImages]
  );

  const currentRotation = rotations[previewPage - 1] || 0;
  const currentKey = `${previewPage}-${currentRotation}`;

  useEffect(() => {
    if (file && previewPage > 0) {
      void loadPage(previewPage, currentRotation);
    }
  }, [file, previewPage, currentRotation, loadPage]);

  // Rotate preview page
  const rotateCurrentPage = () => {
    const idx = previewPage - 1;
    const nextRot = ((rotations[idx] || 0) + 90) % 360;
    setRotations((prev) => ({ ...prev, [idx]: nextRot }));
  };

  // ----------------------------------------------------
  // DRAW NEW REDACTION REGION (Pointer / Touch Event)
  // ----------------------------------------------------
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (interactionMode !== "draw" || !containerRef.current) return;
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains("canvas-stage")) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    drawStartRef.current = { xPercent, yPercent };
    setDrawingBox({ x: xPercent, y: yPercent, w: 0, h: 0 });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const curXPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const curYPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const startX = drawStartRef.current.xPercent;
    const startY = drawStartRef.current.yPercent;

    const x = Math.min(startX, curXPercent);
    const y = Math.min(startY, curYPercent);
    const w = Math.abs(curXPercent - startX);
    const h = Math.abs(curYPercent - startY);

    setDrawingBox({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      w: Math.round(w * 10) / 10,
      h: Math.round(h * 10) / 10,
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    isDrawingRef.current = false;

    if (drawingBox && drawingBox.w > 1.5 && drawingBox.h > 1.5) {
      const newRegion: RedactionRegion = {
        id: Math.random().toString(36).substring(2, 9),
        pageIndex: previewPage - 1,
        xPercent: drawingBox.x,
        yPercent: drawingBox.y,
        widthPercent: drawingBox.w,
        heightPercent: drawingBox.h,
        type: "custom",
      };
      setRegions((prev) => [...prev, newRegion]);
      setSelectedRegionId(newRegion.id);
      setInteractionMode("select");
      toast.success("Redaction area added!");
    }
    setDrawingBox(null);
  };

  // ----------------------------------------------------
  // TRANSFORM / RESIZE / MOVE SELECTED REGION (Pointer / Touch)
  // ----------------------------------------------------
  const handleHandlePointerDown = (e: React.PointerEvent, region: RedactionRegion, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isTransformingRef.current = true;
    transformHandleRef.current = handle;
    setSelectedRegionId(region.id);
    transformStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      region: { ...region },
    };
  };

  const handleHandlePointerMove = (e: React.PointerEvent) => {
    if (!isTransformingRef.current || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPercent = ((e.clientX - transformStartRef.current.clientX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - transformStartRef.current.clientY) / rect.height) * 100;
    const init = transformStartRef.current.region;
    const handle = transformHandleRef.current;

    let newX = init.xPercent;
    let newY = init.yPercent;
    let newW = init.widthPercent;
    let newH = init.heightPercent;
    const minSize = 2; // min 2%

    if (handle === "move") {
      newX = Math.max(0, Math.min(100 - init.widthPercent, init.xPercent + deltaXPercent));
      newY = Math.max(0, Math.min(100 - init.heightPercent, init.yPercent + deltaYPercent));
    } else {
      if (handle === "tl" || handle === "tr") {
        const proposedY = Math.max(0, Math.min(init.yPercent + init.heightPercent - minSize, init.yPercent + deltaYPercent));
        newH = init.yPercent + init.heightPercent - proposedY;
        newY = proposedY;
      }
      if (handle === "bl" || handle === "br") {
        newH = Math.max(minSize, Math.min(100 - init.yPercent, init.heightPercent + deltaYPercent));
      }
      if (handle === "tl" || handle === "bl") {
        const proposedX = Math.max(0, Math.min(init.xPercent + init.widthPercent - minSize, init.xPercent + deltaXPercent));
        newW = init.xPercent + init.widthPercent - proposedX;
        newX = proposedX;
      }
      if (handle === "tr" || handle === "br") {
        newW = Math.max(minSize, Math.min(100 - init.xPercent, init.widthPercent + deltaXPercent));
      }
    }

    setRegions((prev) =>
      prev.map((r) =>
        r.id === init.id
          ? {
              ...r,
              xPercent: Math.round(newX * 10) / 10,
              yPercent: Math.round(newY * 10) / 10,
              widthPercent: Math.round(newW * 10) / 10,
              heightPercent: Math.round(newH * 10) / 10,
            }
          : r
      )
    );
  };

  const handleHandlePointerUp = (e: React.PointerEvent) => {
    if (isTransformingRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isTransformingRef.current = false;
      transformHandleRef.current = null;
    }
  };

  // Add standard centered box (1-click helper)
  const addCenterBox = () => {
    const newRegion: RedactionRegion = {
      id: Math.random().toString(36).substring(2, 9),
      pageIndex: previewPage - 1,
      xPercent: 35,
      yPercent: 45,
      widthPercent: 30,
      heightPercent: 10,
      type: "custom",
    };
    setRegions((prev) => [...prev, newRegion]);
    setSelectedRegionId(newRegion.id);
    setInteractionMode("select");
    toast.success("Added redaction box! Drag handles to reposition.");
  };

  // Auto-search and overlay redaction regions
  const performSearch = async () => {
    if (!file || (searchMode === "text" && !searchQuery.trim())) return;
    setSearching(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const newRegions: RedactionRegion[] = [];

      const startPage = searchScope === "all" ? 1 : previewPage;
      const endPage = searchScope === "all" ? totalPages : previewPage;

      for (let i = startPage; i <= endPage; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        const width = viewport.width;
        const height = viewport.height;

        for (const item of textContent.items as any[]) {
          if (!item.str || !item.str.trim()) continue;

          const matches: { text: string; index: number; length: number }[] = [];

          if (searchMode === "email") {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            let match;
            while ((match = emailRegex.exec(item.str)) !== null) {
              matches.push({ text: match[0], index: match.index, length: match[0].length });
            }
          } else if (searchMode === "phone") {
            const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
            let match;
            while ((match = phoneRegex.exec(item.str)) !== null) {
              matches.push({ text: match[0], index: match.index, length: match[0].length });
            }
          } else if (searchMode === "text" && searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            const strLower = item.str.toLowerCase();
            let index = strLower.indexOf(queryLower);
            while (index !== -1) {
              matches.push({
                text: item.str.substring(index, index + searchQuery.length),
                index: index,
                length: searchQuery.length,
              });
              index = strLower.indexOf(queryLower, index + 1);
            }
          }

          for (const m of matches) {
            const charWidth = item.width / item.str.length;
            const matchXOffset = m.index * charWidth;
            const matchWidth = m.length * charWidth;

            const tx = item.transform[4] + matchXOffset;
            const ty = item.transform[5];
            const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
            const h = item.height || Math.abs(item.transform[3]) || 12;

            const xPercent = (vx / width) * 100;
            const yPercent = ((vy - h) / height) * 100;
            const widthPercent = (matchWidth / width) * 100;
            const heightPercent = (h / height) * 100;

            newRegions.push({
              id: Math.random().toString(36).substring(2, 9),
              pageIndex: i - 1,
              xPercent: Math.max(0, Math.min(100, Math.round(xPercent * 10) / 10)),
              yPercent: Math.max(0, Math.min(100, Math.round(yPercent * 10) / 10)),
              widthPercent: Math.max(0.2, Math.min(100, Math.round(widthPercent * 10) / 10)),
              heightPercent: Math.max(0.2, Math.min(100, Math.round(heightPercent * 10) / 10)),
              type: searchMode,
              text: m.text,
            });
          }
        }
      }

      if (newRegions.length === 0) {
        toast.info("No matching content found.");
      } else {
        setRegions((prev) => {
          const updated = [...prev];
          let addedCount = 0;
          for (const newReg of newRegions) {
            const isExist = updated.some(
              (r) =>
                r.pageIndex === newReg.pageIndex &&
                Math.abs(r.xPercent - newReg.xPercent) < 0.5 &&
                Math.abs(r.yPercent - newReg.yPercent) < 0.5
            );
            if (!isExist) {
              updated.push(newReg);
              addedCount++;
            }
          }
          if (addedCount > 0) {
            toast.success(`Added ${addedCount} automated redactions!`);
          } else {
            toast.info("Redactions already exist for matches.");
          }
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to search PDF content.");
    } finally {
      setSearching(false);
    }
  };

  const handleProcessRedact = async () => {
    if (!file) return;
    if (regions.length === 0) {
      toast.error("Please add at least one redaction box.");
      return;
    }

    setProcessing(true);
    try {
      const outBlob = await pdf.redactPdf(file, regions);
      const outName = `${file.name.replace(/\.[^/.]+$/, "")}_redacted.pdf`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      // Download
      pdf.downloadBlob(outBlob, outName);
      toast.success("PDF redacted & sanitized permanently!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to redact PDF");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!resultBlob || !resultFileName) return;
    pdf.downloadBlob(resultBlob, resultFileName);
    toast.success("Downloaded redacted PDF!");
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
    setRotations({});
    setRegions([]);
    setSelectedRegionId(null);
    setResultBlob(null);
    setResultFileName("");
  };

  const currentPageRegions = regions.filter((r) => r.pageIndex === previewPage - 1);
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
            Redact Another File
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
            Privacy & Sanitization
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
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag a PDF document here to redact
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Permanently blackout sensitive text, signatures, emails & private information.
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
          {/* Left Column: Visual Stage & Interactive Canvas */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Header Document Card */}
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
                      {regions.length} Total Redaction{regions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={rotateCurrentPage}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                  title="Rotate Current Page 90°"
                >
                  <RotateCw className="h-3.5 w-3.5 text-red-600" />
                  <span>Rotate</span>
                </button>

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
            </div>

            {/* Mode Controls Bar (Draw Box vs Select & Move) */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInteractionMode("draw")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    interactionMode === "draw"
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  )}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Draw Box Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractionMode("select")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    interactionMode === "select"
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  )}
                >
                  <MousePointer className="h-3.5 w-3.5" />
                  <span>Select / Move</span>
                </button>
              </div>

              <button
                type="button"
                onClick={addCenterBox}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 text-red-600" />
                <span>Add Centered Box</span>
              </button>
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
                      PDF Redacted Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Sanitized
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      All sensitive regions have been permanently blacked out.
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
                    Loading PDF page for redaction...
                  </p>
                </div>
              ) : pageImages[currentKey] ? (
                <>
                  <div
                    ref={containerRef}
                    className={cn(
                      "canvas-stage relative rounded-lg shadow-2xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden select-none transition-transform",
                      interactionMode === "draw" ? "cursor-crosshair" : "cursor-default"
                    )}
                    style={{
                      width: `${320 * zoom}px`,
                      height: `${440 * zoom}px`,
                      touchAction: "none",
                    }}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerCancel={handleCanvasPointerUp}
                  >
                    {/* PDF Page Canvas Image */}
                    <img
                      src={pageImages[currentKey]}
                      alt={`PDF Page ${previewPage}`}
                      className="w-full h-full object-contain pointer-events-none absolute inset-0 z-0"
                      draggable={false}
                    />

                    {/* Temporary drawing box */}
                    {drawingBox && (
                      <div
                        style={{
                          left: `${drawingBox.x}%`,
                          top: `${drawingBox.y}%`,
                          width: `${drawingBox.w}%`,
                          height: `${drawingBox.h}%`,
                        }}
                        className="absolute z-30 border-2 border-dashed border-red-500 bg-black/75 pointer-events-none"
                      />
                    )}

                    {/* Stamped Redaction Regions on Current Page */}
                    {currentPageRegions.map((region) => {
                      const isSelected = selectedRegionId === region.id;

                      return (
                        <div
                          key={region.id}
                          style={{
                            left: `${region.xPercent}%`,
                            top: `${region.yPercent}%`,
                            width: `${region.widthPercent}%`,
                            height: `${region.heightPercent}%`,
                          }}
                          className={cn(
                            "absolute z-20 bg-black flex items-center justify-center select-none touch-none transition-shadow",
                            isSelected
                              ? "border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] ring-1 ring-red-500"
                              : "border border-zinc-900 opacity-95 hover:border-red-400"
                          )}
                          onPointerDown={(e) => {
                            if (interactionMode === "select") {
                              handleHandlePointerDown(e, region, "move");
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRegionId(region.id);
                          }}
                        >
                          {/* Inner Label */}
                          <span className="text-[8px] font-mono font-black text-white uppercase tracking-wider truncate px-1 select-none pointer-events-none">
                            {region.type === "custom" ? "REDACTED" : region.type}
                          </span>

                          {/* Delete Button (Active on Selection or Hover) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRegions((prev) => prev.filter((r) => r.id !== region.id));
                              if (selectedRegionId === region.id) setSelectedRegionId(null);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute -top-2.5 -right-2.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md border border-white hover:bg-red-500 transition cursor-pointer z-40"
                            title="Remove Box"
                          >
                            <X className="h-3 w-3" />
                          </button>

                          {/* 4 Corner Touch Handles for Selected Box */}
                          {isSelected && (
                            <>
                              <div
                                className="absolute -top-3.5 -left-3.5 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-30"
                                onPointerDown={(e) => handleHandlePointerDown(e, region, "tl")}
                                onPointerMove={handleHandlePointerMove}
                                onPointerUp={handleHandlePointerUp}
                              >
                                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md" />
                              </div>

                              <div
                                className="absolute -top-3.5 -right-3.5 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-30"
                                onPointerDown={(e) => handleHandlePointerDown(e, region, "tr")}
                                onPointerMove={handleHandlePointerMove}
                                onPointerUp={handleHandlePointerUp}
                              >
                                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md" />
                              </div>

                              <div
                                className="absolute -bottom-3.5 -left-3.5 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-30"
                                onPointerDown={(e) => handleHandlePointerDown(e, region, "bl")}
                                onPointerMove={handleHandlePointerMove}
                                onPointerUp={handleHandlePointerUp}
                              >
                                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md" />
                              </div>

                              <div
                                className="absolute -bottom-3.5 -right-3.5 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-30"
                                onPointerDown={(e) => handleHandlePointerDown(e, region, "br")}
                                onPointerMove={handleHandlePointerMove}
                                onPointerUp={handleHandlePointerUp}
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
                        disabled={previewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Page {previewPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={previewPage >= totalPages}
                        onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
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

          {/* Right Column: Auto-Search Redaction, List & Process Actions */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {/* Auto Search Redact */}
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  Auto-Detect & Redact:
                </span>

                {/* Mode Selectors */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { mode: "text" as const, label: "Keywords", icon: Search },
                    { mode: "email" as const, label: "Emails", icon: Mail },
                    { mode: "phone" as const, label: "Phones", icon: Phone },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => setSearchMode(item.mode)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition",
                        searchMode === item.mode
                          ? "bg-red-600 text-white border-red-600 shadow-xs"
                          : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Search Text Input */}
                {searchMode === "text" && (
                  <input
                    type="text"
                    placeholder="Enter confidential word or phrase..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                )}

                {/* Scope selector */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-500">Search scope:</span>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={searchScope === "all"}
                        onChange={() => setSearchScope("all")}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-zinc-700 dark:text-zinc-300">All Pages</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={searchScope === "current"}
                        onChange={() => setSearchScope("current")}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-zinc-700 dark:text-zinc-300">Page {previewPage}</span>
                    </label>
                  </div>
                </div>

                {/* Run Search Button */}
                <button
                  type="button"
                  onClick={performSearch}
                  disabled={!file || (searchMode === "text" && !searchQuery.trim()) || searching}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 py-2 text-xs font-bold transition shadow-xs disabled:opacity-40"
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Scanning Document...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Auto-Find & Blackout</span>
                    </>
                  )}
                </button>
              </div>

              {/* Redaction Regions List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-zinc-400" />
                    Active Redactions ({regions.length}):
                  </span>
                  {regions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRegions([]);
                        setSelectedRegionId(null);
                      }}
                      className="text-[11px] text-red-600 hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {regions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center">
                    <p className="text-xs text-zinc-500">No redactions added yet.</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Draw on the PDF page or use auto-detect above.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {regions.map((reg, i) => (
                      <div
                        key={reg.id}
                        onClick={() => {
                          setPreviewPage(reg.pageIndex + 1);
                          setSelectedRegionId(reg.id);
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition",
                          selectedRegionId === reg.id
                            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            #{i + 1}
                          </span>
                          <span className="text-zinc-500">
                            Page {reg.pageIndex + 1} • {reg.type === "custom" ? "Custom Box" : reg.type}
                          </span>
                          {reg.text && (
                            <span className="font-mono text-[10px] text-red-600 truncate max-w-[100px]">
                              "{reg.text}"
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegions((prev) => prev.filter((r) => r.id !== reg.id));
                            if (selectedRegionId === reg.id) setSelectedRegionId(null);
                          }}
                          className="text-zinc-400 hover:text-red-600 p-1 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Redaction Guarantee Checklist */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Permanent Privacy Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Permanent vector blackout (Cannot be undone in readers)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>100% Client-side local execution & security</span>
                  </div>
                </div>
              </div>

              {/* Redact Action Button */}
              <button
                onClick={() => void handleProcessRedact()}
                disabled={processing || regions.length === 0}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || regions.length === 0) && "opacity-80 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sanitizing & Redacting PDF...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    <span>Apply Redactions ({regions.length})</span>
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
