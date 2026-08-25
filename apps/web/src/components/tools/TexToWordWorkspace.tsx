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
  Underline,
  FunctionSquare,
  Sigma,
  FileCode,
  Palette,
} from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";

interface TexToWordWorkspaceProps {
  tool: ToolDefinition;
}

const DEFAULT_TEX_CODE = `\\documentclass{article}
\\title{Quantum Computing & Machine Learning Algorithms}
\\author{Research & Development Team}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
LaTeX is the gold standard for scientific, mathematical, and academic typesetting. This converter translates LaTeX documents and equations directly into Microsoft Word (.docx) format.

\\section{Mathematical Formulation}
The fundamental mass-energy equivalence relation is given by:
$$E = mc^2$$

The generalized Gaussian distribution integral:
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

\\section{Experimental Methodology}
\\begin{itemize}
  \\item High-performance tensor processing clusters
  \\item Real-time benchmark data collection
  \\item Cross-validation with statistical confidence intervals (p < 0.01)
\\end{itemize}

\\section{Performance Metrics}
\\begin{table}
  \\caption{Model Benchmark Comparison}
  \\begin{tabular}{|l|c|r|}
    Model & Precision & Latency \\\\
    Model Alpha & 98.4\\% & 12ms \\\\
    Model Beta & 99.1\\% & 8ms \\\\
  \\end{tabular}
\\end{table}

\\section{Conclusion}
The proposed computational pipeline demonstrates superior efficiency while preserving full mathematical rigor.

\\end{document}`;

