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
  Strikethrough,
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

interface MarkdownToWordWorkspaceProps {
  tool: ToolDefinition;
}

const DEFAULT_MARKDOWN = `# Business Strategy & Technical Overview

Welcome to the **Markdown to Word (.docx) Converter**! Convert your Markdown notes and documentation into beautifully formatted Microsoft Word documents.

## 🎯 Executive Summary
Markdown enables fast and structured writing. This tool transforms raw markdown syntax into styled Word documents with proper heading hierarchies, tables, bullet points, and callouts.

### 📊 Quarterly Milestones
| Milestone | Target Quarter | Status | Priority |
| :--- | :--- | :--- | :--- |
| Core Architecture | Q1 2026 | **Completed** | High |
| Cloud Migration | Q2 2026 | *In Progress* | Critical |
| Global Rollout | Q3 2026 | Scheduled | Medium |

> "Excellence is not an act, but a habit." — Aristotle

### 💻 Code Snippet
\`\`\`typescript
interface Config {
  title: string;
  theme: "office" | "academic" | "tech";
  enableTables: boolean;
}
\`\`\`

### 📝 Next Action Items
- [x] Review document typography & margins
- [x] Verify table borders & column alignment
- [ ] Export final Microsoft Word (.docx) file

Start typing or editing your content here...`;

