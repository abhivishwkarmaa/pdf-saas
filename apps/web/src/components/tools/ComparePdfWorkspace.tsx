"use client";

import { useState, useRef, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Download,
  Split,
  Eye,
  Loader2,
  Sparkles,
  ChevronRight,
  Info,
} from "lucide-react";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface ComparePdfWorkspaceProps {
  tool: ToolDefinition;
}

export function ComparePdfWorkspace({ tool }: ComparePdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [files, setFiles] = useState<File[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [mode, setMode] = useState<"semantic" | "visual">("semantic");

  // Local object URLs for rendering PDFs natively
  const [fileUrls, setFileUrls] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (files.length === 2) {
      const urlA = URL.createObjectURL(files[0]);
      const urlB = URL.createObjectURL(files[1]);
      setFileUrls([urlA, urlB]);
      return () => {
        URL.revokeObjectURL(urlA);
        URL.revokeObjectURL(urlB);
      };
    } else {
      setFileUrls(null);
    }
  }, [files]);

  // Handle file drop / select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    addFiles(selectedFiles);
  };

  const addFiles = (selectedFiles: File[]) => {
    const newFiles = [...files, ...selectedFiles].slice(0, 2);
    setFiles(newFiles);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Download printable PDF report
  const downloadReport = async () => {
    if (files.length < 2) return;
    setDownloading(true);
    try {
      const formData = new FormData();
      formData.append("files", files[0]);
      formData.append("files", files[1]);
      formData.append("options", JSON.stringify({ mode, downloadReport: true }));

      const res = await fetch(`/api/process/${tool.slug}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to compile report");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparison_report_${mode}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Comparison completed and report downloaded successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="pdf-workspace-theme-wrapper flex flex-col overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-white shadow-2xl h-[calc(100vh-140px)] min-h-[620px]">
        
        {/* TOP BAR / SETTINGS CONTROL BAR */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/60 p-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
              <Split className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">Report Compare Mode</span>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setMode("semantic")}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5",
                    mode === "semantic"
                      ? "bg-red-50 border-red-200 text-red-650 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
                      : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" /> Semantic Diffs
                </button>
                <button
                  onClick={() => setMode("visual")}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5",
                    mode === "visual"
                      ? "bg-red-50 border-red-200 text-red-650 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
                      : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500"
                  )}
                >
                  <Eye className="h-3.5 w-3.5" /> Visual Diffs
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {files.length === 2 && (
              <>
                <button
                  onClick={() => {
                    setFiles([]);
                  }}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer flex items-center gap-1.5"
                >
                  <X className="h-4 w-4 text-red-500" /> Clear
                </button>
                <button
                  onClick={downloadReport}
                  disabled={downloading}
                  className="px-4 py-2 rounded-xl bg-red-650 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-md"
                >
                  {downloading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download Comparison Report
                </button>
              </>
            )}
          </div>
        </div>

        {/* WORKSPACE DIVIDERS */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* UPLOAD PANEL STATE */}
          {files.length < 2 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-zinc-50/60 to-white dark:from-zinc-950 dark:to-zinc-950/20">
              <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-3xl p-8 shadow-2xl space-y-6">
                
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-[10px] text-red-500 font-extrabold uppercase tracking-widest">
                    <Sparkles className="h-3 w-3" /> Compare Engine v2.0
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-zinc-850 dark:text-white mt-2">Upload PDFs to Compare</h3>
                  <p className="text-xs text-zinc-400">Select two PDF files to view them side-by-side natively. Trigger comparison on downloading the report.</p>
                </div>

                {/* Premium Interactive Mode Cards Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                  <div
                    onClick={() => setMode("semantic")}
                    className={cn(
                      "cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-2 relative overflow-hidden group select-none",
                      mode === "semantic"
                        ? "bg-red-50/20 border-red-500/40 dark:bg-red-950/10 dark:border-red-900 shadow-md ring-2 ring-red-500/5"
                        : "bg-zinc-50/50 border-zinc-200 dark:bg-zinc-900/30 dark:border-zinc-850 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-800"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-2 rounded-xl border transition-colors",
                          mode === "semantic" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-zinc-200/50 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-400"
                        )}>
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs font-black tracking-wide">Semantic Compare</span>
                      </div>
                      {mode === "semantic" && (
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                      Generates line text diffs with highlighted additions and deletions. Perfect for contracts and reports.
                    </p>
                  </div>

                  <div
                    onClick={() => setMode("visual")}
                    className={cn(
                      "cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-2 relative overflow-hidden group select-none",
                      mode === "visual"
                        ? "bg-red-50/20 border-red-500/40 dark:bg-red-950/10 dark:border-red-900 shadow-md ring-2 ring-red-500/5"
                        : "bg-zinc-50/50 border-zinc-200 dark:bg-zinc-900/30 dark:border-zinc-850 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-800"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-2 rounded-xl border transition-colors",
                          mode === "visual" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-zinc-200/50 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-400"
                        )}>
                          <Eye className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs font-black tracking-wide">Visual Compare</span>
                      </div>
                      {mode === "visual" && (
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                      Examines layout differences and visual changes in a pixel-overlay page view. Best for slides and mockups.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload Slot A */}
                  <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center bg-zinc-50/40 dark:bg-zinc-900/10 hover:border-red-500/30 transition duration-300">
                    {files[0] ? (
                      <div className="text-center space-y-3">
                        <div className="relative inline-block">
                          <FileText className="h-10 w-10 text-red-550 mx-auto" />
                          <span className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full text-[9px] px-1 font-bold">A</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate max-w-[200px]">{files[0].name}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{(files[0].size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={() => removeFile(0)}
                          className="px-2.5 py-1 text-[10px] font-bold text-red-500 border border-red-100 hover:bg-red-50 dark:border-red-950/30 dark:hover:bg-red-950/20 rounded-lg transition cursor-pointer"
                        >
                          Change File
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer text-center space-y-2 flex flex-col items-center group w-full py-4">
                        <Upload className="h-8 w-8 text-zinc-400 group-hover:text-red-500 transition-colors" />
                        <span className="text-xs font-bold text-zinc-650 dark:text-zinc-300 block">Select Document A</span>
                        <span className="text-[10px] text-zinc-500 block">Original version (PDF)</span>
                        <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                      </label>
                    )}
                  </div>

                  {/* File Upload Slot B */}
                  <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 flex flex-col items-center justify-center bg-zinc-50/40 dark:bg-zinc-900/10 hover:border-red-500/30 transition duration-300">
                    {files[1] ? (
                      <div className="text-center space-y-3">
                        <div className="relative inline-block">
                          <FileText className="h-10 w-10 text-red-550 mx-auto" />
                          <span className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full text-[9px] px-1 font-bold">B</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate max-w-[200px]">{files[1].name}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{(files[1].size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={() => removeFile(1)}
                          className="px-2.5 py-1 text-[10px] font-bold text-red-500 border border-red-100 hover:bg-red-50 dark:border-red-950/30 dark:hover:bg-red-950/20 rounded-lg transition cursor-pointer"
                        >
                          Change File
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer text-center space-y-2 flex flex-col items-center group w-full py-4">
                        <Upload className="h-8 w-8 text-zinc-400 group-hover:text-red-500 transition-colors" />
                        <span className="text-xs font-bold text-zinc-650 dark:text-zinc-300 block">Select Document B</span>
                        <span className="text-[10px] text-zinc-500 block">Modified version (PDF)</span>
                        <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                </div>

                {files.length === 2 && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-850 flex items-start gap-2">
                    <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                      The two documents will be displayed side-by-side. You can choose the comparison report type above and hit the download button to generate the report.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Display Native PDFs side-by-side using iFrames */
            <div className="flex-1 flex overflow-hidden min-h-0 bg-zinc-100 dark:bg-zinc-900/40">
              <div className="flex-1 flex overflow-hidden p-4 gap-4">
                {/* Left Pane (Doc A iframe) */}
                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-850 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 px-4 py-2 bg-zinc-50 dark:bg-zinc-900">
                    <span className="text-xs font-black text-red-550 tracking-wider truncate max-w-[280px]">ORIGINAL (DOC A): {files[0]?.name}</span>
                  </div>
                  {fileUrls && (
                    <iframe
                      src={`${fileUrls[0]}#toolbar=0`}
                      className="w-full h-full border-none"
                    />
                  )}
                </div>

                {/* Right Pane (Doc B iframe) */}
                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-850 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 px-4 py-2 bg-zinc-50 dark:bg-zinc-900">
                    <span className="text-xs font-black text-emerald-555 tracking-wider truncate max-w-[280px]">MODIFIED (DOC B): {files[1]?.name}</span>
                  </div>
                  {fileUrls && (
                    <iframe
                      src={`${fileUrls[1]}#toolbar=0`}
                      className="w-full h-full border-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </>
  );
}
