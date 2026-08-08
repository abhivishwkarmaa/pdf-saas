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
} from "lucide-react";
import { txtToPdf, downloadBlob, type TextToPdfOptions } from "@/lib/client/pdf-tools";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TextToPdfWorkspaceProps {
  tool: ToolDefinition;
}

const DEFAULT_DIRECT_TEXT = `# Document Title

Welcome to the Text to PDF Converter! You can edit this text directly or clear it to write your own document.

## Formatting Features
- Use **bold text** or *italic text*
- Create headers using # or ##
- Add bullet lists and > blockquotes

Start typing your content here...`;

export function TextToPdfWorkspace({ tool }: TextToPdfWorkspaceProps) {
  // Input Mode / Screen: "start" (Uploader & Direct Typing choices) OR "editor" (Active workspace)
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [originalFileText, setOriginalFileText] = useState<string>("");
  const [textValue, setTextValue] = useState<string>(DEFAULT_DIRECT_TEXT);

  // View Mode: "edit" (Textarea editor) | "preview" (HTML Markdown) | "pdf" (Live PDF Document Preview)
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "pdf">("pdf");
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);

  // PDF Styling & Layout Options
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Legal">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [fontFamily, setFontFamily] = useState<"Helvetica" | "TimesRoman" | "Courier">("Helvetica");
  const [fontSize, setFontSize] = useState<number>(11);
  const [margin, setMargin] = useState<number>(50);
  const [lineSpacing, setLineSpacing] = useState<number>(1.3);

  // Live PDF Preview Blob URL State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate Live PDF Preview Blob whenever options or text changes
  useEffect(() => {
    if (!hasStarted || !textValue.trim()) return;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setGeneratingPreview(true);
        const options: TextToPdfOptions = {
          pageSize,
          orientation,
          fontFamily,
          fontSize,
          lineSpacing,
          margin,
        };
        const blob = await txtToPdf(textValue, options);
        if (!isCancelled) {
          const url = URL.createObjectURL(blob);
          setPdfPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error("Failed to generate live PDF preview:", err);
      } finally {
        if (!isCancelled) setGeneratingPreview(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [hasStarted, textValue, pageSize, orientation, fontFamily, fontSize, lineSpacing, margin]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, []);

  // Validate .txt file
  const isValidTxtFile = (f: File): boolean => {
    const extension = f.name.slice(((f.name.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    return extension === "txt" || f.type === "text/plain";
  };

  // Handle Text File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!isValidTxtFile(selected)) {
      toast.error("Only .txt files are allowed. Please upload a valid plain text (.txt) file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selected.size > tool.maxMb * 1024 * 1024) {
      toast.error(`File size exceeds limit of ${tool.maxMb} MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || "";
      setFile(selected);
      setOriginalFileText(content);
      setTextValue(content);
      setHasStarted(true);
      toast.success(`Loaded "${selected.name}" successfully!`);
    };
    reader.onerror = () => {
      toast.error("Failed to read file content");
    };
    reader.readAsText(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!isValidTxtFile(droppedFile)) {
        toast.error("Only .txt files are allowed. Please upload a valid plain text (.txt) file.");
        return;
      }
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        input.files = dataTransfer.files;
        handleFileUpload({ target: input } as any);
      }
    }
  };

  const handleStartDirectTyping = (initialText = "") => {
    setFile(null);
    setOriginalFileText("");
    setTextValue(initialText || DEFAULT_DIRECT_TEXT);
    setHasStarted(true);
  };

  const handleClearOrResetWorkspace = () => {
    setHasStarted(false);
    setFile(null);
    setOriginalFileText("");
    setTextValue("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleResetToOriginal = () => {
    if (originalFileText) {
      setTextValue(originalFileText);
      toast.info("Reset text to original uploaded content");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textValue);
      setCopied(true);
      toast.success("Text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  // Robust Formatting Insertion (Bold, Italic, Headings, Lists, Quotes)
  const insertFormatting = (prefix: string, suffix = "") => {
    const textarea = document.getElementById("text-to-pdf-textarea") as HTMLTextAreaElement | null;
    if (!textarea) {
      setTextValue((prev) => prev + `\n${prefix}formatted text${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textValue.substring(start, end) || "formatted text";
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newText = textValue.substring(0, start) + replacement + textValue.substring(end);
    setTextValue(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  // Download PDF
  const handleConvert = async () => {
    if (!textValue.trim()) {
      toast.error("Please enter or upload some text to convert.");
      return;
    }

    setProcessing(true);
    try {
      const options: TextToPdfOptions = {
        pageSize,
        orientation,
        fontFamily,
        fontSize,
        lineSpacing,
        margin,
      };

      const pdfBlob = await txtToPdf(textValue, options);
      const downloadName = file
        ? `${file.name.replace(/\.[^/.]+$/, "")}.pdf`
        : "document.pdf";

      downloadBlob(pdfBlob, downloadName);
      toast.success("PDF generated and downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to convert text to PDF");
    } finally {
      setProcessing(false);
    }
  };

  const charCount = textValue.length;
  const wordCount = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;
  const lineCount = textValue ? textValue.split("\n").length : 0;
  const isEdited = Boolean(originalFileText && textValue !== originalFileText);

  return (
    <>
      <Toaster position="top-center" richColors />

      {/* Top Back Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/#text"
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Text Tools
        </Link>
      </div>

      {/* STEP 1: INITIAL SELECTION SCREEN (Choose Upload .txt OR Direct Typing) */}
      {!hasStarted ? (
        <div className="mx-auto max-w-3xl space-y-8 py-4">
          
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-xs font-bold text-violet-600 dark:text-violet-400">
              <FileText className="h-4 w-4" />
              Text to PDF Converter
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Create & Convert Text to PDF
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              Upload an existing .txt file or start typing directly in your browser. Customize page layout, fonts, line spacing, and watch live PDF previews instantly.
            </p>
          </div>

          {/* DUAL CHOICE CARDS: Option 1 (Upload .txt) & Option 2 (Direct Typing) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* CARD 1: UPLOAD .TXT FILE */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div>
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Option 1: Upload .txt File
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Drag and drop your plain text file here, or click to browse. Max size 5 MB.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Upload .txt document</span>
                <span>→</span>
              </div>
            </div>

            {/* CARD 2: DIRECT TYPING / BLANK EDITOR */}
            <div
              onClick={() => handleStartDirectTyping()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <div>
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <PenTool className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Option 2: Type Text Directly
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Start with a clean document editor to write and format your text from scratch.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Open Text Editor</span>
                <span>→</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* STEP 2: MAIN WORKSPACE (Editor, Live PDF Preview & PDF Controls) */
        <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
          
          {/* LEFT COLUMN: Editor & Live PDF Preview */}
          <div className="flex-1 w-full space-y-4">

            {/* Document Header & Mode Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {file ? file.name : "Direct Text Document"}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {file ? `${(file.size / 1024).toFixed(1)} KB • Uploaded .txt file` : "Typed directly in browser"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isEdited && (
                  <button
                    onClick={handleResetToOriginal}
                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 transition cursor-pointer"
                    title="Reset text to original uploaded content"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
                <button
                  onClick={handleClearOrResetWorkspace}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 transition cursor-pointer shadow-sm"
                  title="Upload a different file or start fresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {file ? "Change File" : "New Document"}
                </button>
              </div>
            </div>

            {/* MAIN TEXT EDITOR & LIVE PDF PREVIEW CONTAINER */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col min-h-[520px]">
              
              {/* Header Bar with View Switcher Tabs (Edit Text | Live PDF Preview | HTML View) */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Workspace Mode
                  </span>
                  {isEdited && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      Modified
                    </span>
                  )}
                </div>

                {/* View Switcher: Edit Text vs Live PDF Preview vs HTML Preview */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-xl bg-zinc-200/80 p-0.5 dark:bg-zinc-800">
                    <button
                      onClick={() => setViewMode("edit")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                        viewMode === "edit"
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      )}
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit Text
                    </button>
                    <button
                      onClick={() => setViewMode("pdf")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                        viewMode === "pdf"
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      )}
                    >
                      <FileType2 className="h-3.5 w-3.5" /> Live PDF Preview
                    </button>
                    <button
                      onClick={() => setViewMode("preview")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                        viewMode === "preview"
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" /> HTML View
                    </button>
                  </div>

                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Copy text content"
                  >
                    {copied ? <Check className="h-4 w-4 text-violet-600 dark:text-violet-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar (Visible in Edit Mode) */}
              {viewMode === "edit" && (
                <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-100/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/60 text-xs overflow-x-auto">
                  <button
                    onClick={() => insertFormatting("**", "**")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition cursor-pointer"
                    title="Bold (**text**)"
                  >
                    <Bold className="h-3.5 w-3.5" /> Bold
                  </button>
                  <button
                    onClick={() => insertFormatting("*", "*")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 italic transition cursor-pointer"
                    title="Italic (*text*)"
                  >
                    <Italic className="h-3.5 w-3.5" /> Italic
                  </button>
                  <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />
                  <button
                    onClick={() => insertFormatting("# ")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold transition cursor-pointer"
                    title="Main Heading (# Title)"
                  >
                    <Heading className="h-3.5 w-3.5" /> H1
                  </button>
                  <button
                    onClick={() => insertFormatting("## ")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold transition cursor-pointer"
                    title="Subheading (## Title)"
                  >
                    <Heading className="h-3 w-3" /> H2
                  </button>
                  <button
                    onClick={() => insertFormatting("- ")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                    title="Bullet List (- item)"
                  >
                    <List className="h-3.5 w-3.5" /> List
                  </button>
                  <button
                    onClick={() => insertFormatting("`", "`")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer font-mono"
                    title="Code Block (`code`)"
                  >
                    <Code className="h-3.5 w-3.5" /> Code
                  </button>
                  <button
                    onClick={() => insertFormatting("> ")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                    title="Quote Block (> quote)"
                  >
                    <Quote className="h-3.5 w-3.5" /> Quote
                  </button>

                  <div className="ml-auto text-[11px] font-mono text-zinc-500 flex items-center gap-2.5 shrink-0">
                    <span>{lineCount} lines</span>
                    <span>•</span>
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{charCount} chars</span>
                  </div>
                </div>
              )}

              {/* VIEW 1: TEXTAREA EDITOR */}
              {viewMode === "edit" && (
                <div className="flex-1 p-5 overflow-auto bg-zinc-50/30 dark:bg-zinc-950/20">
                  <textarea
                    id="text-to-pdf-textarea"
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder="Type or paste text content here..."
                    className="w-full h-full min-h-[380px] bg-transparent font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* VIEW 2: LIVE PDF PREVIEW (Real generated PDF preview in iframe) */}
              {viewMode === "pdf" && (
                <div className="flex-1 p-3 overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex flex-col relative min-h-[440px]">
                  {generatingPreview && (
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow-md text-xs font-bold text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
                      Updating PDF Live...
                    </div>
                  )}

                  {pdfPreviewUrl ? (
                    <iframe
                      src={`${pdfPreviewUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full min-h-[460px] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner bg-white"
                      title="Live PDF Document Preview"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2 min-h-[300px]">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <p className="text-xs font-semibold">Generating Live PDF Preview...</p>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 3: HTML MARKDOWN PREVIEW */}
              {viewMode === "preview" && (
                <div className="flex-1 p-5 overflow-auto bg-zinc-50/30 dark:bg-zinc-950/20">
                  <div
                    className="prose dark:prose-invert max-w-none text-xs leading-relaxed p-6 font-mono whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
                    style={{
                      fontFamily:
                        fontFamily === "TimesRoman"
                          ? "'Times New Roman', Times, serif"
                          : fontFamily === "Courier"
                          ? "'Courier New', Courier, monospace"
                          : "system-ui, -apple-system, sans-serif",
                      fontSize: `${fontSize}pt`,
                      lineHeight: lineSpacing,
                    }}
                  >
                    {textValue ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderSimpleMarkdown(textValue),
                        }}
                      />
                    ) : (
                      <span className="text-zinc-400 italic">No text content available.</span>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT COLUMN: PDF Options & Convert Button */}
          <div className="w-full lg:w-84 shrink-0 space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-5">
              
              <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3.5">
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    PDF & Layout Settings
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Customize page, typography & margins
                  </p>
                </div>
              </div>

              {/* 1. Page Size */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Layout className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  Page Size
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["A4", "Letter", "Legal"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold border transition cursor-pointer",
                        pageSize === size
                          ? "bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-950/50 dark:border-violet-500 dark:text-violet-300 shadow-xs"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Orientation */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  Page Orientation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer",
                      orientation === "portrait"
                        ? "bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-950/50 dark:border-violet-500 dark:text-violet-300 shadow-xs"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <span>📄</span> Portrait
                  </button>
                  <button
                    onClick={() => setOrientation("landscape")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer",
                      orientation === "landscape"
                        ? "bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-950/50 dark:border-violet-500 dark:text-violet-300 shadow-xs"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <span>📜</span> Landscape
                  </button>
                </div>
              </div>

              {/* 3. Typography & Font Family */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  Font Style / Typography
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="Helvetica">Helvetica (Clean Sans-Serif)</option>
                  <option value="TimesRoman">Times Roman (Classic Serif)</option>
                  <option value="Courier">Courier (Monospace Code)</option>
                </select>
              </div>

              {/* 4. Font Size & Line Spacing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Font Size
                    </label>
                    <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 font-mono">
                      {fontSize} pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min={9}
                    max={20}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Line Spacing
                  </label>
                  <select
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value={1.0}>1.0x (Compact)</option>
                    <option value={1.3}>1.3x (Standard)</option>
                    <option value={1.5}>1.5x (Medium)</option>
                    <option value={2.0}>2.0x (Double)</option>
                  </select>
                </div>
              </div>

              {/* 5. Page Margins */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Page Margins
                </label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value={36}>Narrow (36 pt / 0.5 in)</option>
                  <option value={50}>Standard (50 pt / 0.7 in)</option>
                  <option value={72}>Wide (72 pt / 1.0 in)</option>
                </select>
              </div>

              {/* Primary Convert Button */}
              <button
                onClick={handleConvert}
                disabled={processing || !textValue.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 text-xs shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Convert to PDF
                  </>
                )}
              </button>

            </div>
          </div>

        </div>
      )}
    </>
  );
}

// Markdown parser helper for HTML preview mode
function renderSimpleMarkdown(markdown: string): string {
  if (!markdown.trim()) return '<p class="text-zinc-400 italic">No text content to preview.</p>';

  const lines = markdown.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const l = line.trim();
    if (!l) {
      result.push('<div class="h-2"></div>');
      continue;
    }

    if (l.startsWith("# ")) {
      result.push(`<h1 class="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1.5 mt-4 mb-2">${formatInline(l.slice(2))}</h1>`);
    } else if (l.startsWith("## ")) {
      result.push(`<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1 mt-3 mb-1.5">${formatInline(l.slice(3))}</h2>`);
    } else if (l.startsWith("### ")) {
      result.push(`<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-2 mb-1">${formatInline(l.slice(4))}</h3>`);
    } else if (l.startsWith("> ")) {
      result.push(`<blockquote class="border-l-4 border-violet-500 pl-3 py-1 my-2 italic text-zinc-600 dark:text-zinc-400 bg-violet-500/5 rounded-r-lg">${formatInline(l.slice(2))}</blockquote>`);
    } else if (l.startsWith("- ") || l.startsWith("* ")) {
      result.push(`<li class="ml-4 list-disc text-zinc-800 dark:text-zinc-200 my-0.5">${formatInline(l.slice(2))}</li>`);
    } else {
      result.push(`<p class="mb-1 text-zinc-800 dark:text-zinc-200">${formatInline(l)}</p>`);
    }
  }

  return result.join("");
}

function formatInline(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-zinc-900 dark:text-zinc-100">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[11px] text-violet-600 dark:text-violet-400">$1</code>');
}