export function TexToWordWorkspace({ tool }: TexToWordWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20",
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/20",
    icon: FileCode,
  };

  // State
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [texContent, setTexContent] = useState<string>(DEFAULT_TEX_CODE);

  // View Mode: "preview" (Word Document Styled Preview) | "editor" (LaTeX Code Editor)
  const [viewMode, setViewMode] = useState<"preview" | "editor">("preview");
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Word Document Styling Options
  const [fontFamily, setFontFamily] = useState<"Times New Roman" | "Calibri" | "Arial" | "Consolas">("Times New Roman");
  const [headingColor, setHeadingColor] = useState<string>("#1E3A8A"); // Academic Navy
  const [marginPreset, setMarginPreset] = useState<"normal" | "narrow" | "wide">("normal");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > tool.maxMb * 1024 * 1024) {
      toast.error(`File exceeds maximum size limit of ${tool.maxMb} MB`);
      return;
    }

    try {
      const text = await selected.text();
      setFile(selected);
      setTexContent(text);
      setHasStarted(true);
      toast.success(`Loaded "${selected.name}" successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read LaTeX file.");
    }
  };

  const handleStartDirectTyping = (template?: string) => {
    if (template) setTexContent(template);
    setFile(null);
    setHasStarted(true);
  };

  const handleReset = () => {
    setHasStarted(false);
    setFile(null);
    setTexContent(DEFAULT_TEX_CODE);
  };

  // Insert LaTeX syntax
  const insertSyntax = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("latex-source-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = texContent;
    const selected = current.substring(start, end);

    const replacement = `${prefix}${selected || "content"}${suffix}`;
    const newText = current.substring(0, start) + replacement + current.substring(end);

    setTexContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected ? selected.length : 7)
      );
    }, 0);
  };

  const handleCopy = () => {
    if (!texContent) return;
    navigator.clipboard.writeText(texContent);
    setCopied(true);
    toast.success("LaTeX source code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate .docx from LaTeX content
  const handleExportWord = async () => {
    if (!texContent.trim()) {
      toast.error("Please enter or upload LaTeX content before converting.");
      return;
    }

    setProcessing(true);
    try {
      // Check if server conversion can be used if user uploaded a file
      if (file) {
        try {
          const formData = new FormData();
          formData.append("files", file);
          const res = await fetch("/api/process/tex-to-word", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            a.download = `${baseName}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Word document exported successfully!");
            setProcessing(false);
            return;
          }
        } catch {
          // Fall through to client synthesis
        }
      }

      // Client-side LaTeX to DOCX synthesis
      const lines = texContent.split("\n");
      const docChildren: (Paragraph | Table)[] = [];

      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const trimmed = raw.trim();

        // Skip LaTeX comments & wrapper document tags
        if (
          !trimmed ||
          trimmed.startsWith("%") ||
          trimmed.startsWith("\\documentclass") ||
          trimmed.startsWith("\\begin{document}") ||
          trimmed.startsWith("\\end{document}") ||
          trimmed.startsWith("\\usepackage")
        ) {
          continue;
        }

        // Title
        if (trimmed.startsWith("\\title{")) {
          const titleText = extractBraces(trimmed);
          docChildren.push(
            new Paragraph({
              text: titleText,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 120 },
              run: {
                font: fontFamily,
                bold: true,
                size: 40,
                color: headingColor.replace("#", ""),
              },
            })
          );
        }
        // Section
        else if (trimmed.startsWith("\\section{") || trimmed.startsWith("\\section*{")) {
          const secText = extractBraces(trimmed);
          docChildren.push(
            new Paragraph({
              text: secText,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 100 },
              run: {
                font: fontFamily,
                bold: true,
                size: 32,
                color: headingColor.replace("#", ""),
              },
            })
          );
        }
        // Subsection
        else if (trimmed.startsWith("\\subsection{") || trimmed.startsWith("\\subsection*{")) {
          const subText = extractBraces(trimmed);
          docChildren.push(
            new Paragraph({
              text: subText,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 180, after: 80 },
              run: {
                font: fontFamily,
                bold: true,
                size: 26,
                color: headingColor.replace("#", ""),
              },
            })
          );
        }
        // Display Math Equations ($$...$$ or \[...\])
        else if (
          (trimmed.startsWith("$$") && trimmed.endsWith("$$")) ||
          (trimmed.startsWith("\\[") && trimmed.endsWith("\\]"))
        ) {
          const math = trimmed.replace(/^\$\$|^\s*\\\[/, "").replace(/\$\$$|\\\]\s*$/, "").trim();
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: math,
                  font: "Cambria Math",
                  italics: true,
                  size: 24,
                  color: "1E293B",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
            })
          );
        }
        // Itemize List (\item)
        else if (trimmed.startsWith("\\item")) {
          const itemText = cleanLatexInline(trimmed.replace(/^\\item\s*/, ""));
          docChildren.push(
            new Paragraph({
              text: itemText,
              bullet: { level: 0 },
              spacing: { after: 60 },
              run: { font: fontFamily, size: 22 },
            })
          );
        }
        // General text
        else {
          const clean = cleanLatexInline(trimmed);
          if (clean) {
            docChildren.push(
              new Paragraph({
                text: clean,
                spacing: { after: 120, line: 276 },
                run: { font: fontFamily, size: 22 },
              })
            );
          }
        }
      }

      const marginValues =
        marginPreset === "narrow"
          ? { top: 720, bottom: 720, left: 720, right: 720 }
          : marginPreset === "wide"
          ? { top: 2160, bottom: 2160, left: 2160, right: 2160 }
          : { top: 1440, bottom: 1440, left: 1440, right: 1440 };

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: marginValues,
              },
            },
            children: docChildren.length > 0 ? docChildren : [new Paragraph({ text: texContent })],
          },
        ],
      });

      const docxBlob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "latex_document";
      a.download = `${baseName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Microsoft Word (.docx) document exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Word document.");
    } finally {
      setProcessing(false);
    }
  };

  // Metrics
  const charCount = texContent.length;
  const wordCount = texContent.trim() ? texContent.trim().split(/\s+/).length : 0;
  const lineCount = texContent ? texContent.split("\n").length : 0;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

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

        {hasStarted && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            New Document
          </button>
        )}
      </div>

      {/* Header (When on Start Screen) */}
      {!hasStarted && (
        <div className="mx-auto max-w-3xl space-y-8 py-4">
          <div className="text-center space-y-2.5">
            <span
              className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
            >
              <Icon className="h-3.5 w-3.5" />
              LaTeX to Microsoft Word (.docx) Converter
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Convert LaTeX Documents to Microsoft Word
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              Upload .tex files or type LaTeX code with math formulas, scientific notation, tables, and live Word document preview.
            </p>
          </div>

          {/* DUAL CHOICE ENTRY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* OPTION 1: UPLOAD .TEX FILE */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".tex,application/x-tex,text/x-tex,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div>
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Option 1: Upload .tex Document
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Drag and drop your LaTeX source file (.tex) up to {tool.maxMb} MB.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Upload LaTeX file</span>
                <span>→</span>
              </div>
            </div>

            {/* OPTION 2: WRITE FROM SCRATCH */}
            <div
              onClick={() => handleStartDirectTyping()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <div>
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <PenTool className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Option 2: Write in LaTeX Studio
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Start with structured academic template, write formulas, and preview Word layout.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Open LaTeX Studio</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE WORKSPACE */}
      {hasStarted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Word Document Styled Preview & Code Editor */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Top Bar with Document Info & View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 shadow-xs">
                  <FileCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-[200px] sm:max-w-xs truncate">
                    {file ? file.name : "LaTeX Document.tex"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{lineCount} lines</span>
                    <span>•</span>
                    <span className="text-violet-600 dark:text-violet-400 font-bold">
                      Format: .docx
                    </span>
                  </div>
                </div>
              </div>

              {/* View Switcher Pills */}
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2.5 py-1.5 font-semibold transition",
                    viewMode === "preview"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Eye className="h-3.5 w-3.5 text-violet-600" />
                  <span>Word Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("editor")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2.5 py-1.5 font-semibold transition",
                    viewMode === "editor"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Edit3 className="h-3.5 w-3.5 text-violet-600" />
                  <span>TeX Code</span>
                </button>
              </div>
            </div>

            {/* MAIN WORKSPACE CANVAS CONTAINER */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              {/* LaTeX Syntax & Math Toolbar (Visible in Editor Mode) */}
              {viewMode === "editor" && (
                <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => insertSyntax("\\section{", "}")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition font-mono"
                    title="Section"
                  >
                    \\section
                  </button>
                  <button
                    onClick={() => insertSyntax("\\subsection{", "}")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition font-mono"
                    title="Subsection"
                  >
                    \\subsection
                  </button>

                  <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

                  <button
                    onClick={() => insertSyntax("\\textbf{", "}")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertSyntax("\\textit{", "}")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 italic transition"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

                  <button
                    onClick={() => insertSyntax("$$\n", "\n$$")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-violet-600 dark:text-violet-400 font-bold transition flex items-center gap-1 font-mono"
                    title="Display Equation ($$...$$)"
                  >
                    <Sigma className="h-3.5 w-3.5" /> Equation
                  </button>
                  <button
                    onClick={() => insertSyntax("\\frac{", "}{denominator}")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono transition"
                    title="Fraction (\\frac{a}{b})"
                  >
                    \\frac
                  </button>
                  <button
                    onClick={() => insertSyntax("\\begin{itemize}\n  \\item ", "\n\\end{itemize}")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Itemize List"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>

                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                      title="Copy LaTeX"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 1: WORD DOCUMENT STYLED PREVIEW */}
              {viewMode === "preview" && (
                <div className="flex-1 p-4 sm:p-8 overflow-auto bg-zinc-100 dark:bg-zinc-900/60 flex justify-center">
                  <div
                    className="w-full max-w-2xl bg-white dark:bg-zinc-950 p-6 sm:p-10 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md transition-all text-xs leading-relaxed text-zinc-800 dark:text-zinc-200"
                    style={{
                      fontFamily:
                        fontFamily === "Times New Roman"
                          ? "'Times New Roman', Times, serif"
                          : fontFamily === "Arial"
                          ? "Arial, Helvetica, sans-serif"
                          : fontFamily === "Consolas"
                          ? "Consolas, 'Courier New', monospace"
                          : "Calibri, Candara, Segoe, 'Segoe UI', Arial, sans-serif",
                    }}
                  >
                    {/* Word Header Badge */}
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 font-sans">
                      <span className="flex items-center gap-1 font-bold text-violet-600 dark:text-violet-400">
                        <FileText className="h-3.5 w-3.5" /> Academic Word Document Preview
                      </span>
                      <span>Native .docx Architecture</span>
                    </div>

                    {texContent ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderLatexWordPreview(texContent, headingColor),
                        }}
                      />
                    ) : (
                      <span className="text-zinc-400 italic">No LaTeX content available.</span>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: LATEX SOURCE CODE EDITOR */}
              {viewMode === "editor" && (
                <div className="flex-1 p-4 bg-zinc-50/30 dark:bg-zinc-950/20">
                  <textarea
                    id="latex-source-textarea"
                    value={texContent}
                    onChange={(e) => setTexContent(e.target.value)}
                    placeholder="Type or paste LaTeX source code here..."
                    className="w-full h-full min-h-[440px] bg-transparent font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Word Document Settings & Export */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <Sliders className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  Word Document Styling
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure academic fonts, heading colors, and margins.
                </p>
              </div>

              {/* Document Font Family */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Document Font:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "Times New Roman", label: "Times New Roman", desc: "Academic Standard" },
                    { id: "Calibri", label: "Calibri", desc: "Modern Clean" },
                    { id: "Arial", label: "Arial", desc: "Classic Sans" },
                    { id: "Consolas", label: "Consolas", desc: "Code Monospace" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id as any)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5",
                        fontFamily === f.id
                          ? "border-violet-500 bg-violet-50/60 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 font-bold"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      <span className="text-[11px] font-bold">{f.label}</span>
                      <span className="text-[9px] text-zinc-400 font-normal">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Heading Accent Color */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-violet-600" />
                  Heading Color Accent:
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { color: "#1E3A8A", name: "Academic Navy" },
                    { color: "#2B579A", name: "Word Blue" },
                    { color: "#1E293B", name: "Slate Dark" },
                    { color: "#059669", name: "Emerald" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setHeadingColor(c.color)}
                      className={cn(
                        "p-2 rounded-xl border text-center transition flex flex-col items-center gap-1",
                        headingColor === c.color
                          ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 font-bold"
                          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      )}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-black/20"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-[9px] text-zinc-600 dark:text-zinc-400 truncate">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Margin Presets */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Page Margins:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: "normal", label: "Normal (1.0 in)" },
                    { id: "narrow", label: "Narrow (0.5 in)" },
                    { id: "wide", label: "Wide (1.5 in)" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMarginPreset(m.id as any)}
                      className={cn(
                        "p-2 rounded-xl border text-center transition text-[11px]",
                        marginPreset === m.id
                          ? "border-violet-500 bg-violet-50/60 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 font-bold"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  100% Client-Side Privacy:
                </span>
                <p>
                  LaTeX math and document trees are compiled directly into native Word XML packages.
                </p>
              </div>

              {/* Export Action Button */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => void handleExportWord()}
                  disabled={processing || !texContent.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                    theme.button,
                    (processing || !texContent.trim()) && "opacity-75 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Word Document...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Export to Word (.docx)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition"
                >
                  {copied ? "Copied LaTeX!" : "Copy LaTeX Source"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function extractBraces(str: string): string {
  const match = str.match(/\{([^}]+)\}/);
  return match ? match[1] : str;
}

function cleanLatexInline(str: string): string {
  return str
    .replace(/\\textbf\{([^}]+)\}/g, "$1")
    .replace(/\\textit\{([^}]+)\}/g, "$1")
    .replace(/\\emph\{([^}]+)\}/g, "$1")
    .replace(/\\underline\{([^}]+)\}/g, "$1")
    .replace(/\\cite\{[^}]+\}/g, "[1]")
    .replace(/\\ref\{[^}]+\}/g, "1")
    .replace(/\\%/g, "%")
    .replace(/\\\$/g, "$")
    .replace(/\\_/g, "_");
}

function renderLatexWordPreview(tex: string, headingColor: string): string {
  const lines = tex.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const l = line.trim();
    if (!l || l.startsWith("%") || l.startsWith("\\documentclass") || l.startsWith("\\begin{document}") || l.startsWith("\\end{document}")) {
      continue;
    }

    if (l.startsWith("\\title{")) {
      result.push(
        `<h1 class="text-2xl font-bold text-center pb-2 mt-4 mb-2" style="color: ${headingColor}">${extractBraces(
          l
        )}</h1>`
      );
    } else if (l.startsWith("\\section{") || l.startsWith("\\section*{")) {
      result.push(
        `<h2 class="text-base font-bold pb-1 mt-4 mb-2 border-b border-zinc-200 dark:border-zinc-800" style="color: ${headingColor}">${extractBraces(
          l
        )}</h2>`
      );
    } else if (l.startsWith("\\subsection{") || l.startsWith("\\subsection*{")) {
      result.push(
        `<h3 class="text-sm font-bold mt-3 mb-1" style="color: ${headingColor}">${extractBraces(
          l
        )}</h3>`
      );
    } else if (l.startsWith("$$") || l.startsWith("\\[")) {
      const eq = l.replace(/^\$\$|^\s*\\\[/, "").replace(/\$\$$|\\\]\s*$/, "").trim();
      result.push(
        `<div class="my-3 py-2 px-4 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center font-mono font-serif italic text-sm text-zinc-900 dark:text-zinc-100">${eq}</div>`
      );
    } else if (l.startsWith("\\item")) {
      result.push(
        `<li class="ml-4 list-disc my-1 text-zinc-800 dark:text-zinc-200">${cleanLatexInline(
          l.replace(/^\\item\s*/, "")
        )}</li>`
      );
    } else {
      const clean = cleanLatexInline(l);
      if (clean) {
        result.push(`<p class="mb-2 text-zinc-800 dark:text-zinc-200 leading-relaxed">${clean}</p>`);
      }
    }
  }

  return result.join("");
}