export function MarkdownToWordWorkspace({ tool }: MarkdownToWordWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20",
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/20",
    icon: FileText,
  };

  // State
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [markdownValue, setMarkdownValue] = useState<string>(DEFAULT_MARKDOWN);

  // View mode: "edit" (Markdown source editor) | "preview" (Styled Word document view)
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Word Document Styling Options
  const [fontFamily, setFontFamily] = useState<"Calibri" | "Times New Roman" | "Arial" | "Consolas">("Calibri");
  const [headingColor, setHeadingColor] = useState<string>("#2B579A"); // Classic Word Blue
  const [lineSpacing, setLineSpacing] = useState<number>(276); // ~1.15x spacing in twentieths of a point
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
      setMarkdownValue(text);
      setHasStarted(true);
      toast.success(`Loaded "${selected.name}" successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read markdown file.");
    }
  };

  const handleStartDirectTyping = (template?: string) => {
    if (template) setMarkdownValue(template);
    setFile(null);
    setHasStarted(true);
  };

  const handleReset = () => {
    setHasStarted(false);
    setFile(null);
    setMarkdownValue(DEFAULT_MARKDOWN);
  };

  // Insert markdown formatting
  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("markdown-word-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = markdownValue;
    const selected = current.substring(start, end);

    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const newText = current.substring(0, start) + replacement + current.substring(end);

    setMarkdownValue(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected ? selected.length : 4)
      );
    }, 0);
  };

  const insertTable = () => {
    const tableTemplate = `\n| Item Name | Category | Quantity | Unit Price |\n| :--- | :--- | :--- | :--- |\n| Hardware Widget | Electronics | 150 | $45.00 |\n| Premium License | Software | 25 | $120.00 |\n\n`;
    insertFormatting(tableTemplate);
  };

  const handleCopy = () => {
    if (!markdownValue) return;
    navigator.clipboard.writeText(markdownValue);
    setCopied(true);
    toast.success("Markdown copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate .docx Word file
  const handleExportWord = async () => {
    if (!markdownValue.trim()) {
      toast.error("Please enter some markdown content before converting.");
      return;
    }

    setProcessing(true);
    try {
      // Parse markdown lines into docx Paragraphs and Tables
      const lines = markdownValue.split("\n");
      const docChildren: (Paragraph | Table)[] = [];

      let currentTableRows: string[][] = [];

      const flushTable = () => {
        if (currentTableRows.length === 0) return;

        const tableRows = currentTableRows.map((rowCells, rIdx) => {
          const isHeader = rIdx === 0;
          return new TableRow({
            children: rowCells.map((cellText) => {
              return new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cellText.trim(),
                        bold: isHeader,
                        font: fontFamily,
                        size: 20, // 10pt
                        color: isHeader ? "000000" : "333333",
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
                shading: isHeader ? { fill: "F1F5F9" } : undefined,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                },
              });
            }),
          });
        });

        docChildren.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );

        // Add small spacing after table
        docChildren.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        currentTableRows = [];
      };

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();

        // Check if table row
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          const cells = trimmed
            .split("|")
            .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

          // Skip separator row (| :--- | :--- |)
          if (!cells.some((c) => c.includes("---"))) {
            currentTableRows.push(cells);
          }
          continue;
        } else if (currentTableRows.length > 0) {
          flushTable();
        }

        // Empty line
        if (!trimmed) {
          docChildren.push(new Paragraph({ text: "", spacing: { after: 100 } }));
          continue;
        }

        // H1 Heading
        if (trimmed.startsWith("# ")) {
          docChildren.push(
            new Paragraph({
              text: trimmed.slice(2).trim(),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
              run: {
                font: fontFamily,
                bold: true,
                size: 36, // 18pt
                color: headingColor.replace("#", ""),
              },
            })
          );
        }
        // H2 Heading
        else if (trimmed.startsWith("## ")) {
          docChildren.push(
            new Paragraph({
              text: trimmed.slice(3).trim(),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              run: {
                font: fontFamily,
                bold: true,
                size: 28, // 14pt
                color: headingColor.replace("#", ""),
              },
            })
          );
        }
        // H3 Heading
        else if (trimmed.startsWith("### ")) {
          docChildren.push(
            new Paragraph({
              text: trimmed.slice(4).trim(),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 160, after: 80 },
              run: {
                font: fontFamily,
                bold: true,
                size: 24, // 12pt
                color: headingColor.replace("#", ""),
              },
            })
          );
        }
        // Blockquote
        else if (trimmed.startsWith("> ")) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmed.slice(2).trim(),
                  italics: true,
                  font: fontFamily,
                  size: 22,
                  color: "475569",
                }),
              ],
              indent: { left: 720 },
              spacing: { before: 100, after: 100 },
            })
          );
        }
        // Bullet List
        else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          docChildren.push(
            new Paragraph({
              text: trimmed.slice(2).trim(),
              bullet: { level: 0 },
              spacing: { after: 60 },
              run: { font: fontFamily, size: 22 },
            })
          );
        }
        // Checkbox Task
        else if (trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: "☑ ", bold: true, color: "2563EB" }),
                new TextRun({
                  text: trimmed.slice(6).trim(),
                  strike: true,
                  font: fontFamily,
                  size: 22,
                  color: "64748B",
                }),
              ],
              spacing: { after: 60 },
            })
          );
        } else if (trimmed.startsWith("- [ ] ")) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: "☐ ", bold: true }),
                new TextRun({
                  text: trimmed.slice(6).trim(),
                  font: fontFamily,
                  size: 22,
                }),
              ],
              spacing: { after: 60 },
            })
          );
        }
        // Standard Paragraph
        else {
          docChildren.push(
            new Paragraph({
              children: parseInlineRuns(trimmed, fontFamily),
              spacing: { after: 120, line: lineSpacing },
            })
          );
        }
      }

      if (currentTableRows.length > 0) {
        flushTable();
      }

      // Page Margins in twips (1 inch = 1440 twips)
      const marginValues =
        marginPreset === "narrow"
          ? { top: 720, bottom: 720, left: 720, right: 720 }
          : marginPreset === "wide"
          ? { top: 2160, bottom: 2160, left: 2160, right: 2160 }
          : { top: 1440, bottom: 1440, left: 1440, right: 1440 }; // normal 1 inch

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: marginValues,
              },
            },
            children: docChildren,
          },
        ],
      });

      const docxBlob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "document";
      a.download = `${baseName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Microsoft Word (.docx) file exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Word document.");
    } finally {
      setProcessing(false);
    }
  };

  // Metrics
  const charCount = markdownValue.length;
  const wordCount = markdownValue.trim() ? markdownValue.trim().split(/\s+/).length : 0;
  const lineCount = markdownValue ? markdownValue.split("\n").length : 0;
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
              Markdown to Microsoft Word (.docx) Converter
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Convert Markdown to Microsoft Word
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              Transform Markdown documents into styled .docx files with preserved headings, tables, bullet points, and code formatting.
            </p>
          </div>

          {/* DUAL CHOICE ENTRY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* OPTION 1: UPLOAD .MD FILE */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div>
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Option 1: Upload .md File
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Drag and drop your Markdown file (.md, .markdown) to convert to Word.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>Upload document</span>
                <span>→</span>
              </div>
            </div>

            {/* OPTION 2: WRITE FROM SCRATCH */}
            <div
              onClick={() => handleStartDirectTyping()}
              className="group relative flex flex-col justify-between p-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <div>
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                  <PenTool className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Option 2: Write in Markdown Editor
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Start with rich template or type notes directly with Word-styled preview.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>Open Word Studio</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE WORKSPACE */}
      {hasStarted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Word Document Styled Preview & Markdown Editor */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Top Bar with Document Info & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-[200px] sm:max-w-xs truncate">
                    {file ? file.name : "Untitled Document.md"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{lineCount} lines</span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
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
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  <span>Word Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2.5 py-1.5 font-semibold transition",
                    viewMode === "edit"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  <span>MD Editor</span>
                </button>
              </div>
            </div>

            {/* MAIN WORKSPACE CANVAS CONTAINER */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              {/* Markdown Formatting Toolbar (Visible in Edit Mode) */}
              {viewMode === "edit" && (
                <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="Bold (**text**)"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("*", "*")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 italic transition"
                    title="Italic (*text*)"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("~~", "~~")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Strikethrough (~~text~~)"
                  >
                    <Strikethrough className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

                  <button
                    onClick={() => insertFormatting("# ")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="H1 Title"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => insertFormatting("## ")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="H2 Subtitle"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => insertFormatting("### ")}
                    className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition"
                    title="H3 Section"
                  >
                    H3
                  </button>

                  <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

                  <button
                    onClick={() => insertFormatting("- ")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Bullet List"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("- [ ] ")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Task Checkbox"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={insertTable}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Insert Table"
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("```\n", "\n```")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono transition"
                    title="Code Block"
                  >
                    <Code className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting("> ")}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                    title="Blockquote"
                  >
                    <Quote className="h-3.5 w-3.5" />
                  </button>

                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                      title="Copy Markdown"
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
                          : "Calibri, Candara, Segoe, 'Segoe UI', Optima, Arial, sans-serif",
                    }}
                  >
                    {/* Word Header Badge */}
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 font-sans">
                      <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                        <FileText className="h-3.5 w-3.5" /> Microsoft Word Document Preview
                      </span>
                      <span>100% Native .docx Format</span>
                    </div>

                    {markdownValue ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderWordPreview(markdownValue, headingColor),
                        }}
                      />
                    ) : (
                      <span className="text-zinc-400 italic">No markdown content available.</span>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: MARKDOWN TEXTAREA EDITOR */}
              {viewMode === "edit" && (
                <div className="flex-1 p-4 bg-zinc-50/30 dark:bg-zinc-950/20">
                  <textarea
                    id="markdown-word-textarea"
                    value={markdownValue}
                    onChange={(e) => setMarkdownValue(e.target.value)}
                    placeholder="Type or paste your markdown text here..."
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
                  <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Word Document Styling
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure fonts, heading accents, and margins.
                </p>
              </div>

              {/* Document Font Family */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Document Font:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "Calibri", label: "Calibri", desc: "Modern Office" },
                    { id: "Times New Roman", label: "Times New Roman", desc: "Academic" },
                    { id: "Arial", label: "Arial", desc: "Standard Clean" },
                    { id: "Consolas", label: "Consolas", desc: "Monospace Tech" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id as any)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5",
                        fontFamily === f.id
                          ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-bold"
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
                  <Palette className="h-3.5 w-3.5 text-blue-600" />
                  Heading Color Accent:
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { color: "#2B579A", name: "Word Blue" },
                    { color: "#1E293B", name: "Slate Dark" },
                    { color: "#059669", name: "Emerald" },
                    { color: "#6366F1", name: "Indigo" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setHeadingColor(c.color)}
                      className={cn(
                        "p-2 rounded-xl border text-center transition flex flex-col items-center gap-1",
                        headingColor === c.color
                          ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 font-bold"
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
                          ? "border-blue-500 bg-blue-50/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-bold"
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
                  Documents are compiled into native Microsoft Word XML packages directly in your browser.
                </p>
              </div>

              {/* Export Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => void handleExportWord()}
                  disabled={processing || !markdownValue.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-500 shadow-blue-600/20",
                    (processing || !markdownValue.trim()) && "opacity-75 cursor-not-allowed"
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
                  {copied ? "Copied Markdown!" : "Copy Markdown Source"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline TextRun parser helper for docx
function parseInlineRuns(text: string, font: string): TextRun[] {
  // Simple regex for bold, italic, code
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font,
          size: 22,
        })
      );
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          italics: true,
          font,
          size: 22,
        })
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          font: "Consolas",
          size: 20,
          color: "2563EB",
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: part,
          font,
          size: 22,
        })
      );
    }
  }

  return runs;
}

// Markdown parser helper for Word preview
function renderWordPreview(markdown: string, headingColor: string): string {
  if (!markdown.trim()) return '<p class="text-zinc-400 italic">No text content.</p>';

  const lines = markdown.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const l = line.trim();
    if (!l) {
      result.push('<div class="h-2.5"></div>');
      continue;
    }

    if (l.startsWith("# ")) {
      result.push(
        `<h1 class="text-xl font-bold pb-1 mt-4 mb-2" style="color: ${headingColor}">${formatInline(
          l.slice(2)
        )}</h1>`
      );
    } else if (l.startsWith("## ")) {
      result.push(
        `<h2 class="text-base font-bold pb-0.5 mt-3 mb-1.5" style="color: ${headingColor}">${formatInline(
          l.slice(3)
        )}</h2>`
      );
    } else if (l.startsWith("### ")) {
      result.push(
        `<h3 class="text-sm font-bold mt-2 mb-1" style="color: ${headingColor}">${formatInline(
          l.slice(4)
        )}</h3>`
      );
    } else if (l.startsWith("> ")) {
      result.push(
        `<blockquote class="border-l-4 pl-3 py-1 my-2 italic text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-r border-blue-500">${formatInline(
          l.slice(2)
        )}</blockquote>`
      );
    } else if (l.startsWith("- [x] ") || l.startsWith("- [X] ")) {
      result.push(
        `<div class="flex items-center gap-2 my-1"><span class="text-blue-600 font-bold">☑</span> <span class="line-through text-zinc-500">${formatInline(
          l.slice(6)
        )}</span></div>`
      );
    } else if (l.startsWith("- [ ] ")) {
      result.push(
        `<div class="flex items-center gap-2 my-1"><span>☐</span> <span>${formatInline(
          l.slice(6)
        )}</span></div>`
      );
    } else if (l.startsWith("- ") || l.startsWith("* ")) {
      result.push(
        `<li class="ml-4 list-disc text-zinc-800 dark:text-zinc-200 my-0.5">${formatInline(
          l.slice(2)
        )}</li>`
      );
    } else if (l.startsWith("|") && l.endsWith("|")) {
      const cells = l.split("|").filter((_, i, a) => i !== 0 && i !== a.length - 1);
      if (cells.some((c) => c.includes("---"))) {
        continue;
      }
      result.push(
        `<div class="grid grid-cols-${cells.length} gap-2 p-1.5 rounded text-xs border border-zinc-200 dark:border-zinc-800 my-1 bg-zinc-50/50 dark:bg-zinc-900/50">${cells
          .map((c) => `<div class="truncate">${formatInline(c.trim())}</div>`)
          .join("")}</div>`
      );
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
    .replace(/~~(.*?)~~/g, '<span class="line-through text-zinc-500">$1</span>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[11px] text-blue-600 dark:text-blue-400">$1</code>');
}
