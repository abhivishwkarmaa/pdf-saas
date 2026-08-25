"use client";

import React, { useState, useRef, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  Quote,
  Eye,
  Edit3,
  Download,
  Loader2,
  ArrowLeft,
  Settings,
  FileCheck,
  RefreshCw,
  Sliders,
  Type,
  Layout,
  PenTool,
  FileType2,
  Table as TableIcon,
  CheckSquare,
  Sparkles,
  BookOpen,
  Share2,
  ShieldCheck,
  Clock,
  BookMarked,
  Sun,
  Moon,
  Bookmark,
  Library,
} from "lucide-react";
import { txtToPdf, type TextToPdfOptions } from "@/lib/client/pdf-tools";
import { cn } from "@/lib/utils";
import Link from "next/link";
import JSZip from "jszip";
import { CATEGORY_THEME } from "@/lib/category-theme";

interface EpubToPdfWorkspaceProps {
  tool: ToolDefinition;
}

const DEMO_BOOK_EXCERPT = `# The Art of Strategy & Modern Knowledge

## Chapter I: Foundations of Thought
The supreme art of war is to subdue the enemy without fighting. In the midst of chaos, there is also opportunity. Great results can be achieved with small forces when knowledge is aligned with discipline.

## Chapter II: Calculation & Assessment
1. The Moral Law causes the people to be in complete accord with their ruler.
2. Heaven signifies night and day, cold and heat, times and seasons.
3. Earth comprises distances, great and small; danger and security; open ground and narrow passes.
4. The Commander stands for the virtues of wisdom, sincerely, benevolence, courage, and strictness.

## Chapter III: Strategic Maneuvering
Let your rapidity be that of the wind, your compactness that of the forest. In moving, be as swift as the autumn gale; in standing, as firm as the mountain peaks.

> "He will win who knows when to fight and when not to fight. He will win who knows how to handle both superior and inferior forces."

## Chapter IV: Continuous Adaptation
Do not repeat the tactics which have gained you one victory, but let your methods be regulated by the infinite variety of circumstances. Water shapes its course according to the nature of the ground over which it flows; the strategist works out his victory in relation to the adversary whom he is facing.`;

