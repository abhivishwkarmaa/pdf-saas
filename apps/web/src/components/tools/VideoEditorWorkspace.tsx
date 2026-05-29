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
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Scissors,
  Trash2,
  Download,
  Upload,
  Type,
  Music,
  Layers,
  Sparkles,
  Wand2,
  ZoomIn,
  ZoomOut,
  X,
  Film,
  AlignLeft,
  Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackType = "video" | "audio" | "subtitle" | "overlay";
type ExportFormat = "mp4" | "mov" | "webm" | "gif";
type SidePanel = "clips" | "text" | "audio" | "transitions" | "captions" | "effects";
type TransitionKind = "none" | "fade" | "crossfade" | "zoom" | "wipe" | "slide";

interface TimelineClip {
  id: string;
  trackType: TrackType;
  name: string;
  src: string;
  startTime: number;     // seconds on timeline
  duration: number;      // seconds
  trimStart: number;     // seconds trimmed from clip start
  trimEnd: number;       // seconds trimmed from clip end
  volume: number;        // 0-100
  opacity: number;       // 0-100
  transition: TransitionKind;
  transitionDuration: number;
  color: string;         // track color coding
  muted: boolean;
  speed: number;         // 0.25-4
  isAudio?: boolean;
  text?: string;         // for subtitle tracks
  textColor?: string;
  fontSize?: number;
}

interface SubtitleEntry {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  position: "top" | "middle" | "bottom";
  color: string;
  fontSize: number;
  background: boolean;
}

interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  animate: "none" | "fade" | "slide-up" | "typewriter";
}

const TRANSITION_LABELS: Record<TransitionKind, string> = {
  none: "None",
  fade: "Fade",
  crossfade: "Crossfade",
  zoom: "Zoom",
  wipe: "Wipe →",
  slide: "Slide",
};

const EFFECT_PRESETS = [
  { name: "Original", css: "" },
  { name: "Cinematic", css: "contrast(1.2) saturate(0.8) brightness(0.95)" },
  { name: "Warm", css: "sepia(0.3) saturate(1.4) brightness(1.05)" },
  { name: "Cold", css: "hue-rotate(20deg) saturate(1.2)" },
  { name: "Noir", css: "grayscale(1) contrast(1.3)" },
  { name: "Vintage", css: "sepia(0.5) contrast(0.9) brightness(0.95)" },
  { name: "Vivid", css: "saturate(1.8) contrast(1.1)" },
  { name: "Fade", css: "contrast(0.85) brightness(1.1) saturate(0.8)" },
];

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

const TRACK_COLORS: Record<TrackType, string> = {
  video: "#8b5cf6",
  audio: "#06b6d4",
  subtitle: "#10b981",
  overlay: "#f59e0b",
};

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}

