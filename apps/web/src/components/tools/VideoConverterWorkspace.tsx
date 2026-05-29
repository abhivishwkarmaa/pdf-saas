"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import { 
  Play, Pause, Sliders, Cpu, History, Zap, Settings, Terminal, 
  Download, RefreshCw, Plus, Check, ChevronDown, Trash, Clock, 
  Sparkles, FileVideo, HardDrive, Percent, Gauge, Video, Wrench, X, AlertCircle
} from "lucide-react";
import { CATEGORY_THEME } from "@/lib/category-theme";

interface VideoConverterWorkspaceProps {
  tool: ToolDefinition;
}

interface Preset {
  id: string;
  name: string;
  format: string;
  resolution: string;
  fps: string;
  codec: string;
  bitrate: string;
}

interface FileItem {
  id: string;
  file: File;
  format: string;
  status: "idle" | "queued" | "processing" | "completed" | "failed";
  progress: number;
  speed: string;
  eta: string;
  error?: string;
  logs: string[];
  jobId: string | null;
  downloadUrl?: string;
  downloadUrls?: { name: string; url: string }[];
  options: FileOptions;
}

interface FileOptions {
  codec: string;
  resolution: string;
  fps: string;
  bitrate: string;
  crf: string;
  rotate: string; // "", "90", "180", "270"
  speed: string; // "1.0", "0.25", "0.5", "1.5", "2.0", "4.0"
  reverse: boolean;
  // Audio
  audioCodec: string;
  audioBitrate: string;
  volume: string;
  mute: boolean;
  audioFile: File | null;
  audioMergeMode: "replace" | "mix";
  // Trim/Crop
  trimStart: string;
  trimEnd: string;
  cropW: string;
  cropH: string;
  cropX: string;
  cropY: string;
  aspectRatio: string;
  splitPoints: string;
  // Watermark
  watermarkText: string;
  watermarkOpacity: string;
  watermarkPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  // Compression Mode
  compressMode: "smart" | "manual" | "lossless" | "target-size" | "bitrate";
  targetSizeMb: string;
  imageDuration: string; // slideshow duration per image
  // AI
  aiDenoise: boolean;
  aiEnhance: boolean;
  aiUpscale: boolean;
  aiCaptions: boolean;
  aiSceneDetect: boolean;
}

const DEFAULT_OPTIONS = (): FileOptions => ({
  codec: "h264",
  resolution: "",
  fps: "",
  bitrate: "",
  crf: "23",
  rotate: "",
  speed: "1.0",
  reverse: false,
  audioCodec: "aac",
  audioBitrate: "128k",
  volume: "100",
  mute: false,
  audioFile: null,
  audioMergeMode: "replace",
  trimStart: "",
  trimEnd: "",
  cropW: "",
  cropH: "",
  cropX: "0",
  cropY: "0",
  aspectRatio: "",
  splitPoints: "",
  watermarkText: "",
  watermarkOpacity: "0.5",
  watermarkPosition: "bottom-right",
  compressMode: "smart",
  targetSizeMb: "25",
  imageDuration: "5",
  aiDenoise: false,
  aiEnhance: false,
  aiUpscale: false,
  aiCaptions: false,
  aiSceneDetect: false,
});

