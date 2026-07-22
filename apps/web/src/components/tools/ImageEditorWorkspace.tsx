"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import {
  Type,
  Square,
  Circle,
  Star,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Wand2,
  Trash2,
  Download,
  Undo2,
  Redo2,
  Upload,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  ZoomIn,
  ZoomOut,
  Monitor,
  X,
  Plus,
  ArrowLeft,
  Layers as LayersIcon,
  Palette,
  Maximize2,
  Copy,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type LayerType = "image" | "text" | "shape" | "sticker";
type ShapeKind = "rect" | "circle" | "triangle" | "star";
type SidebarTab = "uploads" | "text" | "shapes" | "elements" | "filters" | "adjust";
type ResizeHandle = "nw" | "ne" | "se" | "sw";
type MobileView = "canvas" | "tools" | "layers" | "edit_layer";

interface LayerBase {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  flipX: boolean;
  flipY: boolean;
  name: string;
}

interface ImageLayer extends LayerBase {
  type: "image";
  src: string;
  filters: FilterSettings;
}

interface TextLayer extends LayerBase {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  letterSpacing: number;
}

interface ShapeLayer extends LayerBase {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

interface StickerLayer extends LayerBase {
  type: "sticker";
  emoji: string;
  fontSize: number;
}

type Layer = ImageLayer | TextLayer | ShapeLayer | StickerLayer;

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hueRotate: number;
  sepia: number;
  grayscale: number;
  invert: number;
}

interface CanvasSize { width: number; height: number; label: string }

const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hueRotate: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
};

const CANVAS_SIZES: CanvasSize[] = [
  { width: 1080, height: 1080, label: "Instagram Post (1:1)" },
  { width: 1200, height: 628, label: "Facebook Cover" },
  { width: 1920, height: 1080, label: "Full HD (16:9)" },
  { width: 794, height: 1123, label: "A4 Portrait" },
  { width: 1123, height: 794, label: "A4 Landscape" },
  { width: 800, height: 600, label: "Custom 800×600" },
];