// Simulate auto-captions from a video duration
function simulateCaptions(duration: number): SubtitleEntry[] {
  const lines = [
    "Welcome to the video editor",
    "This is an AI-generated caption",
    "Edit and customize your subtitles",
    "Export in MP4, MOV, or WebM",
    "Add transitions and effects",
    "Professional video editing made easy",
  ];
  const interval = duration / lines.length;
  return lines.map((text, i) => ({
    id: uid(),
    startTime: i * interval,
    endTime: (i + 1) * interval - 0.5,
    text,
    position: "bottom",
    color: "#ffffff",
    fontSize: 20,
    background: true,
  }));
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoEditorWorkspace({ tool }: { tool: ToolDefinition }) {
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(60);
  const [zoom, setZoom] = useState(1); // pixels per second
  const [sidePanel, setSidePanel] = useState<SidePanel>("clips");
  const [activeEffect, setActiveEffect] = useState("");
  const [masterVolume, setMasterVolume] = useState(80);
  const [masterMuted, setMasterMuted] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("mp4");
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [addTextMode, setAddTextMode] = useState(false);
  const [newOverlayText, setNewOverlayText] = useState("Your text");
  const [newOverlayColor, setNewOverlayColor] = useState("#ffffff");
  const [selectedTransition, setSelectedTransition] = useState<TransitionKind>("fade");

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<number | null>(null);

  const selectedClip = useMemo(() => clips.find(c => c.id === selectedClipId), [clips, selectedClipId]);
  const videoClips = useMemo(() => clips.filter(c => c.trackType === "video"), [clips]);
  const audioClips = useMemo(() => clips.filter(c => c.trackType === "audio"), [clips]);

  // Calculate total duration from all clips
  useEffect(() => {
    const max = clips.reduce((m, c) => Math.max(m, c.startTime + c.duration), 0);
    setTotalDuration(Math.max(max, 30));
  }, [clips]);

  // Pixel scaling per second for timeline
  const PX_PER_SEC = 80 * zoom;

  // ─── Playback Engine ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (playing) {
      const start = Date.now() - currentTime * 1000;
      const tick = () => {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed >= totalDuration) {
          setCurrentTime(totalDuration);
          setPlaying(false);
          return;
        }
        setCurrentTime(elapsed);
        playbackRef.current = requestAnimationFrame(tick);
      };
      playbackRef.current = requestAnimationFrame(tick);
    } else {
      if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    }
    return () => { if (playbackRef.current) cancelAnimationFrame(playbackRef.current); };
  }, [playing, totalDuration]);

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (clips.length > 0) {
        try {
          localStorage.setItem("video-editor-session", JSON.stringify({ clips, subtitles, overlays }));
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 2000);
        } catch { /* ignore */ }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [clips, subtitles, overlays]);

  // Restore session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("video-editor-session");
      if (saved) {
        const data = JSON.parse(saved) as { clips: TimelineClip[]; subtitles: SubtitleEntry[]; overlays: TextOverlay[] };
        if (data.clips?.length > 0) {
          setClips(data.clips);
          setSubtitles(data.subtitles ?? []);
          setOverlays(data.overlays ?? []);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ─── File Imports ─────────────────────────────────────────────────────────────
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const src = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.src = src;
      vid.onloadedmetadata = () => {
        const lastEnd = clips.filter(c => c.trackType === "video").reduce((m, c) => Math.max(m, c.startTime + c.duration), 0);
        const clip: TimelineClip = {
          id: uid(),
          trackType: "video",
          name: file.name.slice(0, 25),
          src,
          startTime: lastEnd,
          duration: vid.duration,
          trimStart: 0,
          trimEnd: vid.duration,
          volume: 80,
          opacity: 100,
          transition: "fade",
          transitionDuration: 0.5,
          color: TRACK_COLORS.video,
          muted: false,
          speed: 1,
        };
        setClips(prev => [...prev, clip]);
        setSelectedClipId(clip.id);
      };
    });
    e.target.value = "";
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    const aud = document.createElement("audio");
    aud.src = src;
    aud.onloadedmetadata = () => {
      const clip: TimelineClip = {
        id: uid(),
        trackType: "audio",
        name: file.name.slice(0, 25),
        src,
        startTime: 0,
        duration: aud.duration,
        trimStart: 0,
        trimEnd: aud.duration,
        volume: 60,
        opacity: 100,
        transition: "none",
        transitionDuration: 0,
        color: TRACK_COLORS.audio,
        muted: false,
        speed: 1,
        isAudio: true,
      };
      setClips(prev => [...prev, clip]);
    };
    e.target.value = "";
  };

  // ─── Timeline Click → seek ───────────────────────────────────────────────────
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const t = x / PX_PER_SEC;
    setCurrentTime(Math.max(0, Math.min(t, totalDuration)));
  };

  // ─── Clip Operations ─────────────────────────────────────────────────────────
  const splitClip = useCallback(() => {
    const clip = clips.find(c => c.id === selectedClipId);
    if (!clip) return;
    const splitAt = currentTime - clip.startTime;
    if (splitAt <= 0 || splitAt >= clip.duration) return;

    const partA: TimelineClip = { ...clip, id: uid(), duration: splitAt, trimEnd: clip.trimStart + splitAt };
    const partB: TimelineClip = { ...clip, id: uid(), startTime: clip.startTime + splitAt, duration: clip.duration - splitAt, trimStart: clip.trimStart + splitAt };
    setClips(prev => prev.filter(c => c.id !== selectedClipId).concat([partA, partB]));
    setSelectedClipId(partA.id);
  }, [clips, selectedClipId, currentTime]);

  const deleteClip = useCallback(() => {
    if (!selectedClipId) return;
    setClips(prev => prev.filter(c => c.id !== selectedClipId));
    setSelectedClipId(null);
  }, [selectedClipId]);

  const updateClip = useCallback((id: string, patch: Partial<TimelineClip>) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  // ─── Clip drag on timeline ───────────────────────────────────────────────────
  const onClipDragStart = (e: React.MouseEvent, id: string) => {
    const clip = clips.find(c => c.id === id);
    if (!clip) return;
    e.stopPropagation();
    setSelectedClipId(id);
    const startX = e.clientX;
    const origStart = clip.startTime;

    const onMove = (me: MouseEvent) => {
      const delta = (me.clientX - startX) / PX_PER_SEC;
      const newStart = Math.max(0, origStart + delta);
      setClips(prev => prev.map(c => c.id === id ? { ...c, startTime: newStart } : c));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ─── AI Auto-Captions ────────────────────────────────────────────────────────
  const aiGenerateCaptions = async () => {
    const firstVideo = clips.find(c => c.trackType === "video");
    if (!firstVideo) return;
    setAiLoading("captions");
    await new Promise(r => setTimeout(r, 2500));
    const caps = simulateCaptions(firstVideo.duration);
    setSubtitles(prev => [...prev, ...caps]);
    setAiLoading(null);
    setSidePanel("captions");
  };

  // ─── Add Text Overlay ────────────────────────────────────────────────────────
  const addTextOverlay = () => {
    const overlay: TextOverlay = {
      id: uid(),
      text: newOverlayText,
      startTime: currentTime,
      duration: 3,
      x: 50,
      y: 80,
      fontSize: 36,
      color: newOverlayColor,
      bold: false,
      animate: "fade",
    };
    setOverlays(prev => [...prev, overlay]);
  };

  // ─── Export simulation ────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (videoClips.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    for (let i = 0; i <= 100; i += 2) {
      await new Promise(r => setTimeout(r, 60));
      setExportProgress(i);
    }
    // Just download the first video file as a placeholder (real impl needs FFmpeg)
    const a = document.createElement("a");
    a.href = videoClips[0].src;
    a.download = `edited.${exportFormat}`;
    a.click();
    setIsExporting(false);
    setShowExport(false);
  };

  // ─── Current subtitles for player overlay ────────────────────────────────────
  const activeSubs = useMemo(() =>
    subtitles.filter(s => currentTime >= s.startTime && currentTime <= s.endTime),
    [subtitles, currentTime]
  );

  const activeOverlays = useMemo(() =>
    overlays.filter(o => currentTime >= o.startTime && currentTime <= o.startTime + o.duration),
    [overlays, currentTime]
  );

  // ─── Render Sidebar Panel ────────────────────────────────────────────────────
  const renderSidePanel = () => (
    <div className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Tab icons */}
      <div className="flex flex-col gap-1 p-2 border-b border-zinc-800">
        {([
          { id: "clips", icon: Film, label: "Media" },
          { id: "text", icon: Type, label: "Text" },
          { id: "audio", icon: Music, label: "Audio" },
          { id: "transitions", icon: Layers, label: "Fx" },
          { id: "captions", icon: AlignLeft, label: "Captions" },
          { id: "effects", icon: Wand2, label: "Effects" },
        ] as { id: SidePanel; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setSidePanel(id)}
            className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition ${
              sidePanel === id ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sidePanel === "clips" && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500 bg-zinc-800/50 p-4 text-center transition group"
            >
              <Upload className="h-5 w-5 mx-auto mb-1.5 text-zinc-500 group-hover:text-violet-400 transition" />
              <p className="text-xs text-zinc-400 group-hover:text-violet-300 transition">Import Video</p>
            </button>
            <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleVideoUpload} />
            <div className="space-y-1">
              {videoClips.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedClipId(c.id)}
                  className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer text-xs transition ${
                    selectedClipId === c.id ? "bg-violet-600/30 border border-violet-600/50" : "bg-zinc-800 hover:bg-zinc-750 border border-transparent"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="flex-1 truncate text-zinc-300">{c.name}</span>
                  <span className="text-zinc-600">{fmtTime(c.duration)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {sidePanel === "text" && (
          <>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Text Overlay</p>
            <textarea
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs p-2 resize-none focus:outline-none focus:border-violet-500"
              rows={3}
              value={newOverlayText}
              onChange={e => setNewOverlayText(e.target.value)}
              placeholder="Enter text..."
            />
            <div className="flex gap-2">
              <input type="color" value={newOverlayColor} onChange={e => setNewOverlayColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
              <button onClick={addTextOverlay} className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-2 transition">
                + Add at {fmtTime(currentTime)}
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">Overlays on Timeline</p>
            <div className="space-y-1">
              {overlays.map(o => (
                <div key={o.id} className="flex items-center gap-2 bg-zinc-800 rounded-lg p-2">
                  <span className="flex-1 text-xs text-zinc-300 truncate">{o.text}</span>
                  <span className="text-[10px] text-zinc-600">{fmtTime(o.startTime)}</span>
                  <button onClick={() => setOverlays(prev => prev.filter(x => x.id !== o.id))} className="text-zinc-600 hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {sidePanel === "audio" && (
          <>
            <button
              onClick={() => audioInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-zinc-700 hover:border-cyan-500 bg-zinc-800/50 p-4 text-center transition group"
            >
              <Music className="h-5 w-5 mx-auto mb-1.5 text-zinc-500 group-hover:text-cyan-400 transition" />
              <p className="text-xs text-zinc-400 group-hover:text-cyan-300 transition">Import Audio / Music</p>
            </button>
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
            {audioClips.length > 0 && (
              <div className="space-y-2">
                {audioClips.map(c => (
                  <div key={c.id} className="rounded-xl bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Music className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-xs text-zinc-300 truncate flex-1">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 text-zinc-500" />
                      <input type="range" min={0} max={100} value={c.volume}
                        onChange={e => updateClip(c.id, { volume: +e.target.value })}
                        className="flex-1 accent-cyan-500" />
                      <span className="text-[10px] text-zinc-600 w-7">{c.volume}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Master Volume</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setMasterMuted(m => !m)} className="text-zinc-400 hover:text-white">
                  {masterMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input type="range" min={0} max={100} value={masterVolume}
                  onChange={e => setMasterVolume(+e.target.value)}
                  className="flex-1 accent-violet-500" />
                <span className="text-[10px] text-zinc-600 w-7">{masterVolume}%</span>
              </div>
            </div>
          </>
        )}

        {sidePanel === "transitions" && (
          <>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Transitions</p>
            {selectedClip ? (
              <>
                <p className="text-xs text-zinc-400">Transition for: <span className="text-white">{selectedClip.name}</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TRANSITION_LABELS) as TransitionKind[]).map(t => (
                    <button
                      key={t}
                      onClick={() => updateClip(selectedClip.id, { transition: t })}
                      className={`rounded-xl p-2.5 text-center text-xs font-medium transition border ${
                        selectedClip.transition === t
                          ? "border-violet-500 bg-violet-600/20 text-white"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {TRANSITION_LABELS[t]}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Transition Duration</p>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0.1} max={3} step={0.1} value={selectedClip.transitionDuration}
                      onChange={e => updateClip(selectedClip.id, { transitionDuration: +e.target.value })}
                      className="flex-1 accent-violet-500" />
                    <span className="text-[10px] text-zinc-600 w-8">{selectedClip.transitionDuration.toFixed(1)}s</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-600 py-2">Select a clip on the timeline to assign transitions</p>
            )}
            <div className="border-t border-zinc-800 pt-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Speed Control</p>
              {selectedClip ? (
                <div className="grid grid-cols-4 gap-1">
                  {SPEED_OPTIONS.map(s => (
                    <button key={s} onClick={() => updateClip(selectedClip.id, { speed: s })}
                      className={`rounded-lg py-1.5 text-[10px] font-bold transition ${selectedClip.speed === s ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                      {s}x
                    </button>
                  ))}
                </div>
              ) : <p className="text-xs text-zinc-600">Select a clip first</p>}
            </div>
          </>
        )}

        {sidePanel === "captions" && (
          <>
            <button
              onClick={aiGenerateCaptions}
              disabled={!!aiLoading || videoClips.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-2 transition"
            >
              {aiLoading === "captions" ? (
                <><span className="animate-spin">🤖</span> Generating AI Captions...</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> AI Auto-Captions</>
              )}
            </button>
            <div className="space-y-1.5">
              {subtitles.map(s => (
                <div key={s.id} className={`rounded-xl bg-zinc-800 border p-2.5 cursor-pointer transition ${selectedSubId === s.id ? "border-violet-500" : "border-zinc-700 hover:border-zinc-600"}`}
                  onClick={() => setSelectedSubId(s.id)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-emerald-400">{fmtTime(s.startTime)} → {fmtTime(s.endTime)}</span>
                    <button onClick={e => { e.stopPropagation(); setSubtitles(prev => prev.filter(x => x.id !== s.id)); }} className="ml-auto text-zinc-600 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {selectedSubId === s.id ? (
                    <textarea
                      className="w-full bg-zinc-700 text-white text-xs p-1.5 rounded focus:outline-none resize-none"
                      rows={2}
                      value={s.text}
                      onChange={e => setSubtitles(prev => prev.map(x => x.id === s.id ? { ...x, text: e.target.value } : x))}
                    />
                  ) : (
                    <p className="text-xs text-zinc-300 truncate">{s.text}</p>
                  )}
                </div>
              ))}
              {subtitles.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-4">No captions yet. Use AI to generate them.</p>
              )}
            </div>
          </>
        )}

        {sidePanel === "effects" && (
          <>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Cinematic Effects</p>
            <div className="grid grid-cols-2 gap-2">
              {EFFECT_PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => setActiveEffect(p.css)}
                  className={`rounded-xl border p-3 text-center text-xs font-medium transition ${
                    activeEffect === p.css ? "border-violet-500 bg-violet-600/20 text-white" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  <div className="w-full h-8 rounded-lg mb-1.5 bg-zinc-700 flex items-center justify-center text-base">🎬</div>
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ─── Timeline Render ──────────────────────────────────────────────────────────
  const renderTimeline = () => {
    const timeMarkers = [];
    const step = totalDuration > 120 ? 30 : totalDuration > 60 ? 10 : 5;
    for (let t = 0; t <= totalDuration; t += step) {
      timeMarkers.push(t);
    }

    const tracks: { type: TrackType; label: string; icon: React.ElementType }[] = [
      { type: "video", label: "Video", icon: Film },
      { type: "audio", label: "Audio", icon: Music },
      { type: "subtitle", label: "Subtitles", icon: AlignLeft },
    ];

    return (
      <div className="flex-1 flex flex-col bg-zinc-950 border-t border-zinc-800 select-none" style={{ minHeight: 220 }}>
        {/* Timeline toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <button onClick={() => setCurrentTime(0)} className="text-zinc-400 hover:text-white"><SkipBack className="h-4 w-4" /></button>
          <button onClick={() => setPlaying(p => !p)} className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center transition">
            {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
          </button>
          <button onClick={() => setCurrentTime(totalDuration)} className="text-zinc-400 hover:text-white"><SkipForward className="h-4 w-4" /></button>
          <span className="text-xs text-zinc-400 font-mono">{fmtTime(currentTime)} / {fmtTime(totalDuration)}</span>
          <div className="flex-1" />
          <button onClick={splitClip} disabled={!selectedClipId} title="Split at playhead" className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition">
            <Scissors className="h-3.5 w-3.5" /> Split
          </button>
          <button onClick={deleteClip} disabled={!selectedClipId} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20 disabled:opacity-30 transition">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
            <ZoomOut className="h-3.5 w-3.5 text-zinc-500" />
            <input type="range" min={0.2} max={4} step={0.1} value={zoom} onChange={e => setZoom(+e.target.value)} className="w-20 accent-violet-500" />
            <ZoomIn className="h-3.5 w-3.5 text-zinc-500" />
          </div>
        </div>

        {/* Timeline scroll area */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Track labels */}
            <div className="w-24 shrink-0 bg-zinc-900 border-r border-zinc-800">
              <div className="h-6 border-b border-zinc-800" />
              {tracks.map(({ type, label, icon: Icon }) => (
                <div key={type} className="h-14 flex items-center gap-1.5 px-2 border-b border-zinc-800 text-xs text-zinc-400">
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </div>
              ))}
              {/* Subtitle overlays row */}
              <div className="h-10 flex items-center gap-1.5 px-2 border-b border-zinc-800 text-xs text-zinc-400">
                <Type className="h-3 w-3" />
                <span>Overlays</span>
              </div>
            </div>

            {/* Main timeline area */}
            <div
              ref={timelineRef}
              className="relative flex-1 cursor-crosshair"
              style={{ width: totalDuration * PX_PER_SEC + 64 }}
              onClick={handleTimelineClick}
            >
              {/* Time ruler */}
              <div className="h-6 border-b border-zinc-800 relative bg-zinc-900">
                {timeMarkers.map(t => (
                  <div key={t} className="absolute top-0 flex flex-col items-center" style={{ left: t * PX_PER_SEC }}>
                    <div className="w-px h-3 bg-zinc-600" />
                    <span className="text-[9px] text-zinc-600 mt-0.5">{fmtTime(t)}</span>
                  </div>
                ))}
                {/* Playhead on ruler */}
                <div className="absolute top-0 z-10 flex flex-col items-center pointer-events-none" style={{ left: currentTime * PX_PER_SEC }}>
                  <div className="w-2 h-2 bg-violet-500 rotate-45 -mt-0.5" />
                </div>
              </div>

              {/* Track rows */}
              {tracks.map(({ type }) => (
                <div key={type} className="relative h-14 border-b border-zinc-800" style={{ background: "rgba(0,0,0,0.2)" }}>
                  {clips.filter(c => c.trackType === type).map(clip => (
                    <div
                      key={clip.id}
                      onMouseDown={e => onClipDragStart(e, clip.id)}
                      onClick={e => { e.stopPropagation(); setSelectedClipId(clip.id); }}
                      className={`absolute top-1.5 h-11 rounded-lg cursor-grab active:cursor-grabbing flex items-center overflow-hidden transition-all ${
                        selectedClipId === clip.id ? "ring-2 ring-white/60" : ""
                      }`}
                      style={{
                        left: clip.startTime * PX_PER_SEC,
                        width: Math.max(clip.duration * PX_PER_SEC, 24),
                        background: clip.color + "33",
                        borderLeft: `3px solid ${clip.color}`,
                      }}
                      title={clip.name}
                    >
                      <span className="px-2 text-[10px] text-white font-medium truncate">{clip.name}</span>
                      {clip.speed !== 1 && (
                        <span className="ml-auto mr-2 text-[9px] text-yellow-400 font-bold">{clip.speed}x</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Subtitles row */}
              <div className="relative h-10 border-b border-zinc-800" style={{ background: "rgba(0,0,0,0.1)" }}>
                {subtitles.map(sub => (
                  <div
                    key={sub.id}
                    className="absolute top-1 h-8 rounded bg-emerald-600/30 border-l-2 border-emerald-500 flex items-center px-1.5 cursor-pointer overflow-hidden"
                    style={{ left: sub.startTime * PX_PER_SEC, width: Math.max((sub.endTime - sub.startTime) * PX_PER_SEC, 16) }}
                    onClick={e => { e.stopPropagation(); setSelectedSubId(sub.id); setSidePanel("captions"); }}
                    title={sub.text}
                  >
                    <span className="text-[10px] text-emerald-300 truncate">{sub.text}</span>
                  </div>
                ))}
                {overlays.map(o => (
                  <div
                    key={o.id}
                    className="absolute top-1 h-8 rounded bg-amber-600/30 border-l-2 border-amber-500 flex items-center px-1.5 overflow-hidden"
                    style={{ left: o.startTime * PX_PER_SEC, width: Math.max(o.duration * PX_PER_SEC, 16) }}
                    title={o.text}
                  >
                    <span className="text-[10px] text-amber-300 truncate">{o.text}</span>
                  </div>
                ))}
              </div>

              {/* Playhead line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-violet-500 z-20 pointer-events-none"
                style={{ left: currentTime * PX_PER_SEC }}
              >
                <div className="w-3 h-3 bg-violet-500 rounded-full -ml-1.5 -mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <Film className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold text-white">Video Editor</span>
        <div className="flex-1" />
        {autoSaved && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <Save className="h-3 w-3" /> Auto-saved
          </span>
        )}
        <button
          onClick={() => {
            if (clips.length > 0) {
              localStorage.setItem("video-editor-session", JSON.stringify({ clips, subtitles, overlays }));
              setAutoSaved(true);
              setTimeout(() => setAutoSaved(false), 2000);
            }
          }}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition"
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
        <button
          onClick={() => setShowExport(true)}
          className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left side panel */}
        {renderSidePanel()}

        {/* Center: Player + Properties */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Player monitor */}
          <div className="flex-1 flex items-center justify-center bg-zinc-950 overflow-hidden p-4">
            <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: "16/9", maxHeight: "100%", maxWidth: "100%" }}>
              {videoClips.length > 0 ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoClips[0].src}
                    className="w-full h-full object-contain"
                    style={{ filter: activeEffect }}
                    muted
                  />
                  {/* Subtitle overlay */}
                  {activeSubs.map(sub => (
                    <div
                      key={sub.id}
                      className="absolute inset-x-0 px-4"
                      style={{ bottom: sub.position === "bottom" ? "10%" : sub.position === "middle" ? "45%" : "80%" }}
                    >
                      <div className={`mx-auto max-w-lg text-center ${sub.background ? "bg-black/60 px-3 py-1 rounded-lg" : ""}`}
                        style={{ color: sub.color, fontSize: sub.fontSize }}>
                        {sub.text}
                      </div>
                    </div>
                  ))}
                  {/* Text overlays */}
                  {activeOverlays.map(o => (
                    <div key={o.id} className="absolute"
                      style={{ left: `${o.x}%`, top: `${o.y}%`, color: o.color, fontSize: o.fontSize, fontWeight: o.bold ? "bold" : "normal", transform: "translate(-50%, -50%)" }}>
                      {o.text}
                    </div>
                  ))}
                  {/* Playing overlay */}
                  {!playing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => setPlaying(true)}
                        className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition"
                      >
                        <Play className="h-7 w-7 text-white ml-1" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                  <Film className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-sm font-medium">Import a video to start editing</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition"
                  >
                    + Import Video
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selected clip properties bar */}
          {selectedClip && (
            <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900 border-t border-zinc-800 text-xs shrink-0">
              <span className="text-zinc-400">Clip: <span className="text-white">{selectedClip.name}</span></span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">Duration: <span className="text-white">{fmtTime(selectedClip.duration)}</span></span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">Speed: <span className="text-white">{selectedClip.speed}x</span></span>
              <span className="text-zinc-600">|</span>
              <div className="flex items-center gap-1">
                <Volume2 className="h-3.5 w-3.5 text-zinc-500" />
                <input type="range" min={0} max={100} value={selectedClip.volume}
                  onChange={e => updateClip(selectedClip.id, { volume: +e.target.value })}
                  className="w-20 accent-violet-500" />
                <span className="text-zinc-400 w-7">{selectedClip.volume}%</span>
              </div>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">Transition: <span className="text-violet-400">{TRANSITION_LABELS[selectedClip.transition]}</span></span>
            </div>
          )}

          {/* Timeline */}
          {renderTimeline()}
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Export Video</h3>
              <button onClick={() => setShowExport(false)} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isExporting ? (
              <div className="text-center py-6">
                <div className="text-4xl animate-bounce mb-4">🎬</div>
                <p className="text-white font-semibold mb-2">Exporting {exportFormat.toUpperCase()}...</p>
                <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
                  <div className="bg-violet-600 h-2 rounded-full transition-all" style={{ width: `${exportProgress}%` }} />
                </div>
                <p className="text-zinc-500 text-sm">{exportProgress}%</p>
              </div>
            ) : (
              <>
                <p className="text-zinc-400 text-sm mb-4">Choose your export format:</p>
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {(["mp4", "mov", "webm", "gif"] as ExportFormat[]).map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt)}
                      className={`rounded-xl border p-3 text-center text-xs font-bold uppercase transition ${
                        exportFormat === fmt ? "border-violet-500 bg-violet-600/20 text-white" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}>
                      {fmt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleExport}
                  disabled={videoClips.length === 0}
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 flex items-center justify-center gap-2 transition"
                >
                  <Download className="h-5 w-5" /> Export {exportFormat.toUpperCase()}
                </button>
                {videoClips.length === 0 && <p className="text-red-400 text-xs text-center mt-2">Import at least one video clip first.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