export function VideoConverterWorkspace({ tool }: VideoConverterWorkspaceProps) {
  const theme = CATEGORY_THEME.video;

  // Files in queue
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [activeSettingsItem, setActiveSettingsItem] = useState<FileItem | null>(null);
  
  // Custom presets
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");

  // Merge Mode state
  const [mergeFiles, setMergeFiles] = useState(false);
  const [slideshowMode, setSlideshowMode] = useState(false);

  // UI Tabs & terminal toggle
  const [activeWrenchTab, setActiveWrenchTab] = useState<"video" | "audio" | "trim" | "compress" | "ai">("video");
  const [activeLogItem, setActiveLogItem] = useState<FileItem | null>(null);

  // Load presets on mount
  useEffect(() => {
    fetchPresets();
  }, []);

  // Poll status of all processing files in loop
  useEffect(() => {
    const activeItems = fileItems.filter((item) => item.status === "queued" || item.status === "processing");
    if (activeItems.length === 0) return;

    const timerId = setTimeout(async () => {
      const updatedItems = await Promise.all(
        fileItems.map(async (item) => {
          if ((item.status !== "queued" && item.status !== "processing") || !item.jobId) {
            return item;
          }

          try {
            const res = await fetch(`/api/jobs/${item.jobId}`);
            if (!res.ok) throw new Error("Failed to poll");
            const jobData = await res.json();
            
            const updated: FileItem = {
              ...item,
              status: jobData.status,
              progress: jobData.progress,
              speed: jobData.speed,
              eta: jobData.eta,
              error: jobData.error,
              logs: jobData.logs,
              downloadUrl: jobData.downloadUrl,
              downloadUrls: jobData.downloadUrls,
            };

            if (jobData.status === "completed") {
              toast.success(`Completed conversion for: ${item.file.name}`);
            } else if (jobData.status === "failed") {
              toast.error(`Failed conversion for: ${item.file.name}`);
            }

            return updated;
          } catch {
            return item;
          }
        })
      );
      setFileItems(updatedItems);
    }, 1500);

    return () => clearTimeout(timerId);
  }, [fileItems]);

  const fetchPresets = async () => {
    try {
      const res = await fetch("/api/presets");
      const data = await res.json();
      setPresets(data.presets || []);
    } catch {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    
    const newItems: FileItem[] = newFiles.map((file) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      file,
      format: file.type.startsWith("image/") ? "mp4" : "mp4",
      status: "idle",
      progress: 0,
      speed: "0.0x",
      eta: "--:--",
      logs: ["Waiting for encoding trigger..."],
      jobId: null,
      options: DEFAULT_OPTIONS(),
    }));

    setFileItems([...fileItems, ...newItems]);
    toast.success(`Added ${newFiles.length} files to queue.`);

    const hasImages = newFiles.some(f => f.type.startsWith("image/") && !f.name.endsWith(".gif"));
    if (hasImages) {
      setSlideshowMode(true);
      setMergeFiles(true);
    }
  };

  const removeFileItem = (id: string) => {
    setFileItems(fileItems.filter((item) => item.id !== id));
  };

  const updateFileFormat = (id: string, format: string) => {
    setFileItems(
      fileItems.map((item) => (item.id === id ? { ...item, format } : item))
    );
  };

  // Convert Single File
  const convertFile = async (item: FileItem) => {
    if (item.status === "queued" || item.status === "processing") return;

    setFileItems(
      fileItems.map((f) => (f.id === item.id ? { ...f, status: "queued", progress: 5 } : f))
    );

    const formData = new FormData();
    formData.append("files", item.file);

    const opt = item.options;
    if (opt.audioFile) {
      formData.append("audio_file", opt.audioFile);
    }

    const optionsPayload = {
      task: "convert",
      format: item.format,
      codec: opt.codec === "copy" ? "copy" : opt.codec,
      resolution: opt.resolution || undefined,
      fps: opt.fps || undefined,
      bitrate: opt.bitrate || undefined,
      compressMode: opt.compressMode,
      compressLevel: "medium",
      crf: opt.crf,
      rotate: opt.rotate || undefined,
      speed: opt.speed || undefined,
      reverse: opt.reverse,
      // Audio
      mute: opt.mute || opt.audioCodec === "none",
      removeAudio: opt.mute || opt.audioCodec === "none",
      audioCodec: opt.audioCodec === "none" ? undefined : opt.audioCodec,
      audioBitrate: opt.audioBitrate,
      volume: opt.volume,
      audioMergeMode: opt.audioMergeMode,
      // Trim/Crop/Split
      trimStart: opt.trimStart || undefined,
      trimDuration: opt.trimEnd ? String(calculateDuration(opt.trimStart, opt.trimEnd)) : undefined,
      cropW: opt.cropW || undefined,
      cropH: opt.cropH || undefined,
      cropX: opt.cropX || undefined,
      cropY: opt.cropY || undefined,
      aspectRatio: opt.aspectRatio || undefined,
      splitPoints: opt.splitPoints || undefined,
      // Watermark
      watermarkText: opt.watermarkText || undefined,
      watermarkOpacity: opt.watermarkOpacity,
      watermarkPosition: opt.watermarkPosition,
      // Compression
      targetSizeMb: opt.targetSizeMb || undefined,
      // AI
      aiDenoise: opt.aiDenoise,
      aiEnhance: opt.aiEnhance,
      aiUpscale: opt.aiUpscale,
      aiCaptions: opt.aiCaptions,
    };

    formData.append("options", JSON.stringify(optionsPayload));

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start conversion");
      }

      const data = await res.json();
      setFileItems(
        fileItems.map((f) => 
          f.id === item.id 
            ? { ...f, status: data.status, jobId: data.jobId, logs: ["Job queued...", "Awaiting background processing..."] } 
            : f
        )
      );
    } catch (err: any) {
      toast.error(`Error starting ${item.file.name}: ${err.message}`);
      setFileItems(
        fileItems.map((f) => (f.id === item.id ? { ...f, status: "failed", error: err.message } : f))
      );
    }
  };

  const calculateDuration = (start: string, end: string): number => {
    const parse = (time: string) => {
      const parts = time.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return Number(time) || 0;
    };
    return Math.max(1, parse(end) - parse(start));
  };

  // Convert/Merge All Files
  const convertAll = async () => {
    const idleItems = fileItems.filter((item) => item.status === "idle" || item.status === "failed");
    if (idleItems.length === 0) {
      toast.warning("No files waiting to convert.");
      return;
    }

    if (mergeFiles) {
      // Merging multiple videos or images slideshow
      setFileItems(
        fileItems.map((f) => ({ ...f, status: "queued", progress: 5 }))
      );

      const formData = new FormData();
      fileItems.forEach((f) => {
        formData.append("files", f.file);
      });

      const opt = fileItems[0].options;
      const optionsPayload = {
        task: slideshowMode ? "slideshow" : "merge",
        format: fileItems[0].format,
        imageDuration: opt.imageDuration,
        mute: opt.mute,
        codec: opt.codec,
        resolution: opt.resolution,
        fps: opt.fps,
        bitrate: opt.bitrate,
        compressMode: opt.compressMode,
        compressLevel: "medium",
        crf: opt.crf,
      };

      formData.append("options", JSON.stringify(optionsPayload));

      try {
        const res = await fetch("/api/jobs", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to start merge job");
        }

        const data = await res.json();
        setFileItems(
          fileItems.map((f) => ({
            ...f,
            status: data.status,
            jobId: data.jobId,
            logs: ["Stitching / merging multiple inputs...", "Job queued on server..."]
          }))
        );
        toast.success(slideshowMode ? "Slideshow generation started!" : "Batch merging started!");
      } catch (err: any) {
        toast.error(`Merge action failed: ${err.message}`);
        setFileItems(
          fileItems.map((f) => ({ ...f, status: "failed", error: err.message }))
        );
      }
    } else {
      // Concurrent standard batch process
      idleItems.forEach((item) => convertFile(item));
    }
  };

  // Download All Completed files
  const downloadAll = () => {
    const completed = fileItems.filter((item) => item.status === "completed");
    if (completed.length === 0) {
      toast.warning("No completed files to download.");
      return;
    }
    let delay = 0;
    completed.forEach((item) => {
      if (item.downloadUrls && item.downloadUrls.length > 0) {
        item.downloadUrls.forEach((dl) => {
          setTimeout(() => {
            const a = document.createElement("a");
            a.href = dl.url;
            a.download = dl.name;
            a.click();
          }, delay);
          delay += 800;
        });
      } else if (item.downloadUrl) {
        setTimeout(() => {
          const a = document.createElement("a");
          a.href = item.downloadUrl!;
          a.download = item.file.name.replace(/\.[^/.]+$/, "") + "." + item.format;
          a.click();
        }, delay);
        delay += 800;
      }
    });
  };

  const openWrenchSettings = (item: FileItem) => {
    setActiveSettingsItem(JSON.parse(JSON.stringify(item))); // Deep copy
    setActiveWrenchTab("video");
  };

  const saveSettings = () => {
    if (!activeSettingsItem) return;
    setFileItems(
      fileItems.map((item) => (item.id === activeSettingsItem.id ? activeSettingsItem : item))
    );
    setActiveSettingsItem(null);
    toast.success("Settings applied for selected file!");
  };

  const applyWrenchPreset = (preset: Preset) => {
    if (!activeSettingsItem) return;
    setActiveSettingsItem({
      ...activeSettingsItem,
      format: preset.format,
      options: {
        ...activeSettingsItem.options,
        resolution: preset.resolution,
        fps: preset.fps,
        codec: preset.codec,
        bitrate: preset.bitrate,
      },
    });
    toast.success(`Applied preset: ${preset.name}`);
  };

  const saveCustomPreset = async () => {
    if (!newPresetName.trim() || !activeSettingsItem) {
      toast.error("Please enter a preset name");
      return;
    }
    const opt = activeSettingsItem.options;
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPresetName,
          format: activeSettingsItem.format,
          resolution: opt.resolution,
          fps: opt.fps,
          codec: opt.codec,
          bitrate: opt.bitrate,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Preset saved!");
      setNewPresetName("");
      fetchPresets();
    } catch {
      toast.error("Failed to save preset");
    }
  };

  // Overall batch progress
  const overallProgress = useMemo(() => {
    const active = fileItems.filter((i) => i.status !== "idle");
    if (active.length === 0) return 0;
    const sum = active.reduce((acc, i) => acc + (i.status === "completed" ? 100 : i.progress), 0);
    return Math.round(sum / active.length);
  }, [fileItems]);

  const activeLogItemData = useMemo(() => {
    if (!activeLogItem) return null;
    return fileItems.find((f) => f.id === activeLogItem.id) || null;
  }, [fileItems, activeLogItem]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-white space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header section */}
      <div className="text-center space-y-3 py-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-zinc-100 to-cyan-300 bg-clip-text text-transparent">
          Cloud Video Converter
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto text-sm leading-relaxed">
          Convert and compress video files online. Adjust resolution, trim clips, split segments, overlay watermarks, stitch image slideshows, and mix background audio in a single cloud dashboard.
        </p>
      </div>

      {/* Main workspace Card */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950 p-6 shadow-2xl backdrop-blur-md">
        
        {/* Table top control bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-900">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative cursor-pointer shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black py-2.5 px-4 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/5 active:scale-95 transition-all">
              <Plus className="h-4 w-4" />
              Add Media Files
              <input
                type="file"
                multiple
                accept="video/*,image/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {fileItems.length >= 2 && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeFiles}
                    onChange={(e) => setMergeFiles(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-cyan-500"
                  />
                  <span>Merge files into single output</span>
                </label>

                {mergeFiles && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slideshowMode}
                      onChange={(e) => setSlideshowMode(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-cyan-500"
                    />
                    <span>Slideshow Mode (images input)</span>
                  </label>
                )}
              </div>
            )}

            {fileItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFileItems([]);
                  setMergeFiles(false);
                  setSlideshowMode(false);
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-red-400 hover:border-red-500/20 transition"
              >
                Clear Queue
              </button>
            )}
          </div>
          
          {fileItems.length > 0 && (
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850">
              <div className="flex items-center gap-2">
                <Percent className="h-3.5 w-3.5 text-cyan-400" />
                <span>Progress: <strong className="text-white">{overallProgress}%</strong></span>
              </div>
              <div className="h-3 w-28 bg-zinc-950 rounded-full overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* File Table */}
        <div className="overflow-x-auto min-h-[160px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <th className="pb-3 pl-2">File Name</th>
                <th className="pb-3">Size</th>
                <th className="pb-3 text-center">Convert To</th>
                <th className="pb-3 text-center">Options</th>
                <th className="pb-3">Status / Progress</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {fileItems.map((item) => (
                <tr key={item.id} className="text-sm align-middle group hover:bg-zinc-900/10">
                  <td className="py-4 pl-2 font-medium max-w-xs truncate flex items-center gap-3">
                    <FileVideo className="h-5 w-5 text-cyan-400 shrink-0" />
                    <span className="truncate">{item.file.name}</span>
                  </td>
                  <td className="py-4 text-zinc-400 text-xs font-mono">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </td>
                  <td className="py-4 text-center">
                    <select
                      value={item.format}
                      disabled={item.status !== "idle" && item.status !== "failed"}
                      onChange={(e) => updateFileFormat(item.id, e.target.value)}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-700 disabled:opacity-50"
                    >
                      <optgroup label="Video Formats">
                        <option value="mp4">MP4</option>
                        <option value="webm">WEBM</option>
                        <option value="mov">MOV</option>
                        <option value="avi">AVI</option>
                        <option value="mkv">MKV</option>
                        <option value="flv">FLV</option>
                        <option value="wmv">WMV</option>
                        <option value="gif">GIF</option>
                      </optgroup>
                      <optgroup label="Audio Formats">
                        <option value="mp3">MP3</option>
                        <option value="aac">AAC</option>
                        <option value="m4a">M4A</option>
                        <option value="wav">WAV</option>
                        <option value="flac">FLAC</option>
                        <option value="ogg">OGG</option>
                        <option value="opus">OPUS</option>
                      </optgroup>
                    </select>
                  </td>
                  <td className="py-4 text-center">
                    <button
                      type="button"
                      disabled={item.status !== "idle" && item.status !== "failed"}
                      onClick={() => openWrenchSettings(item)}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-cyan-500/30 hover:text-cyan-400 transition disabled:opacity-30"
                    >
                      <Wrench className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="py-4 max-w-xs">
                    {item.status === "idle" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400 border border-zinc-800/80">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        Ready
                      </span>
                    )}

                    {(item.status === "queued" || item.status === "processing") && (
                      <div className="space-y-1.5 pr-4">
                        <div className="flex justify-between text-xs font-mono text-zinc-400">
                          <span className="capitalize">{item.status}...</span>
                          <span className="text-cyan-400 font-bold">{item.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden relative">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                          <span>Speed: {item.speed}</span>
                          <span>•</span>
                          <span>ETA: {item.eta}</span>
                        </p>
                      </div>
                    )}

                    {item.status === "completed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/20 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-900/20">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        Finished
                      </span>
                    )}

                    {item.status === "failed" && (
                      <div className="flex items-center gap-1 text-red-400 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-[160px] font-semibold" title={item.error}>{item.error || "Failed"}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 pr-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Log output Terminal */}
                      {item.jobId && (
                        <button
                          type="button"
                          onClick={() => setActiveLogItem(item)}
                          className="p-2 rounded-lg border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-white transition"
                          title="Show Logs"
                        >
                          <Terminal className="h-4 w-4" />
                        </button>
                      )}

                      {/* Convert trigger */}
                      {item.status === "idle" && !mergeFiles && (
                        <button
                          type="button"
                          onClick={() => convertFile(item)}
                          className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 px-3 py-1.5 text-xs font-bold transition"
                        >
                          Convert
                        </button>
                      )}

                      {(item.status === "queued" || item.status === "processing") && (
                        <button
                          type="button"
                          disabled
                          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-500 flex items-center gap-1"
                        >
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Processing
                        </button>
                      )}

                      {/* Single vs Split clip Download Renderers */}
                      {item.status === "completed" && item.downloadUrls && item.downloadUrls.length > 1 ? (
                        <div className="flex flex-col gap-1 items-end max-h-[80px] overflow-y-auto pr-1">
                          {item.downloadUrls.map((dl, idx) => (
                            <a
                              key={idx}
                              href={dl.url}
                              download={dl.name}
                              className="rounded bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-2 py-0.5 text-[9px] font-extrabold flex items-center gap-1 transition shadow"
                            >
                              <Download className="h-2.5 w-2.5" />
                              Clip {idx + 1}
                            </a>
                          ))}
                        </div>
                      ) : item.status === "completed" && item.downloadUrl ? (
                        <a
                          href={item.downloadUrl}
                          download={item.file.name.replace(/\.[^/.]+$/, "") + "." + item.format}
                          className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-3 py-1.5 text-xs font-extrabold flex items-center gap-1 transition shadow-lg shadow-cyan-500/5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : null}

                      {item.status === "failed" && !mergeFiles && (
                        <button
                          type="button"
                          onClick={() => convertFile(item)}
                          className="rounded-lg border border-red-500/30 bg-red-950/10 hover:bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-400 transition"
                        >
                          Retry
                        </button>
                      )}

                      {/* Delete */}
                      {item.status !== "queued" && item.status !== "processing" && (
                        <button
                          type="button"
                          onClick={() => removeFileItem(item.id)}
                          className="p-2 rounded-lg text-zinc-600 hover:text-red-400 transition"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {fileItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 italic">
                    <Video className="mx-auto h-12 w-12 text-zinc-700 mb-3" />
                    <p className="text-sm font-semibold">Your video processing queue is empty</p>
                    <p className="text-xs text-zinc-600 mt-1">Select or drop video, audio, or image files above to configure conversion tasks.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom batch actions panel */}
        {fileItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-zinc-900">
            <span className="text-xs text-zinc-500">
              Total of <strong>{fileItems.length}</strong> file(s) loaded
            </span>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {fileItems.some((i) => i.status === "completed") && (
                <button
                  type="button"
                  onClick={downloadAll}
                  className="w-full sm:w-auto rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-bold text-white hover:bg-zinc-850 hover:border-cyan-500/30 hover:text-cyan-400 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download All Outputs
                </button>
              )}
              <button
                type="button"
                onClick={convertAll}
                disabled={fileItems.every((i) => i.status === "queued" || i.status === "processing")}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black py-3 px-6 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40"
              >
                <Zap className="h-4 w-4 fill-current" />
                {mergeFiles 
                  ? (slideshowMode ? "Create Slideshow" : "Merge & Convert") 
                  : "Convert All Tasks"
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options Modal */}
      {activeSettingsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-white space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-base">Conversion Options</h3>
                  <p className="text-xs text-zinc-500 truncate max-w-lg mt-0.5">Configuring: {activeSettingsItem.file.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSettingsItem(null)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Presets Selector */}
            <div className="flex flex-col gap-2 p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-900">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-400">Load Options Preset</span>
                <span className="text-[10px] text-zinc-600">Quick Config</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {presets.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyWrenchPreset(p)}
                    className="rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 py-1 px-2.5 text-[10px] font-semibold text-zinc-300 transition"
                  >
                    {p.name.replace(" (1080p MP4 H264)", "").replace(" (720p H265)", "").replace(" (4K VP9)", "").replace(" (360p 15fps)", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-zinc-900 text-xs overflow-x-auto gap-1">
              {(["video", "audio", "trim", "compress", "ai"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveWrenchTab(tab)}
                  className={`px-4 py-2 border-b-2 font-semibold capitalize transition whitespace-nowrap ${
                    activeWrenchTab === tab ? "border-cyan-500 text-cyan-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab === "ai" 
                    ? "AI Features" 
                    : tab === "trim" 
                    ? "Trim & Split" 
                    : tab === "compress" 
                    ? "Compression"
                    : `${tab} Settings`
                  }
                </button>
              ))}
            </div>

            {/* Tab contents */}
            <div className="min-h-[240px] overflow-y-auto max-h-[360px] pr-2 space-y-4">
              
              {/* 1. Video Settings Tab */}
              {activeWrenchTab === "video" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Video Codec</span>
                    <select
                      value={activeSettingsItem.options.codec}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, codec: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                    >
                      <option value="h264">H.264 (Default - AVC)</option>
                      <option value="hevc">HEVC (H.265 high compression)</option>
                      <option value="vp9">VP9 (Google WebM codec)</option>
                      <option value="copy">copy (Pass-through stream)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Resolution Downscale</span>
                    <select
                      value={activeSettingsItem.options.resolution}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, resolution: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                    >
                      <option value="">Match Source Resolution</option>
                      <option value="360p">360p (Mobile low-bandwidth)</option>
                      <option value="480p">480p (Standard definition)</option>
                      <option value="720p">720p (HD 1280x720)</option>
                      <option value="1080p">1080p (Full HD 1920x1080)</option>
                      <option value="2K">2K Quad HD (2560x1440)</option>
                      <option value="4K">4K Ultra HD (3840x2160)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Frame Rate (FPS)</span>
                    <select
                      value={activeSettingsItem.options.fps}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, fps: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                    >
                      <option value="">Match Source FPS</option>
                      <option value="15">15 fps (Lower size)</option>
                      <option value="24">24 fps (Cinema standard)</option>
                      <option value="30">30 fps (Standard Web)</option>
                      <option value="60">60 fps (Ultra-smooth)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Rotate Video</span>
                    <select
                      value={activeSettingsItem.options.rotate}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, rotate: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                    >
                      <option value="">No rotation</option>
                      <option value="90">90° Clockwise</option>
                      <option value="180">180° Rotate</option>
                      <option value="270">270° Clockwise (90° Counter-Clockwise)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Speed Control</span>
                    <select
                      value={activeSettingsItem.options.speed}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, speed: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                    >
                      <option value="0.25">0.25x (Quarter Speed)</option>
                      <option value="0.5">0.5x (Half Speed)</option>
                      <option value="0.75">0.75x (Slow Motion)</option>
                      <option value="1.0">1.0x (Normal Speed)</option>
                      <option value="1.25">1.25x (Slightly Faster)</option>
                      <option value="1.5">1.5x (Fast Playback)</option>
                      <option value="2.0">2.0x (Double Speed)</option>
                      <option value="4.0">4.0x (Quad Speed)</option>
                    </select>
                  </div>

                  {slideshowMode && (
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-400 font-medium">Slideshow Frame Duration (secs/img)</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={activeSettingsItem.options.imageDuration}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, imageDuration: e.target.value }
                        })}
                        className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs text-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 2. Audio Settings Tab */}
              {activeWrenchTab === "audio" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Audio Channels Codec</span>
                    <select
                      value={activeSettingsItem.options.audioCodec}
                      disabled={activeSettingsItem.options.mute}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, audioCodec: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                    >
                      <option value="aac">aac (Standard web format)</option>
                      <option value="mp3">mp3 (Legacy audio)</option>
                      <option value="ac3">ac3 (Surround format)</option>
                      <option value="copy">copy (No re-encode)</option>
                      <option value="none">none (Strip audio)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Audio Bitrate</span>
                    <select
                      value={activeSettingsItem.options.audioBitrate}
                      disabled={activeSettingsItem.options.mute || activeSettingsItem.options.audioCodec === "none" || activeSettingsItem.options.audioCodec === "copy"}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, audioBitrate: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                    >
                      <option value="96k">96 kbps (Medium)</option>
                      <option value="128k">128 kbps (Standard)</option>
                      <option value="192k">192 kbps (High Quality)</option>
                      <option value="256k">256 kbps (Pro)</option>
                      <option value="320k">320 kbps (High Fidelity)</option>
                    </select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="flex items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSettingsItem.options.mute}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, mute: e.target.checked }
                        })}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-cyan-500"
                      />
                      <div>
                        <span className="block text-xs font-semibold">Mute / Remove Audio track</span>
                        <span className="block text-[9px] text-zinc-500">Mutes all audio channels from the video completely.</span>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2 sm:col-span-2 border-t border-zinc-900 pt-3">
                    <span className="text-xs text-zinc-400 font-medium block">Inject External Audio Track</span>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setActiveSettingsItem({
                            ...activeSettingsItem,
                            options: { ...activeSettingsItem.options, audioFile: file }
                          });
                          if (file) {
                            toast.success(`Attached audio track: ${file.name}`);
                          }
                        }}
                        className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-850 p-1.5 rounded w-full"
                      />
                      {activeSettingsItem.options.audioFile && (
                        <div className="flex items-center gap-2">
                          <select
                            value={activeSettingsItem.options.audioMergeMode}
                            onChange={(e) => setActiveSettingsItem({
                              ...activeSettingsItem,
                              options: { ...activeSettingsItem.options, audioMergeMode: e.target.value as any }
                            })}
                            className="rounded border border-zinc-800 bg-zinc-900 p-1 text-[11px]"
                          >
                            <option value="replace">Replace Audio</option>
                            <option value="mix">Mix Audios</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setActiveSettingsItem({
                              ...activeSettingsItem,
                              options: { ...activeSettingsItem.options, audioFile: null }
                            })}
                            className="p-1 rounded bg-red-950 text-red-400 hover:bg-red-900 text-[10px] font-bold"
                          >
                            Clear Track
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2 border-t border-zinc-900 pt-3">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Audio Track Volume multiplier ({activeSettingsItem.options.volume}%)</span>
                      <span>50% - 200% Range</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="10"
                      value={activeSettingsItem.options.volume}
                      disabled={activeSettingsItem.options.mute}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, volume: e.target.value }
                      })}
                      className="w-full accent-cyan-500 mt-2"
                    />
                  </div>
                </div>
              )}

              {/* 3. Trim & Split Tab */}
              {activeWrenchTab === "trim" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-400 font-medium">Cut Start Point (hh:mm:ss)</span>
                      <input
                        type="text"
                        value={activeSettingsItem.options.trimStart}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, trimStart: e.target.value }
                        })}
                        className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                        placeholder="e.g. 00:00:02"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-400 font-medium">Cut End Point (hh:mm:ss)</span>
                      <input
                        type="text"
                        value={activeSettingsItem.options.trimEnd}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, trimEnd: e.target.value }
                        })}
                        className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                        placeholder="e.g. 00:00:15"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-3">
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-400 font-medium">Aspect Ratio constraint</span>
                      <select
                        value={activeSettingsItem.options.aspectRatio}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, aspectRatio: e.target.value }
                        })}
                        className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                      >
                        <option value="">Keep original ratio</option>
                        <option value="16:9">Widescreen 16:9</option>
                        <option value="4:3">TV Standard 4:3</option>
                        <option value="1:1">Square Post 1:1</option>
                        <option value="9:16">Vertical Reel 9:16</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-400 font-medium">Crop Area dimensions (W:H)</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={activeSettingsItem.options.cropW}
                          onChange={(e) => setActiveSettingsItem({
                            ...activeSettingsItem,
                            options: { ...activeSettingsItem.options, cropW: e.target.value }
                          })}
                          className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                          placeholder="Width"
                        />
                        <input
                          type="text"
                          value={activeSettingsItem.options.cropH}
                          onChange={(e) => setActiveSettingsItem({
                            ...activeSettingsItem,
                            options: { ...activeSettingsItem.options, cropH: e.target.value }
                          })}
                          className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                          placeholder="Height"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-zinc-900 pt-3">
                    <span className="text-xs text-zinc-400 font-medium block">Split Video into Multiple Parts</span>
                    <input
                      type="text"
                      value={activeSettingsItem.options.splitPoints}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, splitPoints: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                      placeholder="Split timestamps (comma-separated, e.g., 10, 20 or 00:00:10, 00:00:30)"
                    />
                    <span className="text-[10px] text-zinc-500 block leading-normal">
                      Timestamps must be comma separated. This splits the clip into multiple individual download links (e.g. 0 to 10s, 10s to 20s, and 20s to end).
                    </span>
                  </div>

                  <div className="space-y-1 border-t border-zinc-900 pt-3">
                    <label className="flex items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSettingsItem.options.reverse}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, reverse: e.target.checked }
                        })}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-cyan-500"
                      />
                      <div>
                        <span className="block text-xs font-semibold">Reverse playback direction</span>
                        <span className="block text-[9px] text-zinc-500">Reverses the video and audio frames completely.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 4. Compression Tab */}
              {activeWrenchTab === "compress" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium block">Compression Optimization Mode</span>
                    <select
                      value={activeSettingsItem.options.compressMode}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, compressMode: e.target.value as any }
                      })}
                      className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs"
                    >
                      <option value="smart">Smart Compression (Auto optimize bitrate/CRF)</option>
                      <option value="target-size">Target File Size Mode (Target specific MB)</option>
                      <option value="manual">Constant Quality (Adjust CRF value)</option>
                      <option value="bitrate">Bitrate Optimization (Set precise video bitrate)</option>
                      <option value="lossless">Lossless encoding (CRF 0)</option>
                    </select>
                  </div>

                  {activeSettingsItem.options.compressMode === "target-size" && (
                    <div className="space-y-1 border-t border-zinc-900 pt-3">
                      <span className="text-xs text-zinc-400 font-medium block">Target File Size (MB)</span>
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={activeSettingsItem.options.targetSizeMb}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, targetSizeMb: e.target.value }
                        })}
                        className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs text-white"
                        placeholder="e.g., 25"
                      />
                      <span className="text-[10px] text-zinc-500 block leading-normal">
                        FFmpeg will compute the required average bitrate dynamically to keep the final output close to this size.
                      </span>
                    </div>
                  )}

                  {activeSettingsItem.options.compressMode === "manual" && (
                    <div className="space-y-1 border-t border-zinc-900 pt-3">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Constant Quality Rate (CRF: {activeSettingsItem.options.crf})</span>
                        <span className="text-[10px] text-zinc-500">Lower is higher quality (23 default)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="51"
                        value={activeSettingsItem.options.crf}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, crf: e.target.value }
                        })}
                        className="w-full accent-cyan-500 mt-2"
                      />
                    </div>
                  )}

                  {activeSettingsItem.options.compressMode === "bitrate" && (
                    <div className="space-y-1 border-t border-zinc-900 pt-3">
                      <span className="text-xs text-zinc-400 font-medium block">Target Video Bitrate (e.g. 2M, 800k)</span>
                      <input
                        type="text"
                        value={activeSettingsItem.options.bitrate}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, bitrate: e.target.value }
                        })}
                        className="w-full rounded border border-zinc-850 bg-zinc-900 p-2 text-xs text-white"
                        placeholder="e.g., 1.5M or 900k"
                      />
                    </div>
                  )}

                  {activeSettingsItem.options.compressMode === "lossless" && (
                    <div className="p-3.5 bg-cyan-950/20 border border-cyan-900/30 rounded-xl flex gap-3 text-xs text-cyan-400 leading-normal">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Lossless encoding sets CRF value to 0. Note that the output file size might be extremely large since it encodes pixel-for-pixel identically to source.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 5. AI Features Tab */}
              {activeWrenchTab === "ai" && (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSettingsItem.options.aiDenoise}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, aiDenoise: e.target.checked }
                        })}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-cyan-500"
                      />
                      <div>
                        <span className="block text-xs font-semibold">AI De-noise</span>
                        <span className="block text-[9px] text-zinc-500">Remove camera sensor grains.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSettingsItem.options.aiEnhance}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, aiEnhance: e.target.checked }
                        })}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-cyan-500"
                      />
                      <div>
                        <span className="block text-xs font-semibold">AI Video Enhance</span>
                        <span className="block text-[9px] text-zinc-500">Sharpen pixel boundaries.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSettingsItem.options.aiUpscale}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, aiUpscale: e.target.checked }
                        })}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-cyan-500"
                      />
                      <div>
                        <span className="block text-xs font-semibold">AI Resolution Upscale (2x)</span>
                        <span className="block text-[9px] text-zinc-500">Intelligent scaling details.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSettingsItem.options.aiCaptions}
                        onChange={(e) => setActiveSettingsItem({
                          ...activeSettingsItem,
                          options: { ...activeSettingsItem.options, aiCaptions: e.target.checked }
                        })}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-cyan-500"
                      />
                      <div>
                        <span className="block text-xs font-semibold">AI Auto Subtitles</span>
                        <span className="block text-[9px] text-zinc-500">Create synced SRT captions.</span>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2 border-t border-zinc-900 pt-3">
                    <span className="text-xs text-zinc-400 font-medium">Overlay Brand Text Watermark</span>
                    <input
                      type="text"
                      value={activeSettingsItem.options.watermarkText}
                      onChange={(e) => setActiveSettingsItem({
                        ...activeSettingsItem,
                        options: { ...activeSettingsItem.options, watermarkText: e.target.value }
                      })}
                      className="w-full rounded border border-zinc-855 bg-zinc-900 p-2 text-xs"
                      placeholder="e.g. COPYRIGHT OWNER"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-900 pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Save preset as..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="rounded-lg border border-zinc-850 bg-zinc-900/60 px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-700"
                />
                <button
                  type="button"
                  onClick={saveCustomPreset}
                  className="rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 text-xs font-semibold"
                >
                  Save Preset
                </button>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSettingsItem(null)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSettings}
                  className="rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 px-5 py-2 text-xs font-extrabold transition shadow-lg"
                >
                  Apply Settings
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Terminal log logs drawer */}
      {activeLogItemData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-cyan-400" />
                <span className="font-semibold text-sm">Task Log Output</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogItem(null)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-xs text-zinc-500 truncate">File: {activeLogItemData.file.name}</p>

            <div className="h-64 w-full overflow-y-auto rounded-lg border border-zinc-900 bg-zinc-950/60 p-3 font-mono text-xs text-zinc-400 space-y-1">
              {activeLogItemData.logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap font-mono leading-relaxed">
                  <span className="text-zinc-600 mr-2">[{idx + 1}]</span>
                  {log}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveLogItem(null)}
                className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