const FONT_FAMILIES = ["Inter", "Georgia", "Courier New", "Impact", "Verdana", "Arial Black", "Trebuchet MS"];
const STICKERS = ["🎉", "🔥", "⭐", "❤️", "✨", "🎨", "🚀", "💡", "🎯", "🌈", "💎", "🏆", "🎭", "🌟", "💫", "🎪"];
const PRESET_COLORS = ["#ffffff", "#000000", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#78716c"];

const FILTER_PRESETS = [
  { name: "Original", filters: DEFAULT_FILTERS },
  { name: "Vivid", filters: { ...DEFAULT_FILTERS, saturation: 160, brightness: 105, contrast: 110 } },
  { name: "Cool", filters: { ...DEFAULT_FILTERS, hueRotate: 20, saturation: 120, brightness: 98 } },
  { name: "Warm", filters: { ...DEFAULT_FILTERS, hueRotate: -15, saturation: 130, brightness: 103 } },
  { name: "Vintage", filters: { ...DEFAULT_FILTERS, sepia: 40, contrast: 90, brightness: 95 } },
  { name: "Noir", filters: { ...DEFAULT_FILTERS, grayscale: 100, contrast: 115, brightness: 90 } },
  { name: "Fade", filters: { ...DEFAULT_FILTERS, contrast: 80, brightness: 108, saturation: 80 } },
  { name: "Drama", filters: { ...DEFAULT_FILTERS, contrast: 140, saturation: 140, brightness: 90 } },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

function filterToCss(f: FilterSettings) {
  const parts = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturation !== 100) parts.push(`saturate(${f.saturation}%)`);
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
  if (f.hueRotate !== 0) parts.push(`hue-rotate(${f.hueRotate}deg)`);
  if (f.sepia > 0) parts.push(`sepia(${f.sepia}%)`);
  if (f.grayscale > 0) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.invert > 0) parts.push(`invert(${f.invert}%)`);
  return parts.join(" ") || "none";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImageEditorWorkspace({ tool }: { tool: ToolDefinition }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Layer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("uploads");
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(CANVAS_SIZES[0]);
  const [zoom, setZoom] = useState(0.5);

  // Mobile navigation state
  const [activeMobileView, setActiveMobileView] = useState<MobileView>("canvas");
  const [showNudgeControls, setShowNudgeControls] = useState(false);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resizing state
  const [resizingHandle, setResizingHandle] = useState<ResizeHandle | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    x: number; y: number; width: number; height: number; layerX: number; layerY: number;
  } | null>(null);

  const [showExport, setShowExport] = useState(false);
  const [canvasBackground, setCanvasBackground] = useState("#ffffff");
  const [textInput, setTextInput] = useState("Your text here");
  const [textColor, setTextColor] = useState("#000000");
  const [shapeColor, setShapeFill] = useState("#3b82f6");
  const [shapeStroke, setShapeStroke] = useState("transparent");
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedLayer = useMemo(() => layers.find(l => l.id === selectedId), [layers, selectedId]);

  // Auto-fit zoom to perfectly center canvas inside available viewport height/width
  const autoFitZoom = useCallback(() => {
    if (!canvasAreaRef.current) return;
    const areaW = canvasAreaRef.current.clientWidth - 24;
    const areaH = canvasAreaRef.current.clientHeight - 24;
    if (areaW <= 0 || areaH <= 0) return;
    const scaleW = areaW / canvasSize.width;
    const scaleH = areaH / canvasSize.height;
    const fit = Math.min(scaleW, scaleH);
    const maxScale = window.innerWidth < 768 ? 0.95 : 1;
    setZoom(Math.max(0.08, Math.min(maxScale, Math.floor(fit * 100) / 100)));
  }, [canvasSize]);

  useEffect(() => {
    const timer1 = setTimeout(autoFitZoom, 50);
    const timer2 = setTimeout(autoFitZoom, 300);
    window.addEventListener("resize", autoFitZoom);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("resize", autoFitZoom);
    };
  }, [canvasSize, autoFitZoom]);

  // ─── History Management ─────────────────────────────────────────────────────
  const commit = useCallback((newLayers: Layer[]) => {
    setHistory(h => {
      const trimmed = h.slice(0, historyIndex + 1);
      return [...trimmed, newLayers].slice(-50);
    });
    setHistoryIndex(i => Math.min(i + 1, 49));
    setLayers(newLayers);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(i => i - 1);
      setLayers(prev);
      setSelectedId(null);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(i => i + 1);
      setLayers(next);
    }
  }, [history, historyIndex]);

  // ─── Layer operations ───────────────────────────────────────────────────────
  const updateLayer = useCallback((id: string, patch: Partial<Layer>) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, ...patch } as Layer : l);
    commit(newLayers);
  }, [layers, commit]);

  const deleteLayer = useCallback(() => {
    if (!selectedId) return;
    commit(layers.filter(l => l.id !== selectedId));
    setSelectedId(null);
    if (window.innerWidth < 1024) setActiveMobileView("canvas");
  }, [selectedId, layers, commit]);

  const clearAllLayers = useCallback(() => {
    if (layers.length === 0) return;
    if (window.confirm("Are you sure you want to clear all layers?")) {
      commit([]);
      setSelectedId(null);
      if (window.innerWidth < 1024) setActiveMobileView("canvas");
    }
  }, [layers, commit]);

  const bringForward = useCallback(() => {
    if (!selectedId) return;
    const idx = layers.findIndex(l => l.id === selectedId);
    if (idx < layers.length - 1) {
      const arr = [...layers];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      commit(arr);
    }
  }, [selectedId, layers, commit]);

  const sendBackward = useCallback(() => {
    if (!selectedId) return;
    const idx = layers.findIndex(l => l.id === selectedId);
    if (idx > 0) {
      const arr = [...layers];
      [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      commit(arr);
    }
  }, [selectedId, layers, commit]);

  const duplicateLayer = useCallback(() => {
    if (!selectedLayer) return;
    const newLayer: Layer = {
      ...selectedLayer,
      id: uid(),
      x: selectedLayer.x + 20,
      y: selectedLayer.y + 20,
      name: selectedLayer.name + " copy",
    };
    commit([...layers, newLayer]);
    setSelectedId(newLayer.id);
  }, [selectedLayer, layers, commit]);

  // Nudge Layer Position for Touch Mobile Precision
  const nudgeLayer = (dx: number, dy: number) => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, {
      x: selectedLayer.x + dx,
      y: selectedLayer.y + dy,
    });
  };

  // Scale Layer for Touch Mobile Precision
  const scaleLayerBy = (factor: number) => {
    if (!selectedLayer) return;
    const newW = Math.max(20, Math.round(selectedLayer.width * factor));
    const newH = Math.max(20, Math.round(selectedLayer.height * factor));
    updateLayer(selectedLayer.id, { width: newW, height: newH });
  };

  // ─── Add Layers ─────────────────────────────────────────────────────────────
  const addTextLayer = () => {
    const layer: TextLayer = {
      id: uid(), type: "text", name: textInput.slice(0, 15) || "Text",
      text: textInput, fontSize: 36, fontFamily: "Inter",
      color: textColor, align: "center", bold: false, italic: false,
      letterSpacing: 0, x: canvasSize.width / 2 - 150, y: canvasSize.height / 2 - 25,
      width: 300, height: 60, rotation: 0, opacity: 100,
      visible: true, locked: false, flipX: false, flipY: false,
    };
    commit([...layers, layer]);
    setSelectedId(layer.id);
    if (window.innerWidth < 1024) setActiveMobileView("canvas");
  };

  const addShapeLayer = (shape: ShapeKind) => {
    const layer: ShapeLayer = {
      id: uid(), type: "shape", name: shape.charAt(0).toUpperCase() + shape.slice(1),
      shape, fill: shapeColor, stroke: shapeStroke, strokeWidth: shapeStrokeWidth,
      borderRadius: shape === "rect" ? 8 : 0,
      x: canvasSize.width / 2 - 75, y: canvasSize.height / 2 - 75,
      width: 150, height: 150, rotation: 0, opacity: 100,
      visible: true, locked: false, flipX: false, flipY: false,
    };
    commit([...layers, layer]);
    setSelectedId(layer.id);
    if (window.innerWidth < 1024) setActiveMobileView("canvas");
  };

  const addStickerLayer = (emoji: string) => {
    const layer: StickerLayer = {
      id: uid(), type: "sticker", name: emoji, emoji, fontSize: 72,
      x: canvasSize.width / 2 - 40, y: canvasSize.height / 2 - 40,
      width: 80, height: 80, rotation: 0, opacity: 100,
      visible: true, locked: false, flipX: false, flipY: false,
    };
    commit([...layers, layer]);
    setSelectedId(layer.id);
    if (window.innerWidth < 1024) setActiveMobileView("canvas");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min((canvasSize.width * 0.8) / img.width, (canvasSize.height * 0.8) / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        const layer: ImageLayer = {
          id: uid(), type: "image", name: file.name.slice(0, 20),
          src, filters: { ...DEFAULT_FILTERS },
          x: (canvasSize.width - w) / 2, y: (canvasSize.height - h) / 2,
          width: w, height: h, rotation: 0, opacity: 100,
          visible: true, locked: false, flipX: false, flipY: false,
        };
        commit([...layers, layer]);
        setSelectedId(layer.id);
        setTimeout(autoFitZoom, 50);
        if (window.innerWidth < 1024) setActiveMobileView("canvas");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── Drag & Drop (Mouse + Touch) ─────────────────────────────────────────────
  const startDrag = (clientX: number, clientY: number, id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer || layer.locked) return;
    setSelectedId(id);
    setDragging(true);
    setDragOffset({
      x: clientX / zoom - layer.x,
      y: clientY / zoom - layer.y,
    });
  };

  const onLayerMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, id);
  };

  const onLayerTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (touch) {
      startDrag(touch.clientX, touch.clientY, id);
    }
  };

  useEffect(() => {
    if (!dragging) return;

    const move = (clientX: number, clientY: number) => {
      if (!selectedId) return;
      const nx = clientX / zoom - dragOffset.x;
      const ny = clientY / zoom - dragOffset.y;
      setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, x: nx, y: ny } : l));
    };

    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
    };

    const stop = () => {
      setDragging(false);
      setLayers(ls => { commit(ls); return ls; });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", stop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stop);
    };
  }, [dragging, selectedId, dragOffset, zoom, commit]);

  // ─── Resize Handles (Mouse + Touch) ──────────────────────────────────────────
  const startResize = (clientX: number, clientY: number, handle: ResizeHandle) => {
    if (!selectedLayer || selectedLayer.locked) return;
    setResizingHandle(handle);
    setResizeStart({
      x: clientX,
      y: clientY,
      width: selectedLayer.width,
      height: selectedLayer.height,
      layerX: selectedLayer.x,
      layerY: selectedLayer.y,
    });
  };

  useEffect(() => {
    if (!resizingHandle || !resizeStart || !selectedId) return;

    const resize = (clientX: number, clientY: number) => {
      const dx = (clientX - resizeStart.x) / zoom;
      const dy = (clientY - resizeStart.y) / zoom;

      let nw = resizeStart.width;
      let nh = resizeStart.height;
      let nx = resizeStart.layerX;
      let ny = resizeStart.layerY;

      if (resizingHandle === "se") {
        nw = Math.max(20, resizeStart.width + dx);
        nh = Math.max(20, resizeStart.height + dy);
      } else if (resizingHandle === "sw") {
        nw = Math.max(20, resizeStart.width - dx);
        nx = resizeStart.layerX + (resizeStart.width - nw);
        nh = Math.max(20, resizeStart.height + dy);
      } else if (resizingHandle === "ne") {
        nw = Math.max(20, resizeStart.width + dx);
        nh = Math.max(20, resizeStart.height - dy);
        ny = resizeStart.layerY + (resizeStart.height - nh);
      } else if (resizingHandle === "nw") {
        nw = Math.max(20, resizeStart.width - dx);
        nx = resizeStart.layerX + (resizeStart.width - nw);
        nh = Math.max(20, resizeStart.height - dy);
        ny = resizeStart.layerY + (resizeStart.height - nh);
      }

      setLayers(ls =>
        ls.map(l => (l.id === selectedId ? { ...l, width: nw, height: nh, x: nx, y: ny } : l))
      );
    };

    const onMouseMove = (e: MouseEvent) => resize(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) resize(e.touches[0].clientX, e.touches[0].clientY);
    };

    const stopResize = () => {
      setResizingHandle(null);
      setResizeStart(null);
      setLayers(ls => { commit(ls); return ls; });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopResize);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", stopResize);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResize);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopResize);
    };
  }, [resizingHandle, resizeStart, selectedId, zoom, commit]);

  // ─── Export with Filters Preserved ──────────────────────────────────────────
  const exportImage = async (format: "png" | "jpg" | "webp") => {
    const offscreen = document.createElement("canvas");
    offscreen.width = canvasSize.width;
    offscreen.height = canvasSize.height;
    const ctx = offscreen.getContext("2d")!;

    ctx.fillStyle = canvasBackground;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      if (layer.flipX) ctx.scale(-1, 1);
      if (layer.flipY) ctx.scale(1, -1);

      if (layer.type === "image") {
        const img = new window.Image();
        img.src = layer.src;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        const filterCss = filterToCss((layer as ImageLayer).filters);
        if (filterCss && filterCss !== "none") {
          ctx.filter = filterCss;
        } else {
          ctx.filter = "none";
        }
        ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        ctx.filter = "none";
      } else if (layer.type === "text") {
        ctx.font = `${layer.italic ? "italic " : ""}${layer.bold ? "bold " : ""}${layer.fontSize}px ${layer.fontFamily}`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = layer.align;
        ctx.fillText(layer.text, 0, layer.fontSize / 3);
      } else if (layer.type === "shape") {
        ctx.fillStyle = layer.fill;
        ctx.strokeStyle = layer.stroke;
        ctx.lineWidth = layer.strokeWidth;
        const w = layer.width, h = layer.height;
        if (layer.shape === "rect") {
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, layer.borderRadius);
          ctx.fill();
          if (layer.strokeWidth > 0 && layer.stroke !== "transparent") ctx.stroke();
        } else if (layer.shape === "circle") {
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          if (layer.strokeWidth > 0 && layer.stroke !== "transparent") ctx.stroke();
        } else if (layer.shape === "triangle") {
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(w / 2, h / 2);
          ctx.lineTo(-w / 2, h / 2);
          ctx.closePath();
          ctx.fill();
          if (layer.strokeWidth > 0 && layer.stroke !== "transparent") ctx.stroke();
        } else if (layer.shape === "star") {
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(w * 0.12, -h * 0.12);
          ctx.lineTo(w / 2, -h * 0.12);
          ctx.lineTo(w * 0.22, h * 0.12);
          ctx.lineTo(w * 0.32, h / 2);
          ctx.lineTo(0, h * 0.26);
          ctx.lineTo(-w * 0.32, h / 2);
          ctx.lineTo(-w * 0.22, h * 0.12);
          ctx.lineTo(-w / 2, -h * 0.12);
          ctx.lineTo(-w * 0.12, -h * 0.12);
          ctx.closePath();
          ctx.fill();
          if (layer.strokeWidth > 0 && layer.stroke !== "transparent") ctx.stroke();
        }
      } else if (layer.type === "sticker") {
        ctx.font = `${layer.fontSize}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(layer.emoji, 0, 0);
      }
      ctx.restore();
    }

    const mimeType = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    const quality = format === "jpg" ? 0.92 : format === "webp" ? 0.9 : undefined;
    const url = offscreen.toDataURL(mimeType, quality);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edited.${format}`;
    a.click();
    setShowExport(false);
  };

  // ─── Render Layer on Canvas ─────────────────────────────────────────────────
  const renderLayerContent = (layer: Layer) => {
    const style: React.CSSProperties = {
      position: "absolute",
      left: layer.x * zoom,
      top: layer.y * zoom,
      width: layer.width * zoom,
      height: layer.height * zoom,
      transform: `rotate(${layer.rotation}deg) scaleX(${layer.flipX ? -1 : 1}) scaleY(${layer.flipY ? -1 : 1})`,
      opacity: layer.opacity / 100,
      cursor: layer.locked ? "default" : "move",
      userSelect: "none",
      touchAction: "none",
    };

    if (!layer.visible) return null;

    const isSelected = selectedId === layer.id;

    return (
      <div
        key={layer.id}
        style={style}
        onMouseDown={e => onLayerMouseDown(e, layer.id)}
        onTouchStart={e => onLayerTouchStart(e, layer.id)}
        className={`group transition-shadow ${isSelected ? "ring-2 ring-violet-500 ring-offset-1 z-20" : "hover:ring-1 hover:ring-white/40"}`}
      >
        {layer.type === "image" && (
          <img
            src={(layer as ImageLayer).src}
            alt=""
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
            style={{ filter: filterToCss((layer as ImageLayer).filters), display: "block" }}
          />
        )}
        {layer.type === "text" && (
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none"
            style={{
              fontSize: (layer as TextLayer).fontSize * zoom,
              fontFamily: (layer as TextLayer).fontFamily,
              color: (layer as TextLayer).color,
              textAlign: (layer as TextLayer).align,
              fontWeight: (layer as TextLayer).bold ? "bold" : "normal",
              fontStyle: (layer as TextLayer).italic ? "italic" : "normal",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {(layer as TextLayer).text}
          </div>
        )}
        {layer.type === "shape" && (
          <svg width="100%" height="100%" viewBox={`0 0 ${layer.width} ${layer.height}`} xmlns="http://www.w3.org/2000/svg" className="pointer-events-none">
            {(layer as ShapeLayer).shape === "rect" && (
              <rect x="2" y="2" width={layer.width - 4} height={layer.height - 4} rx={(layer as ShapeLayer).borderRadius} fill={(layer as ShapeLayer).fill} stroke={(layer as ShapeLayer).stroke} strokeWidth={(layer as ShapeLayer).strokeWidth} />
            )}
            {(layer as ShapeLayer).shape === "circle" && (
              <ellipse cx={layer.width / 2} cy={layer.height / 2} rx={layer.width / 2 - 2} ry={layer.height / 2 - 2} fill={(layer as ShapeLayer).fill} stroke={(layer as ShapeLayer).stroke} strokeWidth={(layer as ShapeLayer).strokeWidth} />
            )}
            {(layer as ShapeLayer).shape === "triangle" && (
              <polygon points={`${layer.width / 2},2 ${layer.width - 2},${layer.height - 2} 2,${layer.height - 2}`} fill={(layer as ShapeLayer).fill} stroke={(layer as ShapeLayer).stroke} strokeWidth={(layer as ShapeLayer).strokeWidth} />
            )}
            {(layer as ShapeLayer).shape === "star" && (
              <polygon points={`${layer.width / 2},4 ${layer.width * 0.62},${layer.height * 0.38} ${layer.width - 4},${layer.height * 0.38} ${layer.width * 0.72},${layer.height * 0.62} ${layer.width * 0.82},${layer.height - 4} ${layer.width / 2},${layer.height * 0.76} ${layer.width * 0.18},${layer.height - 4} ${layer.width * 0.28},${layer.height * 0.62} 4,${layer.height * 0.38} ${layer.width * 0.38},${layer.height * 0.38}`} fill={(layer as ShapeLayer).fill} stroke={(layer as ShapeLayer).stroke} strokeWidth={(layer as ShapeLayer).strokeWidth} />
            )}
          </svg>
        )}
        {layer.type === "sticker" && (
          <div style={{ fontSize: (layer as StickerLayer).fontSize * zoom, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }} className="pointer-events-none">
            {(layer as StickerLayer).emoji}
          </div>
        )}

        {/* Resizing handles with enlarged touch hitboxes */}
        {isSelected && !layer.locked && (
          <div className="absolute -inset-2 pointer-events-none">
            {/* SE handle */}
            <div
              onMouseDown={e => { e.stopPropagation(); startResize(e.clientX, e.clientY, "se"); }}
              onTouchStart={e => { e.stopPropagation(); if (e.touches[0]) startResize(e.touches[0].clientX, e.touches[0].clientY, "se"); }}
              className="pointer-events-auto absolute -right-3 -bottom-3 w-7 h-7 bg-violet-600 rounded-full border-2 border-white cursor-se-resize shadow-lg flex items-center justify-center"
            />
            {/* NE handle */}
            <div
              onMouseDown={e => { e.stopPropagation(); startResize(e.clientX, e.clientY, "ne"); }}
              onTouchStart={e => { e.stopPropagation(); if (e.touches[0]) startResize(e.touches[0].clientX, e.touches[0].clientY, "ne"); }}
              className="pointer-events-auto absolute -right-3 -top-3 w-7 h-7 bg-violet-600 rounded-full border-2 border-white cursor-ne-resize shadow-lg flex items-center justify-center"
            />
            {/* SW handle */}
            <div
              onMouseDown={e => { e.stopPropagation(); startResize(e.clientX, e.clientY, "sw"); }}
              onTouchStart={e => { e.stopPropagation(); if (e.touches[0]) startResize(e.touches[0].clientX, e.touches[0].clientY, "sw"); }}
              className="pointer-events-auto absolute -left-3 -bottom-3 w-7 h-7 bg-violet-600 rounded-full border-2 border-white cursor-sw-resize shadow-lg flex items-center justify-center"
            />
            {/* NW handle */}
            <div
              onMouseDown={e => { e.stopPropagation(); startResize(e.clientX, e.clientY, "nw"); }}
              onTouchStart={e => { e.stopPropagation(); if (e.touches[0]) startResize(e.touches[0].clientX, e.touches[0].clientY, "nw"); }}
              className="pointer-events-auto absolute -left-3 -top-3 w-7 h-7 bg-violet-600 rounded-full border-2 border-white cursor-nw-resize shadow-lg flex items-center justify-center"
            />
          </div>
        )}
      </div>
    );
  };

  // ─── Sidebar Panels ─────────────────────────────────────────────────────────
  const renderSidebar = () => {
    return (
      <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
        {/* Sidebar Tab Icons */}
        <div className="grid grid-cols-6 lg:flex lg:flex-col gap-1 p-2 border-b border-zinc-800 shrink-0">
          {([
            { id: "uploads", icon: Upload, label: "Upload" },
            { id: "text", icon: Type, label: "Text" },
            { id: "shapes", icon: Square, label: "Shapes" },
            { id: "elements", icon: Star, label: "Stickers" },
            { id: "filters", icon: Wand2, label: "Filters" },
            { id: "adjust", icon: Sliders, label: "Adjust" },
          ] as { id: SidebarTab; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setSidebarTab(id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-[10px] font-medium transition ${
                sidebarTab === id ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-full">{label}</span>
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {sidebarTab === "uploads" && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500 bg-zinc-800/60 hover:bg-zinc-800 p-4 text-center transition flex flex-col items-center gap-2 cursor-pointer"
              >
                <Upload className="h-6 w-6 text-violet-400" />
                <span className="text-xs font-medium text-zinc-300">Upload Image</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-4">Canvas Size</div>
              <div className="space-y-1">
                {CANVAS_SIZES.map(s => (
                  <button
                    key={s.label}
                    onClick={() => setCanvasSize(s)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs transition ${
                      canvasSize.label === s.label ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <span className="font-semibold block">{s.label}</span>
                    <span className="text-[10px] opacity-70">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-4">Background</div>
              <div className="flex flex-wrap gap-1.5">
                {["#ffffff", "#000000", "#1a1a2e", "#0f3460", "#533483", "#e94560", "#f5f5f5", "#fef3c7"].map(c => (
                  <button
                    key={c}
                    onClick={() => setCanvasBackground(c)}
                    className={`w-7 h-7 rounded-full border-2 transition ${canvasBackground === c ? "border-violet-500 scale-110" : "border-transparent hover:border-zinc-600"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </>
          )}

          {sidebarTab === "text" && (
            <>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Add Text Layer</div>
              <textarea
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm p-2.5 resize-none focus:outline-none focus:border-violet-500"
                rows={2}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Enter text..."
              />
              <div className="flex gap-2">
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0" />
                <button onClick={addTextLayer} className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-2 transition">
                  + Add Text
                </button>
              </div>
            </>
          )}

          {sidebarTab === "shapes" && (
            <>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Fill Color</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setShapeFill(c)} className={`w-6 h-6 rounded-full border-2 transition ${shapeColor === c ? "border-violet-500 scale-110" : "border-transparent hover:border-zinc-600"}`} style={{ background: c }} />
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input type="color" value={shapeColor} onChange={e => setShapeFill(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border-0" />
              </div>

              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-2">Add Shape</div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { shape: "rect", icon: Square, label: "Rectangle" },
                  { shape: "circle", icon: Circle, label: "Circle" },
                  { shape: "triangle", icon: ChevronUp, label: "Triangle" },
                  { shape: "star", icon: Star, label: "Star" },
                ] as { shape: ShapeKind; icon: React.ElementType; label: string }[]).map(({ shape, icon: Icon, label }) => (
                  <button
                    key={shape}
                    onClick={() => addShapeLayer(shape)}
                    className="flex flex-col items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-500 p-3 transition"
                  >
                    <Icon className="h-6 w-6 text-zinc-300" />
                    <span className="text-[10px] text-zinc-400">{label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {sidebarTab === "elements" && (
            <>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-2">Stickers & Emojis</div>
              <div className="grid grid-cols-4 gap-2">
                {STICKERS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => addStickerLayer(emoji)}
                    className="flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-500 p-3 text-2xl transition hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}

          {sidebarTab === "filters" && (
            <>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-2">Preset Filters</div>
              {selectedLayer?.type === "image" ? (
                <div className="grid grid-cols-2 gap-2">
                  {FILTER_PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => updateLayer(selectedLayer.id, { filters: p.filters } as Partial<ImageLayer>)}
                      className="rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-500 p-2.5 transition text-center"
                    >
                      <div className="w-full h-10 rounded-lg mb-1.5 overflow-hidden flex items-center justify-center bg-zinc-700">
                        <img src={(selectedLayer as ImageLayer).src} alt="" className="h-full w-full object-cover" style={{ filter: filterToCss(p.filters) }} />
                      </div>
                      <span className="text-[11px] text-zinc-300 font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 text-center py-6">Select an image layer to apply filters</p>
              )}
            </>
          )}

          {sidebarTab === "adjust" && (
            <>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-2">Adjustments</div>
              {selectedLayer?.type === "image" ? (
                <div className="space-y-3">
                  {([
                    { key: "brightness", label: "Brightness", min: 0, max: 200 },
                    { key: "contrast", label: "Contrast", min: 0, max: 200 },
                    { key: "saturation", label: "Saturation", min: 0, max: 300 },
                    { key: "blur", label: "Blur", min: 0, max: 20 },
                    { key: "hueRotate", label: "Hue", min: -180, max: 180 },
                    { key: "sepia", label: "Sepia", min: 0, max: 100 },
                    { key: "grayscale", label: "Grayscale", min: 0, max: 100 },
                    { key: "invert", label: "Invert", min: 0, max: 100 },
                  ] as { key: keyof FilterSettings; label: string; min: number; max: number }[]).map(({ key, label, min, max }) => {
                    const val = (selectedLayer as ImageLayer).filters[key];
                    return (
                      <div key={key}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[11px] text-zinc-400">{label}</span>
                          <span className="text-[11px] text-zinc-500">{val}</span>
                        </div>
                        <input
                          type="range" min={min} max={max} value={val}
                          onChange={e => updateLayer(selectedLayer.id, { filters: { ...(selectedLayer as ImageLayer).filters, [key]: +e.target.value } } as Partial<ImageLayer>)}
                          className="w-full accent-violet-500"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 text-center py-6">Select an image layer to adjust</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Right Properties Panel ─────────────────────────────────────────────────
  const renderPropertiesPanel = () => (
    <div className="w-full lg:w-64 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-y-auto">
      {/* Layer list */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-300">Layers</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">{layers.length} layers</span>
            {layers.length > 0 && (
              <button
                onClick={clearAllLayers}
                className="text-[10px] text-red-400 hover:text-red-300 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {[...layers].reverse().map(layer => (
            <div
              key={layer.id}
              onClick={() => setSelectedId(layer.id)}
              className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer transition text-xs ${
                selectedId === layer.id ? "bg-violet-600/30 border border-violet-600/50 text-white" : "hover:bg-zinc-800 text-zinc-300 border border-transparent"
              }`}
            >
              <span className="text-base leading-none shrink-0">
                {layer.type === "image" ? "🖼️" : layer.type === "text" ? "T" : layer.type === "sticker" ? (layer as StickerLayer).emoji : "■"}
              </span>
              <span className="flex-1 truncate font-medium">{layer.name}</span>
              <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }} className="text-zinc-500 hover:text-zinc-300 p-0.5">
                {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-zinc-600" />}
              </button>
              <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }} className="text-zinc-500 hover:text-zinc-300 p-0.5">
                {layer.locked ? <Lock className="h-3.5 w-3.5 text-amber-500" /> : <Unlock className="h-3.5 w-3.5 text-zinc-600" />}
              </button>
            </div>
          ))}
          {layers.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-3">No layers yet</p>
          )}
        </div>
      </div>

      {/* Selected layer properties */}
      {selectedLayer && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Properties</p>
            <span className="text-xs text-violet-400 font-semibold truncate max-w-[120px]">{selectedLayer.name}</span>
          </div>

          {/* Touch Precision Nudge / Scale controls for mobile */}
          <div className="bg-zinc-800/80 rounded-xl p-2.5 border border-zinc-700/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
              <span>Position & Nudge</span>
              <button onClick={() => setShowNudgeControls(!showNudgeControls)} className="text-violet-400 hover:underline">
                {showNudgeControls ? "Hide D-Pad" : "D-Pad"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 max-w-[150px] mx-auto text-center">
              <div />
              <button onClick={() => nudgeLayer(0, -5)} className="p-2 rounded bg-zinc-700 hover:bg-violet-600 text-white flex items-center justify-center">
                <ArrowUp className="h-4 w-4" />
              </button>
              <div />
              <button onClick={() => nudgeLayer(-5, 0)} className="p-2 rounded bg-zinc-700 hover:bg-violet-600 text-white flex items-center justify-center">
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
              <div className="flex items-center justify-center text-[10px] font-mono text-zinc-400">
                5px
              </div>
              <button onClick={() => nudgeLayer(5, 0)} className="p-2 rounded bg-zinc-700 hover:bg-violet-600 text-white flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </button>
              <div />
              <button onClick={() => nudgeLayer(0, 5)} className="p-2 rounded bg-zinc-700 hover:bg-violet-600 text-white flex items-center justify-center">
                <ArrowDown className="h-4 w-4" />
              </button>
              <div />
            </div>

            {/* Quick Scale buttons */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
              <span>Scale:</span>
              <div className="flex gap-1">
                <button onClick={() => scaleLayerBy(0.9)} className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-white font-bold">-10%</button>
                <button onClick={() => scaleLayerBy(1.1)} className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-white font-bold">+10%</button>
              </div>
            </div>
          </div>

          {/* Position & Size Inputs */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "X", key: "x" }, { label: "Y", key: "y" },
              { label: "W", key: "width" }, { label: "H", key: "height" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-[10px] text-zinc-500 uppercase">{label}</label>
                <input
                  type="number"
                  value={Math.round((selectedLayer as unknown as Record<string, number>)[key])}
                  onChange={e => updateLayer(selectedLayer.id, { [key]: +e.target.value } as Partial<Layer>)}
                  className="w-full rounded bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5 mt-0.5 focus:outline-none focus:border-violet-500"
                />
              </div>
            ))}
          </div>

          {/* Typography details for Text Layer */}
          {selectedLayer.type === "text" && (
            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Typography</p>
              <input
                type="text"
                value={(selectedLayer as TextLayer).text}
                onChange={e => updateLayer(selectedLayer.id, { text: e.target.value } as Partial<TextLayer>)}
                className="w-full rounded bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5"
                placeholder="Text content..."
              />
              <select
                value={(selectedLayer as TextLayer).fontFamily}
                onChange={e => updateLayer(selectedLayer.id, { fontFamily: e.target.value } as Partial<TextLayer>)}
                className="w-full rounded bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5"
              >
                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Size</span>
                <input
                  type="range" min={8} max={200} value={(selectedLayer as TextLayer).fontSize}
                  onChange={e => updateLayer(selectedLayer.id, { fontSize: +e.target.value } as Partial<TextLayer>)}
                  className="flex-1 accent-violet-500"
                />
                <span className="text-xs text-zinc-400 w-8">{(selectedLayer as TextLayer).fontSize}</span>
              </div>
              <div className="flex gap-1">
                {[
                  { icon: Bold, key: "bold" as const, val: !(selectedLayer as TextLayer).bold },
                  { icon: Italic, key: "italic" as const, val: !(selectedLayer as TextLayer).italic },
                ].map(({ icon: Icon, key, val }) => (
                  <button key={key} onClick={() => updateLayer(selectedLayer.id, { [key]: val } as Partial<TextLayer>)}
                    className={`p-2 rounded-lg ${(selectedLayer as unknown as Record<string, unknown>)[key] ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
                {(["left", "center", "right"] as const).map(a => {
                  const icons = { left: AlignLeft, center: AlignCenter, right: AlignRight };
                  const Icon = icons[a];
                  return (
                    <button key={a} onClick={() => updateLayer(selectedLayer.id, { align: a } as Partial<TextLayer>)}
                      className={`p-2 rounded-lg ${(selectedLayer as TextLayer).align === a ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rotation */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-zinc-400">Rotation</span>
              <span className="text-[11px] text-zinc-500">{selectedLayer.rotation}°</span>
            </div>
            <input type="range" min={-180} max={180} value={selectedLayer.rotation}
              onChange={e => updateLayer(selectedLayer.id, { rotation: +e.target.value })}
              className="w-full accent-violet-500" />
          </div>

          {/* Opacity */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-zinc-400">Opacity</span>
              <span className="text-[11px] text-zinc-500">{selectedLayer.opacity}%</span>
            </div>
            <input type="range" min={0} max={100} value={selectedLayer.opacity}
              onChange={e => updateLayer(selectedLayer.id, { opacity: +e.target.value })}
              className="w-full accent-violet-500" />
          </div>

          {/* Flip & Rotate actions */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { icon: RotateCcw, action: () => updateLayer(selectedLayer.id, { rotation: selectedLayer.rotation - 90 }), title: "Rotate Left" },
              { icon: RotateCw, action: () => updateLayer(selectedLayer.id, { rotation: selectedLayer.rotation + 90 }), title: "Rotate Right" },
              { icon: FlipHorizontal, action: () => updateLayer(selectedLayer.id, { flipX: !selectedLayer.flipX }), title: "Flip H" },
              { icon: FlipVertical, action: () => updateLayer(selectedLayer.id, { flipY: !selectedLayer.flipY }), title: "Flip V" },
            ].map(({ icon: Icon, action, title }) => (
              <button key={title} onClick={action} title={title} className="flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 p-2 transition">
                <Icon className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            ))}
          </div>

          {/* Reorder */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={bringForward} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs py-1.5 flex items-center justify-center gap-1 transition">
              <ChevronUp className="h-3 w-3" /> Forward
            </button>
            <button onClick={sendBackward} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs py-1.5 flex items-center justify-center gap-1 transition">
              <ChevronDown className="h-3 w-3" /> Backward
            </button>
          </div>

          {/* Duplicate & Delete */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={duplicateLayer} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 flex items-center justify-center gap-1 transition font-medium">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button onClick={deleteLayer} className="rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-900/40 text-red-400 text-xs py-2 flex items-center justify-center gap-1 transition font-medium">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 gap-2 overflow-x-auto z-30">
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/#image"
            className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-white transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="w-px h-5 bg-zinc-800" />
          <button onClick={undo} disabled={historyIndex === 0} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition" title="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition" title="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setZoom(z => Math.max(0.08, z - 0.05))} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-zinc-400 min-w-[2.5rem] text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.05))} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={autoFitZoom} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition" title="Fit to Screen">
            <Monitor className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-md shadow-violet-600/30"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Left Sidebar */}
        <div className="hidden lg:block w-[11rem] shrink-0 overflow-hidden">
          {renderSidebar()}
        </div>

        {/* Canvas Area (100% visible preview view) */}
        <div
          ref={canvasAreaRef}
          className="flex-1 overflow-auto bg-[radial-gradient(circle_at_50%_50%,_#18181b_0%,_#09090b_100%)] relative flex items-center justify-center p-3 sm:p-6"
          style={{ backgroundImage: "radial-gradient(circle, #27272a 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          onMouseDown={() => setSelectedId(null)}
          onTouchStart={() => setSelectedId(null)}
        >
          <div
            ref={canvasRef}
            className="relative shadow-2xl shadow-black/80 overflow-hidden select-none transition-all duration-150 shrink-0 border border-zinc-800/80"
            style={{
              width: Math.max(50, canvasSize.width * zoom),
              height: Math.max(50, canvasSize.height * zoom),
              background: canvasBackground,
            }}
          >
            {layers.map(renderLayerContent)}

            {/* Tap/Click to Upload or Add content overlay when empty */}
            {layers.length === 0 && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-zinc-900/30 hover:bg-zinc-900/50 transition group z-10"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/40 text-violet-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="text-sm font-bold text-white">Tap to Upload Image</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-[220px]">
                  Or tap Tools below to add Text, Shapes & Stickers
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Properties Panel */}
        <div className="hidden lg:block">
          {renderPropertiesPanel()}
        </div>

        {/* Mobile Slide-Over Bottom Sheet for Tools / Layers / Edit */}
        {activeMobileView !== "canvas" && (
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden flex flex-col justify-end">
            <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[65dvh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-1 rounded-full bg-zinc-700 mx-auto block mb-1" />
                  <span className="text-sm font-bold text-white capitalize">
                    {activeMobileView === "tools" ? "Tools & Elements" : activeMobileView === "layers" ? "Layer Stack" : "Edit Selected Layer"}
                  </span>
                </div>
                <button
                  onClick={() => setActiveMobileView("canvas")}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {activeMobileView === "tools" && renderSidebar()}
                {(activeMobileView === "layers" || activeMobileView === "edit_layer") && renderPropertiesPanel()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Layer Quick Touch Bar for Mobile */}
      {selectedLayer && activeMobileView === "canvas" && (
        <div className="lg:hidden flex items-center justify-between px-3 py-1.5 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 shrink-0 z-30 gap-1 overflow-x-auto text-xs">
          <span className="font-semibold text-violet-400 truncate max-w-[90px]">{selectedLayer.name}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => nudgeLayer(-5, 0)}
              className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              title="Move Left"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => nudgeLayer(5, 0)}
              className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              title="Move Right"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => scaleLayerBy(0.9)}
              className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-bold text-[11px]"
            >
              -
            </button>
            <button
              onClick={() => scaleLayerBy(1.1)}
              className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-bold text-[11px]"
            >
              +
            </button>
            <button
              onClick={() => updateLayer(selectedLayer.id, { rotation: selectedLayer.rotation + 90 })}
              className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              title="Rotate"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={duplicateLayer}
              className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              title="Duplicate"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={deleteLayer}
              className="p-1.5 rounded bg-red-950/60 text-red-400 hover:bg-red-900"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setActiveMobileView("edit_layer")}
              className="px-2 py-1 rounded bg-violet-600 text-white font-medium text-[11px]"
            >
              Props
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Bar */}
      <div className="lg:hidden flex items-center justify-around p-2 bg-zinc-900 border-t border-zinc-800 shrink-0 z-30">
        <button
          onClick={() => setActiveMobileView(activeMobileView === "tools" ? "canvas" : "tools")}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-[11px] font-semibold transition ${
            activeMobileView === "tools" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          <Palette className="h-4 w-4" /> Tools
        </button>

        <button
          onClick={autoFitZoom}
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-[11px] font-semibold"
        >
          <Maximize2 className="h-4 w-4" /> Fit
        </button>

        <button
          onClick={() => setActiveMobileView(activeMobileView === "layers" ? "canvas" : "layers")}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-[11px] font-semibold transition relative ${
            activeMobileView === "layers" || activeMobileView === "edit_layer" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          <div className="relative">
            <LayersIcon className="h-4 w-4" />
            {layers.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 w-3.5 h-3.5 rounded-full bg-violet-500 text-[9px] text-white flex items-center justify-center font-bold">
                {layers.length}
              </span>
            )}
          </div>
          Layers
        </button>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Export Image</h3>
              <button onClick={() => setShowExport(false)} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-zinc-400 text-sm mb-5">Choose a format to download your design.</p>
            <div className="grid grid-cols-3 gap-3">
              {(["png", "jpg", "webp"] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => exportImage(fmt)}
                  className="flex flex-col items-center gap-2 rounded-xl bg-zinc-800 hover:bg-violet-600/20 border border-zinc-700 hover:border-violet-500 p-4 transition"
                >
                  <Download className="h-5 w-5 text-zinc-300" />
                  <span className="text-sm font-bold text-white uppercase">{fmt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