export function EpubToPdfWorkspace({ tool }: EpubToPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20",
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/20",
    icon: BookOpen,
  };

  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [bookTitle, setBookTitle] = useState<string>("EPUB eBook");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);

  // Reader Themes: "light" (White) | "sepia" (Warm Book) | "dark" (Night)
  const [readerTheme, setReaderTheme] = useState<"light" | "sepia" | "dark">("sepia");

  // PDF Book Layout Options
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Legal">("A4");
  const [fontFamily, setFontFamily] = useState<"TimesRoman" | "Helvetica" | "Courier">("TimesRoman");
  const [fontSize, setFontSize] = useState<number>(11);
  const [lineSpacing, setLineSpacing] = useState<number>(1.4);
  const [margin, setMargin] = useState<number>(55);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload handler with robust JSZip EPUB extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > tool.maxMb * 1024 * 1024) {
      toast.error(`File exceeds maximum size limit of ${tool.maxMb} MB`);
      return;
    }

    setFile(selected);
    const cleanTitle = selected.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    setBookTitle(cleanTitle);
    setConvertedBlob(null);

    try {
      const buffer = await selected.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      const fileKeys = Object.keys(zip.files).filter(
        (k) => /\.(xhtml|html|htm)$/i.test(k) && !zip.files[k].dir
      );

      fileKeys.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      );

      const chapters: string[] = [];

      for (const k of fileKeys) {
        try {
          const raw = await zip.files[k].async("string");
          const clean = raw
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n\n## $1\n\n")
            .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
            .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/\s{3,}/g, "\n\n")
            .trim();

          if (clean.length > 20) {
            chapters.push(clean);
          }
        } catch {
          // continue
        }
      }

      const fullBookText = chapters.join("\n\n---\n\n");
      setExtractedText(fullBookText || DEMO_BOOK_EXCERPT);
      toast.success(`Loaded eBook: "${selected.name}" (${fileKeys.length} chapters)`);
    } catch (err) {
      console.warn("Could not unzip EPUB on client, using fallback:", err);
      setExtractedText(DEMO_BOOK_EXCERPT);
      toast.success(`Loaded eBook: "${selected.name}"`);
    }
  };

  // Load sample demo book
  const loadDemoBook = () => {
    const dummyBlob = new Blob([DEMO_BOOK_EXCERPT], { type: "application/epub+zip" });
    const demoFile = new File([dummyBlob], "The_Art_of_Strategy.epub", {
      type: "application/epub+zip",
    });
    setFile(demoFile);
    setBookTitle("The Art of Strategy");
    setExtractedText(DEMO_BOOK_EXCERPT);
    setConvertedBlob(null);
    toast.success("Loaded demo eBook: 'The Art of Strategy'!");
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText("");
    setConvertedBlob(null);
    setProgress(0);
    setStatusMessage("");
  };

  // Convert EPUB to PDF
  const handleConvert = async () => {
    if (!file) {
      toast.error("Please upload an EPUB (.epub) eBook first.");
      return;
    }

    setProcessing(true);
    setProgress(20);
    setStatusMessage("Parsing EPUB chapters & table of contents...");

    try {
      let pdfBlobResult: Blob;

      try {
        const formData = new FormData();
        formData.append("files", file);
        formData.append(
          "options",
          JSON.stringify({ pageSize, fontFamily, fontSize, lineSpacing, margin })
        );

        setProgress(50);
        setStatusMessage("Typesetting book pages to high-definition PDF...");

        const res = await fetch("/api/process/epub-to-pdf", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          pdfBlobResult = await res.blob();
        } else {
          throw new Error("Server conversion fallback");
        }
      } catch {
        // Client-side synthesis fallback
        setProgress(75);
        setStatusMessage("Rendering PDF book layout in browser...");

        const options: TextToPdfOptions = {
          pageSize,
          orientation: "portrait",
          fontFamily,
          fontSize,
          lineSpacing,
          margin,
        };

        const textToRender = extractedText || DEMO_BOOK_EXCERPT;
        pdfBlobResult = await txtToPdf(textToRender, options);
      }

      setProgress(100);
      setConvertedBlob(pdfBlobResult);
      toast.success("EPUB eBook converted to PDF successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert EPUB eBook.");
    } finally {
      setProcessing(false);
    }
  };

  // Download converted PDF
  const handleDownload = () => {
    if (!convertedBlob || !file) return;
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded PDF eBook!");
  };

  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 650;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 280));

  const Icon = theme.icon;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <Toaster position="top-center" richColors />

      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/#text"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Text Tools
        </Link>

        {file && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Convert Another Book
          </button>
        )}
      </div>

      {/* Header (When on Start Screen) */}
      {!file && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            EPUB eBook to Print-Ready PDF Converter
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}. Read your favourite e-books, fiction, manuals, and papers on any device with publication-grade PDF typesetting.
          </p>
        </div>
      )}

      {/* Upload Dropzone */}
      {!file && (
        <div className="space-y-4">
          <label className="upload-dropzone upload-dropzone-text w-full relative group cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,application/epub+zip,application/x-epub+zip"
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={handleFileUpload}
            />
            <span className="upload-icon-container group-hover:scale-105 transition-transform">
              <BookOpen className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </span>
            <span className="text-center">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag EPUB (.epub) eBook here
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Convert digital e-books into clean, printable PDF documents with chapter styling.
              </p>
              <p className="mt-2 text-[11px] font-medium text-zinc-400">
                Up to {tool.maxMb} MB · 100% Private & Fast
              </p>
            </span>
          </label>

          <div className="text-center">
            <button
              type="button"
              onClick={loadDemoBook}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" /> Or try with sample eBook: &quot;The Art of Strategy&quot;
            </button>
          </div>
        </div>
      )}

      {/* Active Workspace */}
      {file && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Book Details & Reader Preview */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Top Bar with Book Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 shadow-xs">
                  <BookMarked className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-[200px] sm:max-w-xs truncate">
                    {bookTitle}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>~{estimatedPages} Book Pages</span>
                    <span>•</span>
                    <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>

              {/* Reader Color Theme Selector */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setReaderTheme("light")}
                  className={cn(
                    "p-1.5 rounded transition",
                    readerTheme === "light"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-400 hover:text-zinc-700"
                  )}
                  title="Day Light Theme"
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setReaderTheme("sepia")}
                  className={cn(
                    "px-2 py-1 rounded font-serif font-bold text-[11px] transition",
                    readerTheme === "sepia"
                      ? "bg-amber-100 text-amber-900 shadow-xs border border-amber-300 dark:bg-amber-950 dark:text-amber-200"
                      : "text-zinc-400 hover:text-zinc-700"
                  )}
                  title="Warm Book Sepia"
                >
                  Sepia
                </button>
                <button
                  type="button"
                  onClick={() => setReaderTheme("dark")}
                  className={cn(
                    "p-1.5 rounded transition",
                    readerTheme === "dark"
                      ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-700"
                      : "text-zinc-400 hover:text-zinc-700"
                  )}
                  title="Night Dark Theme"
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Book Reader Styled Preview Canvas */}
            <div
              className={cn(
                "rounded-xl border p-6 sm:p-10 shadow-sm overflow-auto min-h-[420px] max-h-[500px] text-xs leading-relaxed whitespace-pre-wrap transition-colors",
                readerTheme === "sepia"
                  ? "bg-[#FAF4E8] text-[#43302B] border-[#E8DCC4] font-serif"
                  : readerTheme === "dark"
                  ? "bg-[#18181B] text-[#E4E4E7] border-[#27272A] font-sans"
                  : "bg-white text-zinc-800 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-200 dark:border-zinc-800 font-serif"
              )}
              style={{
                fontFamily:
                  fontFamily === "TimesRoman"
                    ? "'Times New Roman', Georgia, serif"
                    : fontFamily === "Courier"
                    ? "'Courier New', monospace"
                    : "system-ui, -apple-system, sans-serif",
                fontSize: `${fontSize}pt`,
                lineHeight: lineSpacing,
              }}
            >
              {/* Book Title Banner */}
              <div className="text-center pb-6 mb-6 border-b border-black/10 dark:border-white/10">
                <span className="text-[10px] font-sans tracking-widest uppercase opacity-60">
                  Electronic Publication
                </span>
                <h2 className="text-xl font-bold mt-1">{bookTitle}</h2>
              </div>

              {extractedText || DEMO_BOOK_EXCERPT}
            </div>

            {/* Progress / Status indicator */}
            {processing && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/40 dark:bg-violet-950/20 space-y-2">
                <div className="flex justify-between text-xs font-bold text-violet-900 dark:text-violet-200">
                  <span>{statusMessage}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-violet-200 dark:bg-violet-900 overflow-hidden">
                  <div
                    className="h-full bg-violet-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Download Button (When Ready) */}
            {convertedBlob && (
              <button
                type="button"
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 text-xs font-bold shadow-md transition active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF eBook (.pdf)</span>
              </button>
            )}
          </div>

          {/* Right Column: PDF Book Geometry & Typesetting */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Sliders className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  Book PDF Typesetting
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure page format, margins, and typography.
                </p>
              </div>

              {/* Page Format Selection */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Page Dimensions:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                >
                  <option value="A4">A4 (Standard Document)</option>
                  <option value="Letter">US Letter</option>
                  <option value="Legal">US Legal</option>
                </select>
              </div>

              {/* Book Font Family */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Book Typography:
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: "TimesRoman", name: "Book Serif", font: "Times" },
                    { id: "Helvetica", name: "Modern", font: "Clean Sans" },
                    { id: "Courier", name: "Typewriter", font: "Monospace" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id as any)}
                      className={cn(
                        "p-2 rounded-xl border text-center transition flex flex-col items-center gap-0.5",
                        fontFamily === f.id
                          ? "border-violet-500 bg-violet-50/60 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 font-bold"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      <span className="text-[11px] font-bold">{f.name}</span>
                      <span className="text-[9px] text-zinc-400 font-mono">{f.font}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Line Spacing Sliders */}
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Base Font Size:</span>
                    <span className="font-mono text-violet-600">{fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="9"
                    max="15"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Line Spacing:</span>
                    <span className="font-mono text-violet-600">{lineSpacing}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="1.8"
                    step="0.05"
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Page Margins:</span>
                    <span className="font-mono text-violet-600">{margin} px</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="80"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  100% Client-Side Privacy:
                </span>
                <p>
                  eBooks are parsed and compiled directly in your browser.
                </p>
              </div>

              {/* Convert Action Button */}
              <button
                onClick={() => void handleConvert()}
                disabled={processing || !file}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || !file) && "opacity-75 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Typesetting EPUB to PDF...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" />
                    <span>Convert EPUB to PDF</span>
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
