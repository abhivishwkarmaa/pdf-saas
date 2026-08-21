"use client";

import React, { useState, useEffect } from "react";
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
  CheckCircle2,
  FileText,
  Trash2,
  ArrowLeft,
  Download,
  Code,
  Eye,
  Maximize2,
  ShieldCheck,
  Sparkles,
  Layout,
  Sliders,
  Check,
  RefreshCw,
  X,
} from "lucide-react";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface HtmlToPdfWorkspaceProps {
  tool: ToolDefinition;
}

type InputTab = "file" | "raw" | "url";
type PageSize = "A4" | "Letter" | "Legal";
type PageOrientation = "portrait" | "landscape";
type MarginMode = "default" | "none" | "minimum";

const DEFAULT_RAW_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; line-height: 1.6; }
    h1 { color: #dc2626; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .badge { background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
  <span class="badge">Invoice / Report Template</span>
  <h1>Professional PDF Document</h1>
  <p>This HTML snippet will be rendered with full CSS3 vector fidelity into a downloadable PDF.</p>
  <table>
    <tr><th>Item Description</th><th>Quantity</th><th>Price</th></tr>
    <tr><td>Cloud Infrastructure Service</td><td>1</td><td>$149.00</td></tr>
    <tr><td>Vector PDF Processing API</td><td>1</td><td>$89.00</td></tr>
  </table>
</body>
</html>`;

export function HtmlToPdfWorkspace({ tool }: HtmlToPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: FileCode,
  };

  const [activeTab, setActiveTab] = useState<InputTab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [rawHtml, setRawHtml] = useState<string>(DEFAULT_RAW_HTML);
  const [url, setUrl] = useState<string>("");
  const [previewContent, setPreviewContent] = useState<string>("");

  // Options
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<PageOrientation>("portrait");
  const [margin, setMargin] = useState<MarginMode>("default");
  const [printBackground, setPrintBackground] = useState<boolean>(true);

  // Processing state
  const [processing, setProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Results
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // Inspect Modal
  const [showInspectModal, setShowInspectModal] = useState<boolean>(false);

  // Update live preview when file or raw html changes
  useEffect(() => {
    if (activeTab === "file" && file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewContent((e.target?.result as string) || "");
      };
      reader.readAsText(file);
    } else if (activeTab === "raw") {
      setPreviewContent(rawHtml);
    } else {
      setPreviewContent("");
    }
  }, [activeTab, file, rawHtml]);

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
    setUrl("");
    setResultBlob(null);
    setResultFileName("");
  };

  const handleConvert = async () => {
    if (activeTab === "file" && !file) {
      toast.error("Please upload an HTML file first");
      return;
    }
    if (activeTab === "raw" && !rawHtml.trim()) {
      toast.error("Please enter or paste HTML code");
      return;
    }
    if (activeTab === "url" && !url.trim()) {
      toast.error("Please enter a website URL");
      return;
    }
    if (activeTab === "url" && !/^https?:\/\/\S+/i.test(url)) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setProcessing(true);
    setStatusMessage("Preparing document payload... 0%");
    setProgressPercent(10);
    setResultBlob(null);

    try {
      const formData = new FormData();
      const options = {
        pageSize,
        orientation,
        margin,
        printBackground,
        url: activeTab === "url" ? url.trim() : undefined,
      };

      formData.append("options", JSON.stringify(options));

      if (activeTab === "file" && file) {
        formData.append("files", file);
      } else if (activeTab === "raw") {
        const blob = new Blob([rawHtml], { type: "text/html" });
        formData.append("files", new File([blob], "document.html", { type: "text/html" }));
      } else {
        const dummyBlob = new Blob(["url-conversion"], { type: "text/plain" });
        formData.append("files", new File([dummyBlob], "dummy.txt"));
      }

      const xhr = new XMLHttpRequest();
      let progressInterval: NodeJS.Timeout | null = null;

      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatusMessage(`Uploading HTML payload... ${percent}%`);
            setProgressPercent(Math.min(30, Math.round(percent * 0.3)));
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Rendering DOM & executing styles in Chromium...");
          let pct = 30;
          progressInterval = setInterval(() => {
            if (pct < 95) {
              pct += Math.floor(Math.random() * 4) + 1;
              if (pct > 95) pct = 95;
              setProgressPercent(pct);

              if (pct < 55) {
                setStatusMessage("Constructing vector text glyphs & layout...");
              } else if (pct < 80) {
                setStatusMessage("Applying CSS print backgrounds & fonts...");
              } else {
                setStatusMessage("Finalizing high-resolution PDF document...");
              }
            }
          }, 300);
        });

        const cleanup = () => {
          if (progressInterval) clearInterval(progressInterval);
        };

        xhr.addEventListener("load", () => {
          cleanup();
          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            const disposition = xhr.getResponseHeader("Content-Disposition");
            const match = disposition?.match(/filename="([^\"]+)"/);
            const fileName =
              match?.[1] ||
              (activeTab === "file"
                ? `${file?.name.replace(/\.[^/.]+$/, "") || "document"}.pdf`
                : activeTab === "url"
                ? "webpage.pdf"
                : "document.pdf");
            resolve({ blob, fileName });
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || "HTML to PDF conversion failed"));
            } catch {
              reject(new Error("HTML to PDF conversion failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          cleanup();
          reject(new Error("Network error occurred"));
        });

        xhr.addEventListener("abort", () => {
          cleanup();
          reject(new Error("Conversion was cancelled"));
        });

        xhr.responseType = "blob";
        xhr.open("POST", `/api/process/${tool.slug}`);
        xhr.send(formData);
      });

      const { blob, fileName } = await responsePromise;
      setProgressPercent(100);
      setResultBlob(blob);
      setResultFileName(decodeURIComponent(fileName));

      // Trigger automatic download
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = decodeURIComponent(fileName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("HTML successfully converted to high-resolution PDF!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setProcessing(false);
      setStatusMessage("");
      setProgressPercent(0);
    }
  };

  const handleDownloadResultAgain = () => {
    if (!resultBlob || !resultFileName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultFileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded PDF document!");
  };

  const Icon = theme.icon;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <Toaster position="top-center" richColors />

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/#pdf"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to PDF Tools
        </Link>

        {(file || resultBlob) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Convert Another Document
          </button>
        )}
      </div>

      {/* Header */}
      {!file && !resultBlob && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            HTML & Web Conversion
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            Convert HTML code, local web files, or live URLs into crisp vector PDF documents.
          </p>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Input Tabs & Live Sandbox Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Mode Selector Tabs */}
          <div className="flex rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("file")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                activeTab === "file"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              HTML File
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                activeTab === "raw"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              <Code className="h-3.5 w-3.5" />
              Raw HTML Code
            </button>
            <button
              onClick={() => setActiveTab("url")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                activeTab === "url"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              Website URL
            </button>
          </div>

          {/* Conversion Result Banner (Shown after conversion) */}
          {resultBlob && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    PDF Document Generated!
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                      .PDF
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Vector PDF ready with full CSS styling & vector typography.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadResultAgain}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download Again
              </button>
            </div>
          )}

          {/* Tab 1: Upload HTML File */}
          {activeTab === "file" && (
            <div className="space-y-4">
              {!file ? (
                <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    onChange={handleFileChange}
                  />
                  <span className="upload-icon-container group-hover:scale-105 transition-transform">
                    <FileCode className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </span>
                  <span className="text-center">
                    <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                      Click or drag an HTML file here
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Supports .html or .htm files up to {tool.maxMb} MB
                    </p>
                  </span>
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                      <FileCode className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs sm:max-w-md truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {(file.size / 1024).toFixed(1)} KB • HTML Source Document
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Raw HTML Editor */}
          {activeTab === "raw" && (
            <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-red-600" />
                  HTML & Inline CSS Source Code:
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {rawHtml.length} characters
                </span>
              </div>
              <textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                placeholder="Paste <html><body>...</body></html> here..."
                rows={10}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 font-mono text-xs text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 leading-relaxed"
              />
            </div>
          )}

          {/* Tab 3: Website URL */}
          {activeTab === "url" && (
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Enter Webpage URL:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Globe className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 pl-10 pr-4 py-3 text-xs text-zinc-900 focus:border-red-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Quick Examples:</span>
                {["https://en.wikipedia.org/wiki/PDF", "https://news.ycombinator.com", "https://github.com"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setUrl(preset)}
                    className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {preset.replace("https://", "")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Sandboxed HTML Preview Frame */}
          {(activeTab === "file" && file || activeTab === "raw") && previewContent && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-900">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  Live HTML Render Preview:
                </span>
                <button
                  type="button"
                  onClick={() => setShowInspectModal(true)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold flex items-center gap-1"
                >
                  <Maximize2 className="h-3 w-3" />
                  Expand
                </button>
              </div>

              <div className="h-64 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800">
                <iframe
                  srcDoc={previewContent}
                  title="HTML Preview"
                  sandbox="allow-same-origin"
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: PDF Layout & Conversion Options */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="sticky top-6 flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-red-600 dark:text-red-400" />
                PDF Document Settings
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Configure page size, orientation, and margin layout.
              </p>
            </div>

            {/* Page Size & Orientation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Page Size:
                </label>
                <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                  <button
                    type="button"
                    onClick={() => setPageSize("A4")}
                    className={cn(
                      "flex-1 rounded py-1 font-semibold transition",
                      pageSize === "A4"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize("Letter")}
                    className={cn(
                      "flex-1 rounded py-1 font-semibold transition",
                      pageSize === "Letter"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Letter
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Orientation:
                </label>
                <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={cn(
                      "flex-1 rounded py-1 font-semibold transition",
                      orientation === "portrait"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={cn(
                      "flex-1 rounded py-1 font-semibold transition",
                      orientation === "landscape"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Landscape
                  </button>
                </div>
              </div>
            </div>

            {/* Margins */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Page Margins:
              </label>
              <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setMargin("default")}
                  className={cn(
                    "flex-1 rounded py-1 font-semibold transition",
                    margin === "default"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  Default (20mm)
                </button>
                <button
                  type="button"
                  onClick={() => setMargin("minimum")}
                  className={cn(
                    "flex-1 rounded py-1 font-semibold transition",
                    margin === "minimum"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  Narrow (10mm)
                </button>
                <button
                  type="button"
                  onClick={() => setMargin("none")}
                  className={cn(
                    "flex-1 rounded py-1 font-semibold transition",
                    margin === "none"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  None (Full Bleed)
                </button>
              </div>
            </div>

            {/* Print Backgrounds Checkbox */}
            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Print CSS Background Colors & Images
                </span>
                <input
                  type="checkbox"
                  checked={printBackground}
                  onChange={(e) => setPrintBackground(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </label>
            </div>

            {/* HTML to PDF Features Checklist */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Chromium Vector PDF Features:
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Full CSS3, Flexbox & Grid Layout Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Selectable Vector Text with Active Hyperlinks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Web Fonts & Custom Typography Loaded</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 text-xs space-y-2.5">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Input Source:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {activeTab === "file"
                    ? file ? file.name : "No file selected"
                    : activeTab === "raw"
                    ? "Raw HTML Snippet"
                    : url || "Website URL"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Target Format:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  PDF ({pageSize} {orientation})
                </span>
              </div>
            </div>

            {/* Convert Button */}
            <button
              onClick={() => void handleConvert()}
              disabled={processing}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                theme.button,
                processing && "opacity-80 cursor-not-allowed"
              )}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{statusMessage || "Converting to PDF..."}</span>
                </>
              ) : (
                <>
                  <FileCode className="h-4 w-4" />
                  <span>Convert to PDF</span>
                </>
              )}
            </button>

            {/* Processing Progress Bar */}
            {processing && (
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full bg-red-600 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Rendering in headless Chromium</span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Fullscreen HTML Preview */}
      {showInspectModal && previewContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setShowInspectModal(false)}
        >
          <div
            className="relative flex flex-col h-[85vh] max-w-4xl w-full rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h4 className="font-bold text-zinc-900 dark:text-white">
                HTML Render Sandbox
              </h4>
              <button
                onClick={() => setShowInspectModal(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-2">
              <iframe
                srcDoc={previewContent}
                title="Fullscreen HTML Preview"
                sandbox="allow-same-origin"
                className="h-full w-full rounded-lg border border-zinc-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
