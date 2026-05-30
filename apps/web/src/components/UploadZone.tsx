"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as tus from "tus-js-client";
import { toast } from "sonner";
import { 
  UploadCloud, FileVideo, FileAudio, FileImage, FileText, File, 
  X, Check, AlertCircle, RefreshCw, Clock
} from "lucide-react";
import { estimateConversionTime } from "@pdf-saas/shared";

interface UploadZoneProps {
  userId?: string;
  options?: Record<string, any>;
  onUploadSuccess?: (jobId: string) => void;
  allowedTypes?: string[]; // e.g. ["video/*", "image/*", "audio/*"]
  maxSizeMb?: number;      // e.g. 500
}

interface UploadFileItem {
  id: string;
  jobId: string;
  file: File;
  progress: number;
  status: "idle" | "uploading" | "paused" | "success" | "error";
  estimatedTimeSec: number;
  tusUpload: tus.Upload | null;
  errorMsg?: string;
}

export default function UploadZone({
  userId,
  options = {},
  onUploadSuccess,
  allowedTypes = ["video/*", "audio/*", "image/*"],
  maxSizeMb = 500
}: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith("video/")) return <FileVideo className="h-8 w-8 text-cyan-400" />;
    if (type.startsWith("audio/")) return <FileAudio className="h-8 w-8 text-indigo-400" />;
    if (type.startsWith("image/")) return <FileImage className="h-8 w-8 text-pink-400" />;
    if (type.startsWith("text/") || type.includes("pdf")) return <FileText className="h-8 w-8 text-emerald-400" />;
    return <File className="h-8 w-8 text-zinc-400" />;
  };

  const validateFile = (file: File): boolean => {
    // Size check
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File ${file.name} is too large. Max limit is ${maxSizeMb}MB.`);
      return false;
    }

    // Type check (simple wildcard check)
    const matchesType = allowedTypes.some(pattern => {
      if (pattern.endsWith("/*")) {
        const base = pattern.replace("/*", "");
        return file.type.startsWith(base);
      }
      return file.type === pattern || file.name.endsWith(pattern);
    });

    if (!matchesType && allowedTypes.length > 0) {
      toast.error(`Invalid format for ${file.name}. Allowed categories: ${allowedTypes.join(", ")}`);
      return false;
    }

    return true;
  };

  const addFiles = (selectedFiles: FileList | File[]) => {
    const newItems: UploadFileItem[] = [];

    Array.from(selectedFiles).forEach(file => {
      if (!validateFile(file)) return;

      const ext = file.name.split(".").pop() || "mp4";
      const estTime = estimateConversionTime(
        file.size / (1024 * 1024),
        ext,
        options.format || "mp4",
        {
          resolution: options.resolution,
          codec: options.codec,
          aiUpscale: options.aiUpscale,
          aiEnhance: options.aiEnhance,
          aiDenoise: options.aiDenoise,
          aiCaptions: options.aiCaptions,
          aiSceneDetect: options.aiSceneDetect,
          watermarkText: !!options.watermarkText,
        }
      );

      const clientJobId = `job-${Math.random().toString(36).slice(2, 11)}-${Date.now()}`;

      const item: UploadFileItem = {
        id: `tus-${Date.now()}-${Math.random()}`,
        jobId: clientJobId,
        file,
        progress: 0,
        status: "idle",
        estimatedTimeSec: estTime,
        tusUpload: null,
      };

      newItems.push(item);
    });

    setFiles(prev => [...prev, ...newItems]);
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(e.target.files);
    }
  };

  const startTusUpload = (item: UploadFileItem) => {
    if (item.status === "uploading" || item.status === "success") return;

    const endpoint = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/upload/tus`;

    const tusUpload = new tus.Upload(item.file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: {
        filename: item.file.name,
        filetype: item.file.type,
        userId: userId || "",
        jobId: item.jobId,
        options: JSON.stringify(options),
      },
      onError: (error) => {
        toast.error(`Upload failed: ${item.file.name}`);
        setFiles(prev =>
          prev.map(f =>
            f.id === item.id ? { ...f, status: "error", errorMsg: error.message } : f
          )
        );
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const progress = Math.round((bytesUploaded / bytesTotal) * 100);
        setFiles(prev =>
          prev.map(f => (f.id === item.id ? { ...f, progress, status: "uploading" } : f))
        );
      },
      onSuccess: () => {
        toast.success(`Upload complete: ${item.file.name}`);
        setFiles(prev =>
          prev.map(f => (f.id === item.id ? { ...f, progress: 100, status: "success" } : f))
        );
        
        // The server triggers the BullMQ job creation on tus success.
        // We can poll the jobs database or display job history refresh triggers.
        if (onUploadSuccess) {
          // If Tus includes job references in custom headers, pass it.
          // Since it triggers asynchronously on the Express API, we can trigger a refresh callback.
          onUploadSuccess(item.jobId);
        }
      },
    });

    tusUpload.findPreviousUploads().then(previousUploads => {
      if (previousUploads.length > 0) {
        tusUpload.resumeFromPreviousUpload(previousUploads[0]);
      }
      tusUpload.start();
      setFiles(prev =>
        prev.map(f => (f.id === item.id ? { ...f, tusUpload, status: "uploading" } : f))
      );
    });
  };

  const pauseTusUpload = (item: UploadFileItem) => {
    if (item.tusUpload) {
      item.tusUpload.abort();
      setFiles(prev =>
        prev.map(f => (f.id === item.id ? { ...f, status: "paused" } : f))
      );
      toast.info(`Paused upload for: ${item.file.name}`);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.tusUpload) {
        target.tusUpload.abort();
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const formatEstTime = (seconds: number) => {
    if (seconds < 60) return `~${seconds} sec estimated`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `~${min} min ${sec} sec estimated` : `~${min} min estimated`;
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all min-h-[220px] ${
          isDragActive
            ? "border-cyan-500 bg-cyan-950/10 shadow-lg shadow-cyan-500/5 scale-[0.99]"
            : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700/80 hover:bg-zinc-900/10"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />

        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-900/85 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-500/20 transition-all duration-300">
            <UploadCloud className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-zinc-200">
              Drag & Drop your media files here, or <span className="text-cyan-400 hover:text-cyan-300">browse</span>
            </p>
            <p className="text-xs text-zinc-500">
              Supports video, audio, or images up to {maxSizeMb}MB. Chunked resuming enabled.
            </p>
          </div>
        </div>

        {/* Floating animated glowing border */}
        {isDragActive && (
          <motion.div 
            layoutId="active-glow"
            className="absolute inset-0 border border-cyan-500 rounded-3xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>

      {/* Upload Progress Queue */}
      <AnimatePresence>
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Upload Queue</h3>
            <div className="space-y-3">
              {files.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="shrink-0">
                      {getFileIcon(item.file.type)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate max-w-xs md:max-w-md" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatEstTime(item.estimatedTimeSec)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress / Status Controls */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0">
                    {item.status === "uploading" && (
                      <div className="flex items-center gap-3 w-32 md:w-24">
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden w-full relative">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-350"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold font-mono text-cyan-400">{item.progress}%</span>
                      </div>
                    )}

                    {item.status === "success" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1 rounded-full">
                        <Check className="h-3 w-3" /> Uploaded
                      </span>
                    )}

                    {item.status === "error" && (
                      <span 
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/30 px-2.5 py-1 rounded-full cursor-help"
                        title={item.errorMsg}
                      >
                        <AlertCircle className="h-3 w-3" /> Error
                      </span>
                    )}

                    {item.status === "paused" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
                        Paused
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {item.status === "idle" && (
                        <button
                          type="button"
                          onClick={() => startTusUpload(item)}
                          className="rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold px-3 py-1.5 transition"
                        >
                          Upload
                        </button>
                      )}

                      {item.status === "uploading" && (
                        <button
                          type="button"
                          onClick={() => pauseTusUpload(item)}
                          className="rounded-lg border border-zinc-800 bg-zinc-900 hover:text-white text-zinc-400 text-xs font-semibold px-3 py-1.5 transition"
                        >
                          Pause
                        </button>
                      )}

                      {item.status === "paused" && (
                        <button
                          type="button"
                          onClick={() => startTusUpload(item)}
                          className="rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold px-3 py-1.5 transition"
                        >
                          Resume
                        </button>
                      )}

                      {item.status === "error" && (
                        <button
                          type="button"
                          onClick={() => startTusUpload(item)}
                          className="rounded-lg border border-red-500/20 bg-red-950/10 hover:bg-red-950/20 text-red-400 text-xs font-semibold px-3 py-1.5 transition"
                        >
                          Retry
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/10 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
