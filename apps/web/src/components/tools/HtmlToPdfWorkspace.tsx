"use client";

import React, { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  Globe,
  FileCode,
  ArrowRight,
  Settings,
  Loader2,
  FileCheck,
  CheckCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface HtmlToPdfWorkspaceProps {
  tool: ToolDefinition;
}

export function HtmlToPdfWorkspace({ tool }: HtmlToPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [activeTab, setActiveTab] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [processing, setProcessing] = useState(false);

  // Conversion Options
  const [pageSize, setPageSize] = useState<"A4" | "Letter">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState<"default" | "none" | "minimum">("default");

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

  const handleConvert = async () => {
    if (activeTab === "file" && !file) {
      toast.error("Please upload an HTML file first");
      return;
    }
    if (activeTab === "url" && !url) {
      toast.error("Please enter a website URL");
      return;
    }

    if (activeTab === "url" && !/^https?:\/\/\S+/i.test(url)) {
      toast.error("Please enter a valid URL (starting with http:// or https://)");
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      const options = {
        pageSize,
        orientation,
        margin,
        url: activeTab === "url" ? url : undefined,
      };
      
      formData.append("options", JSON.stringify(options));
      if (activeTab === "file" && file) {
        formData.append("files", file);
      } else {
        // Send a dummy file because API routes check for files length
        const dummyBlob = new Blob(["url-conversion"], { type: "text/plain" });
        formData.append("files", new File([dummyBlob], "dummy.txt"));
      }

      const res = await fetch(`/api/process/${tool.slug}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to convert to PDF");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = activeTab === "file" 
        ? `${file?.name.replace(/\.[^/.]+$/, "") || "document"}.pdf`
        : "webpage.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Successfully converted to PDF!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="flex h-full min-h-[550px] flex-col overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-white shadow-2xl lg:flex-row">
        
        {/* LEFT WORKSPACE: Input area */}
        <div className="flex flex-1 flex-col justify-between bg-zinc-50 dark:bg-[radial-gradient(ellipse_at_top,rgba(20,20,25,0.7),rgba(9,9,11,1))] p-8 relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          
          <div className="z-10 w-full max-w-2xl mx-auto space-y-6 my-auto">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">HTML to PDF Converter</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Transform local HTML files or web pages into print-ready PDF files instantly.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex p-1.5 bg-zinc-100 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-sm mx-auto">
              <button
                onClick={() => setActiveTab("file")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === "file"
                    ? "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white shadow-md border border-zinc-200 dark:border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <FileCode className="h-4 w-4" />
                Upload HTML
              </button>
              <button
                onClick={() => setActiveTab("url")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === "url"
                    ? "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white shadow-md border border-zinc-200 dark:border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Globe className="h-4 w-4" />
                Website URL
              </button>
            </div>

            {/* Input Panels */}
            <div className="min-h-[220px] flex items-center justify-center">
              {activeTab === "file" ? (
                <div className="w-full">
                  {!file ? (
                    <label className="group flex w-full cursor-pointer flex-col items-center gap-5 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/10 backdrop-blur-sm px-6 py-12 transition-all duration-300 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-150/40 dark:hover:bg-zinc-900/20">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:border-zinc-400 dark:group-hover:border-zinc-700">
                        <Upload className="h-6 w-6 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors" />
                      </span>
                      <span className="text-center">
                        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                          Choose HTML file or drag & drop here
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Supports .html or .htm up to {tool.maxMb} MB
                        </p>
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="text/html"
                        onChange={handleFileChange}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-green-550/10 border border-green-500/20">
                          <FileCheck className="h-5 w-5 text-green-600 dark:text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 max-w-[280px] truncate">{file.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="p-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-650 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-850 hover:border-red-300 dark:hover:border-red-900/50 text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer"
                        title="Delete File"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                      <Globe className="h-5 w-5 text-zinc-500" />
                    </div>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-850 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-405 dark:placeholder-zinc-600 font-medium focus:border-zinc-400 dark:focus:border-zinc-700 focus:outline-none transition-all duration-300"
                    />
                  </div>
                  
                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Suggestions:</span>
                    {["https://wikipedia.org", "https://news.ycombinator.com", "https://github.com"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setUrl(preset)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-[10px] text-zinc-650 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-750 transition-all cursor-pointer"
                      >
                        {preset.replace("https://", "")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Settings & Actions */}
        <div className="w-full bg-zinc-50 dark:bg-zinc-950 p-8 border-t border-zinc-200 dark:border-zinc-900 lg:w-80 lg:border-t-0 lg:border-l lg:border-zinc-200 dark:border-zinc-900 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-4">
              <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-200">
                PDF Layout Settings
              </h2>
            </div>

            {/* Layout Options */}
            <div className="space-y-4">
              {/* Page Size */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Page Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["A4", "Letter"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        pageSize === size
                          ? "bg-white dark:bg-white/5 border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["portrait", "landscape"] as const).map((orient) => (
                    <button
                      key={orient}
                      onClick={() => setOrientation(orient)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold border capitalize transition-all cursor-pointer",
                        orientation === orient
                          ? "bg-white dark:bg-white/5 border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      )}
                    >
                      {orient}
                    </button>
                  ))}
                </div>
              </div>

              {/* Margins */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Margins</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["default", "none", "minimum"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMargin(m)}
                      className={cn(
                        "py-2 rounded-xl text-[10px] font-bold border capitalize transition-all cursor-pointer",
                        margin === m
                          ? "bg-white dark:bg-white/5 border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-8 border-t border-zinc-200 dark:border-zinc-900 pt-6">
            <button
              onClick={handleConvert}
              disabled={processing || (activeTab === "file" ? !file : !url)}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 cursor-pointer",
                theme.button
              )}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <span>Convert to PDF</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
