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
  Sparkles,
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
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  ZoomIn,
  ZoomOut,
  Monitor,
  X,
  Plus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LayerType = "image" | "text" | "shape" | "sticker";
type ShapeKind = "rect" | "circle" | "triangle" | "star" | "line";
type SidebarTab = "templates" | "uploads" | "text" | "shapes" | "elements" | "filters" | "adjust";

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
  sharpness: number;
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
  sharpness: 0,
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
  const [zoom, setZoom] = useState(0.6);
  const [_globalFilters, _setGlobalFilters] = useState<FilterSettings>(DEFAULT_FILTERS);
  const [_editingText, _setEditingText] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [_resizing, _setResizing] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [canvasBackground, setCanvasBackground] = useState("#ffffff");
  const [textInput, setTextInput] = useState("Your text here");
  const [textColor, setTextColor] = useState("#000000");
  const [shapeColor, setShapeFill] = useState("#3b82f6");

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedLayer = useMemo(() => layers.find(l => l.id === selectedId), [layers, selectedId]);

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
  }, [selectedId, layers, commit]);

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
    const newLayer: Layer = { ...selectedLayer, id: uid(), x: selectedLayer.x + 20, y: selectedLayer.y + 20, name: selectedLayer.name + " copy" };
    commit([...layers, newLayer]);
    setSelectedId(newLayer.id);
  }, [selectedLayer, layers, commit]);

  // ─── Add Layers ─────────────────────────────────────────────────────────────
  const addTextLayer = () => {
    const layer: TextLayer = {
      id: uid(), type: "text", name: "Text",
      text: textInput, fontSize: 36, fontFamily: "Inter",
      color: textColor, align: "center", bold: false, italic: false,
      letterSpacing: 0, x: canvasSize.width / 2 - 150, y: canvasSize.height / 2 - 25,
      width: 300, height: 60, rotation: 0, opacity: 100,
      visible: true, locked: false, flipX: false, flipY: false,
    };
    commit([...layers, layer]);
    setSelectedId(layer.id);
  };

  const addShapeLayer = (shape: ShapeKind) => {
    const layer: ShapeLayer = {
      id: uid(), type: "shape", name: shape.charAt(0).toUpperCase() + shape.slice(1),
      shape, fill: shapeColor, stroke: "transparent", strokeWidth: 0, borderRadius: shape === "rect" ? 8 : 0,
      x: canvasSize.width / 2 - 75, y: canvasSize.height / 2 - 75,
      width: 150, height: 150, rotation: 0, opacity: 100,
      visible: true, locked: false, flipX: false, flipY: false,
    };
    commit([...layers, layer]);
    setSelectedId(layer.id);
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
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(canvasSize.width * 0.8 / img.width, canvasSize.height * 0.8 / img.height, 1);
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
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── Drag & Drop on canvas ──────────────────────────────────────────────────
  const onLayerMouseDown = (e: React.MouseEvent, id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer || layer.locked) return;
    e.stopPropagation();
    setSelectedId(id);
    setDragging(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragOffset({
      x: e.clientX / zoom - layer.x,
      y: e.clientY / zoom - layer.y,
    });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!selectedId) return;
      const nx = e.clientX / zoom - dragOffset.x;
      const ny = e.clientY / zoom - dragOffset.y;
      setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, x: nx, y: ny } : l));
    };
    const onUp = () => {
      setDragging(false);
      setLayers(ls => { commit(ls); return ls; });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, selectedId, dragOffset, zoom, commit]);

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") deleteLayer();
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); duplicateLayer(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteLayer, undo, redo, duplicateLayer]);

  // ─── AI Simulations ─────────────────────────────────────────────────────────
  const aiRemoveBackground = async () => {
    const sel = selectedLayer as ImageLayer;
    if (!sel || sel.type !== "image") return;
    setAiLoading("bg-remove");
    await new Promise(r => setTimeout(r, 2200));
    updateLayer(sel.id, { filters: { ...sel.filters, grayscale: 0, sepia: 0 } } as Partial<ImageLayer>);
    setAiLoading(null);
  };

  const aiEnhance = async () => {
    const sel = selectedLayer as ImageLayer;
    if (!sel || sel.type !== "image") return;
    setAiLoading("enhance");
    await new Promise(r => setTimeout(r, 1800));
    updateLayer(sel.id, {
      filters: { ...sel.filters, brightness: 108, contrast: 112, saturation: 118, sharpness: 30 }
    } as Partial<ImageLayer>);
    setAiLoading(null);
  };

  // ─── Export ─────────────────────────────────────────────────────────────────
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
        ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
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
        } else if (layer.shape === "circle") {
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (layer.shape === "triangle") {
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(w / 2, h / 2);
          ctx.lineTo(-w / 2, h / 2);
          ctx.closePath();
          ctx.fill();
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
    };

    if (!layer.visible) return null;

    return (
      <div
        key={layer.id}
        style={style}
        onMouseDown={e => onLayerMouseDown(e, layer.id)}
        className={`group transition-shadow ${selectedId === layer.id ? "ring-2 ring-violet-500 ring-offset-1" : "hover:ring-1 hover:ring-white/40"}`}
      >
        {layer.type === "image" && (
          <img
            src={(layer as ImageLayer).src}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            style={{ filter: filterToCss((layer as ImageLayer).filters), display: "block" }}
          />
        )}
        {layer.type === "text" && (
          <div
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
          <svg width="100%" height="100%" viewBox={`0 0 ${layer.width} ${layer.height}`} xmlns="http://www.w3.org/2000/svg">
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
          <div style={{ fontSize: (layer as StickerLayer).fontSize * zoom, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            {(layer as StickerLayer).emoji}
          </div>
        )}
        {selectedId === layer.id && !layer.locked && (
          <div className="absolute -inset-1 pointer-events-none">
            <div className="absolute -right-2 -bottom-2 w-4 h-4 bg-violet-500 rounded-full border-2 border-white cursor-se-resize" />
            <div className="absolute -right-2 -top-2 w-4 h-4 bg-violet-500 rounded-full border-2 border-white cursor-ne-resize" />
            <div className="absolute -left-2 -bottom-2 w-4 h-4 bg-violet-500 rounded-full border-2 border-white cursor-sw-resize" />
            <div className="absolute -left-2 -top-2 w-4 h-4 bg-violet-500 rounded-full border-2 border-white cursor-nw-resize" />
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
        <div className="flex flex-col gap-1 p-2 border-b border-zinc-800">
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
              className={`flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] font-medium transition ${
                sidebarTab === id ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {sidebarTab === "uploads" && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500 bg-zinc-800/50 p-4 text-center transition group"
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-zinc-500 group-hover:text-violet-400 transition" />
                <p className="text-xs text-zinc-400 group-hover:text-violet-300 transition">Upload Image</p>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Canvas Size</div>
              <div className="space-y-1">
                {CANVAS_SIZES.map(s => (
                  <button
                    key={s.label}
                    onClick={() => setCanvasSize(s)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs transition ${
                      canvasSize.label === s.label ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <span className="font-semibold">{s.label}</span>
                    <span className="ml-2 text-[10px] opacity-60">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Background</div>
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
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Add Text</div>
              <textarea
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm p-2 resize-none focus:outline-none focus:border-violet-500"
                rows={3}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
              />
              <div className="flex gap-2">
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border-0" />
                <button onClick={addTextLayer} className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-2 transition">
                  + Add Text
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setTextColor(c)} className="w-6 h-6 rounded-full border border-zinc-700" style={{ background: c }} />
                ))}
              </div>
              {selectedLayer?.type === "text" && (
                <>
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Typography</p>
                    <select
                      value={(selectedLayer as TextLayer).fontFamily}
                      onChange={e => updateLayer(selectedLayer.id, { fontFamily: e.target.value } as Partial<TextLayer>)}
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5 mb-2"
                    >
                      {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-zinc-500">Size</span>
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
                </>
              )}
            </>
          )}

          {sidebarTab === "shapes" && (
            <>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Shape Color</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setShapeFill(c)} className={`w-6 h-6 rounded-full border-2 transition ${shapeColor === c ? "border-violet-500 scale-110" : "border-transparent hover:border-zinc-600"}`} style={{ background: c }} />
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <input type="color" value={shapeColor} onChange={e => setShapeFill(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border-0" />
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Add Shape</div>
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
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Stickers & Emojis</div>
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
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Preset Filters</div>
              {selectedLayer?.type === "image" ? (
                <div className="grid grid-cols-2 gap-2">
                  {FILTER_PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => updateLayer(selectedLayer.id, { filters: p.filters } as Partial<ImageLayer>)}
                      className="rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-500 p-3 transition text-center"
                    >
                      <div className="w-full h-10 rounded-lg mb-1.5 overflow-hidden flex items-center justify-center bg-zinc-700">
                        <img src={(selectedLayer as ImageLayer).src} alt="" className="h-full w-full object-cover" style={{ filter: filterToCss(p.filters) }} />
                      </div>
                      <span className="text-[11px] text-zinc-300">{p.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 text-center py-4">Select an image layer to apply filters</p>
              )}
            </>
          )}

          {sidebarTab === "adjust" && (
            <>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Adjustments</div>
              {selectedLayer?.type === "image" ? (
                <div className="space-y-3">
                  {([
                    { key: "brightness", label: "Brightness", min: 0, max: 200, default: 100 },
                    { key: "contrast", label: "Contrast", min: 0, max: 200, default: 100 },
                    { key: "saturation", label: "Saturation", min: 0, max: 300, default: 100 },
                    { key: "blur", label: "Blur", min: 0, max: 20, default: 0 },
                    { key: "hueRotate", label: "Hue", min: -180, max: 180, default: 0 },
                    { key: "sepia", label: "Sepia", min: 0, max: 100, default: 0 },
                    { key: "grayscale", label: "Grayscale", min: 0, max: 100, default: 0 },
                    { key: "invert", label: "Invert", min: 0, max: 100, default: 0 },
                  ] as { key: keyof FilterSettings; label: string; min: number; max: number; default: number }[]).map(({ key, label, min, max }) => {
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
                <p className="text-xs text-zinc-500 text-center py-4">Select an image layer to adjust</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Right Properties Panel ─────────────────────────────────────────────────
  const renderPropertiesPanel = () => (
    <div className="w-64 bg-zinc-900 border-l border-zinc-800 flex flex-col">
      {/* Layer list */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-300">Layers</span>
          <span className="text-[10px] text-zinc-600">{layers.length} layers</span>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {[...layers].reverse().map(layer => (
            <div
              key={layer.id}
              onClick={() => setSelectedId(layer.id)}
              className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer transition text-xs ${
                selectedId === layer.id ? "bg-violet-600/30 border border-violet-600/50" : "hover:bg-zinc-800 border border-transparent"
              }`}
            >
              <span className="text-base leading-none">
                {layer.type === "image" ? "🖼️" : layer.type === "text" ? "T" : layer.type === "sticker" ? (layer as StickerLayer).emoji : "■"}
              </span>
              <span className="flex-1 truncate text-zinc-300">{layer.name}</span>
              <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }} className="text-zinc-600 hover:text-zinc-300">
                {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </button>
              <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }} className="text-zinc-600 hover:text-zinc-300">
                {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
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
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Properties</p>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "X", key: "x" }, { label: "Y", key: "y" },
              { label: "W", key: "width" }, { label: "H", key: "height" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-[10px] text-zinc-600 uppercase">{label}</label>
                <input
                  type="number"
                  value={Math.round((selectedLayer as unknown as Record<string, number>)[key])}
                  onChange={e => updateLayer(selectedLayer.id, { [key]: +e.target.value } as Partial<Layer>)}
                  className="w-full rounded bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5 mt-0.5 focus:outline-none focus:border-violet-500"
                />
              </div>
            ))}
          </div>

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

          {/* AI Tools (image layers only) */}
          {selectedLayer.type === "image" && (
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">AI Tools</p>
              <button
                onClick={aiRemoveBackground}
                disabled={!!aiLoading}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-2 transition"
              >
                {aiLoading === "bg-remove" ? (
                  <><span className="animate-spin">⚡</span> Processing...</>
                ) : (
                  <><Wand2 className="h-3.5 w-3.5" /> Remove Background</>
                )}
              </button>
              <button
                onClick={aiEnhance}
                disabled={!!aiLoading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-2 transition"
              >
                {aiLoading === "enhance" ? (
                  <><span className="animate-spin">✨</span> Enhancing...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> AI Enhance</>
                )}
              </button>
            </div>
          )}

          {/* Delete */}
          <button onClick={deleteLayer} className="w-full rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-900/30 text-red-400 hover:text-red-300 text-xs font-semibold py-2 flex items-center justify-center gap-1.5 transition">
            <Trash2 className="h-3.5 w-3.5" /> Delete Layer
          </button>
        </div>
      )}
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-white overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={historyIndex === 0} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition" title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition" title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <div className="w-px h-5 bg-zinc-800" />
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={() => setZoom(0.6)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition" title="Fit to screen">
            <Monitor className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-zinc-500">{canvasSize.width}×{canvasSize.height}</span>
        <button onClick={duplicateLayer} disabled={!selectedLayer} className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition text-xs flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> Duplicate
        </button>
        <button
          onClick={() => setShowExport(true)}
          className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[11rem] shrink-0 overflow-hidden">
          {renderSidebar()}
        </div>

        {/* Canvas area */}
        <div
          className="flex-1 overflow-auto bg-[radial-gradient(circle_at_50%_50%,_#18181b_0%,_#09090b_100%)]"
          style={{ backgroundImage: "radial-gradient(circle, #27272a 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          onMouseDown={() => setSelectedId(null)}
        >
          <div className="min-h-full flex items-center justify-center p-16">
            <div
              ref={canvasRef}
              className="relative shadow-2xl shadow-black/60 overflow-hidden select-none"
              style={{
                width: canvasSize.width * zoom,
                height: canvasSize.height * zoom,
                background: canvasBackground,
              }}
            >
              {layers.map(renderLayerContent)}
              {aiLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="text-center">
                    <div className="text-4xl animate-bounce mb-3">{aiLoading === "bg-remove" ? "🪄" : "✨"}</div>
                    <p className="text-white font-semibold text-sm">
                      {aiLoading === "bg-remove" ? "AI Background Removal..." : "AI Enhancing image..."}
                    </p>
                    <div className="mt-3 flex gap-1 justify-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Properties Panel */}
        {renderPropertiesPanel()}
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
