"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  Settings,
  FileText,
  Sliders,
  Type,
  Layout,
  HelpCircle,
  FileCheck,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import * as pdf from "@/lib/client/pdf-tools";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface PageNumbersWorkspaceProps {
  tool: ToolDefinition;
}

export function PageNumbersWorkspace({ tool }: PageNumbersWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  // Positions Grid
  const [position, setPosition] = useState<
    | "top-left"
    | "top-center"
    | "top-right"
    | "middle-left"
    | "middle-center"
    | "middle-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right"
  >("bottom-center");

  // Format options
  const [numStyle, setNumStyle] = useState<"1,2,3" | "i,ii,iii" | "I,II,III" | "a,b,c" | "A,B,C">("1,2,3");
  const [startNumber, setStartNumber] = useState<number>(1);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  // Margin slider
  const [margin, setMargin] = useState<number>(30); // in points (10 - 100)

  // Typography controls
  const [fontFamily, setFontFamily] = useState<"Helvetica" | "TimesRoman" | "Courier">("Helvetica");
  const [fontSize, setFontSize] = useState<number>(12); // in points (6 - 36)

  // Live preview mockup page numbering format helper
  const getPreviewNumber = () => {
    let formatted = "";
    if (numStyle === "1,2,3") formatted = String(startNumber);
    else if (numStyle === "i,ii,iii") formatted = "i";
    else if (numStyle === "I,II,III") formatted = "I";
    else if (numStyle === "a,b,c") formatted = "a";
    else if (numStyle === "A,B,C") formatted = "A";
    return `${prefix}${formatted}${suffix}`;
  };

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

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const options: pdf.PageNumberOptions = {
        position,
        margin,
        style: numStyle,
        startNumber,
        prefix,
        suffix,
        fontFamily,
        fontSize,
      };

      const resultBlob = await pdf.addPageNumbers(file, options);
      pdf.downloadBlob(resultBlob, `${file.name.replace(/\.[^/.]+$/, "")}_numbered.pdf`);
      toast.success("Successfully added page numbers!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to process request");
    } finally {
      setProcessing(false);
    }
  };

  // Convert font family values to CSS standard
  const getCssFontFamily = () => {
    if (fontFamily === "TimesRoman") return "'Times New Roman', Times, serif";
    if (fontFamily === "Courier") return "'Courier New', Courier, monospace";
    return "sans-serif";
  };

  // Generate CSS styles for preview dot positioning
  const getMockupPositionStyle = () => {
    const marginPx = `${(margin / 100) * 100}%`;
    const styleObj: React.CSSProperties = {
      position: "absolute",
      fontFamily: getCssFontFamily(),
      fontSize: `${Math.max(8, fontSize * 0.9)}px`,
      fontWeight: "bold",
      color: "#000000",
      lineHeight: 1,
      pointerEvents: "none",
    };

    // Y position
    if (position.startsWith("top")) {
      styleObj.top = `calc(8px + ${margin / 6}px)`;
    } else if (position.startsWith("middle")) {
      styleObj.top = "50%";
      styleObj.transform = "translateY(-50%)";
    } else {
      styleObj.bottom = `calc(8px + ${margin / 6}px)`;
    }

    // X position
    if (position.endsWith("left")) {
      styleObj.left = `calc(8px + ${margin / 6}px)`;
    } else if (position.endsWith("center")) {
      styleObj.left = "50%";
      styleObj.transform = styleObj.transform 
        ? `${styleObj.transform} translateX(-50%)` 
        : "translateX(-50%)";
    } else {
      styleObj.right = `calc(8px + ${margin / 6}px)`;
    }

    return styleObj;
  };

  const Icon = theme.icon;

  return (
    <div className={cn(!file ? "mx-auto max-w-6xl px-4 py-10" : "w-full h-full p-0")}>
      <Toaster position="top-center" richColors />
      {!file && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            PDF Tools
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

      {/* Back Navigation Bar */}
      <div className={cn("flex items-center justify-between mb-4", file ? "px-4 pt-4 lg:px-6" : "")}>
        <Link
          href="/#pdf"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to PDF Tools
        </Link>
      </div>

      <div className={cn(
        "pdf-workspace-theme-wrapper flex flex-col overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white lg:flex-row",
        !file
          ? "lg:h-[450px] min-h-[450px] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl justify-center items-center"
          : "lg:h-[calc(100vh-80px)] min-h-[550px] w-full"
      )}>
        {!file ? (
          <div className="flex w-full max-w-xl flex-col items-center justify-center p-6 mx-auto my-auto">
            <label className="upload-dropzone upload-dropzone-pdf w-full">
              <span className="upload-icon-container">
                <Upload />
              </span>
              <span className="text-center">
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Upload PDF file to add page numbers
                </p>
                <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  Max size {tool.maxMb} MB · Local document processing
                </p>
              </span>
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <>
            {/* LEFT PANEL: CONFIGURATION PANEL */}
            <div className="flex-1 flex flex-col justify-between relative lg:h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900">
              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                {/* File Detail Header */}
                <div className="flex w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                      <FileText className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="max-w-[200px] truncate text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {file.name}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => setFile(null)}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 transition-all duration-200 shadow-md cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" /> Clear File
                  </button>
                </div>

                {/* Configurations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Position Picker & Margins */}
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/10 p-5 space-y-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 flex items-center gap-1.5">
                        <Layout className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        <span>Number Position</span>
                      </span>

                      {/* 3x3 clickable grid */}
                      <div className="flex justify-center py-2">
                        <div className="grid grid-cols-3 gap-3 p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl">
                          {(
                            [
                              "top-left", "top-center", "top-right",
                              "middle-left", "middle-center", "middle-right",
                              "bottom-left", "bottom-center", "bottom-right",
                            ] as const
                          ).map((pos) => {
                            const isSelected = position === pos;
                            return (
                              <button
                                key={pos}
                                onClick={() => setPosition(pos)}
                                className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer relative group",
                                  isSelected
                                    ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-955 shadow-md"
                                    : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-400 dark:text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-400"
                                )}
                                title={pos.replace("-", " ")}
                              >
                                <span className={cn(
                                  "h-2 w-2 rounded-full transition-all",
                                  isSelected 
                                    ? "bg-white dark:bg-zinc-950 scale-110" 
                                    : "bg-zinc-400 dark:bg-zinc-700 group-hover:bg-zinc-500"
                                )} />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Margin Slider */}
                      <div className="space-y-2 pt-2 border-t border-zinc-205 dark:border-zinc-900">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase">
                          <span>Edge Distance (Margin)</span>
                          <span className="font-mono text-zinc-650">{margin} pt</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={margin}
                          onChange={(e) => setMargin(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-950 dark:accent-white"
                        />
                      </div>
                    </div>

                    {/* Typography controls */}
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/10 p-5 space-y-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 flex items-center gap-1.5">
                        <Type className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        <span>Typography settings</span>
                      </span>

                      {/* Font Family */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 dark:text-zinc-500 font-bold uppercase block">Font Family</label>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value as any)}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-300 font-bold focus:border-zinc-400 dark:focus:border-white focus:outline-none transition cursor-pointer"
                        >
                          <option value="Helvetica">Helvetica (Standard)</option>
                          <option value="TimesRoman">Times New Roman</option>
                          <option value="Courier">Courier Monospace</option>
                        </select>
                      </div>

                      {/* Font Size (Slider + Number input) */}
                      <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-900">
                        <label className="text-[9px] text-zinc-500 dark:text-zinc-550 font-bold uppercase block">Font Size</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={6}
                            max={36}
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-950 dark:accent-white"
                          />
                          <input
                            type="number"
                            min={6}
                            max={36}
                            value={fontSize}
                            onChange={(e) => setFontSize(Math.max(6, Math.min(36, Number(e.target.value) || 12)))}
                            className="w-16 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl py-1.5 text-center text-xs font-bold font-mono text-zinc-800 dark:text-zinc-300 focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Format & Style options */}
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/10 p-5 space-y-4 h-full flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                          <span>Number Format</span>
                        </span>

                        {/* Numeral style */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-zinc-500 dark:text-zinc-500 font-bold uppercase block">Numeral Style</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(["1,2,3", "i,ii,iii", "I,II,III", "a,b,c", "A,B,C"] as const).map((style) => (
                              <button
                                key={style}
                                onClick={() => setNumStyle(style)}
                                className={cn(
                                  "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                  numStyle === style
                                    ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-955 shadow-md"
                                    : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-300"
                                )}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Start Number */}
                        <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-900">
                          <label className="text-[9px] text-zinc-500 dark:text-zinc-500 font-bold uppercase block">Start Numbering From</label>
                          <input
                            type="number"
                            min={1}
                            value={startNumber}
                            onChange={(e) => setStartNumber(Math.max(1, Number(e.target.value) || 1))}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-300 font-bold font-mono focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                          />
                        </div>

                        {/* Prefix & Suffix */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-900">
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-500 dark:text-zinc-500 font-bold uppercase block">Prefix Text</label>
                            <input
                              type="text"
                              placeholder="e.g. Page "
                              value={prefix}
                              onChange={(e) => setPrefix(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-300 font-bold focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-500 dark:text-zinc-500 font-bold uppercase block">Suffix Text</label>
                            <input
                              type="text"
                              placeholder="e.g. of 5"
                              value={suffix}
                              onChange={(e) => setSuffix(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-300 font-bold focus:border-zinc-400 dark:focus:border-white focus:outline-none transition"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
        {/* RIGHT STICKY PANEL: LIVE PREVIEW & SETTINGS SUMMARY */}
        <div className="w-full bg-zinc-50 dark:bg-zinc-950 p-6 border-t border-zinc-200 lg:border-t-0 lg:border-l lg:border-zinc-200 dark:border-zinc-900 lg:w-80 flex flex-col justify-between z-20 lg:h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-thin">
            
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-4">
              <ChevronRight className="h-4 w-4 text-zinc-400 rotate-90" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-650 dark:text-zinc-200">
                Live Preview
              </h2>
            </div>

            {/* Preview Box with Mockup Page */}
            <div className="h-56 bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-2xl flex items-center justify-center relative p-4 overflow-hidden">
              {/* Mockup A4 Page */}
              <div className="w-36 h-48 bg-zinc-100 rounded shadow-md relative overflow-hidden transition-all duration-300">
                {/* Dummy Mockup text layout lines */}
                <div className="p-3 space-y-2 select-none opacity-15">
                  <div className="h-1.5 w-full bg-zinc-500 rounded-sm" />
                  <div className="h-1.5 w-5/6 bg-zinc-500 rounded-sm" />
                  <div className="h-1.5 w-11/12 bg-zinc-500 rounded-sm" />
                  <div className="h-1.5 w-2/3 bg-zinc-500 rounded-sm" />
                  <div className="h-1.5 w-3/4 bg-zinc-500 rounded-sm" />
                </div>

                {/* Mockup Page Number positioned configurably */}
                {file && (
                  <div style={getMockupPositionStyle()} className="animate-fadeIn">
                    {getPreviewNumber()}
                  </div>
                )}
              </div>
              
              {!file && (
                <div className="absolute inset-0 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                  <HelpCircle className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mb-1.5" />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                    Upload a file to show mockup preview
                  </p>
                </div>
              )}
            </div>

            {/* Summary Table */}
            {file && (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/10 p-4 space-y-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-500 block">
                  Configuration Summary
                </span>
                
                <table className="w-full text-left text-[10px] text-zinc-600 dark:text-zinc-400">
                  <tbody>
                    <tr className="border-b border-zinc-200 dark:border-zinc-900">
                      <td className="py-2 font-medium">Position:</td>
                      <td className="py-2 text-right text-zinc-800 dark:text-zinc-200 capitalize">{position.replace("-", " ")}</td>
                    </tr>
                    <tr className="border-b border-zinc-200 dark:border-zinc-900">
                      <td className="py-2 font-medium">Numeral:</td>
                      <td className="py-2 text-right text-zinc-800 dark:text-zinc-200">{numStyle}</td>
                    </tr>
                    <tr className="border-b border-zinc-200 dark:border-zinc-900">
                      <td className="py-2 font-medium">Font Family:</td>
                      <td className="py-2 text-right text-zinc-800 dark:text-zinc-200">{fontFamily}</td>
                    </tr>
                    <tr className="border-b border-zinc-200 dark:border-zinc-900">
                      <td className="py-2 font-medium">Font Size:</td>
                      <td className="py-2 text-right text-zinc-800 dark:text-zinc-200 font-mono">{fontSize} pt</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Margin:</td>
                      <td className="py-2 text-right text-zinc-800 dark:text-zinc-200 font-mono">{margin} pt</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-900">
            <button
              onClick={handleProcess}
              disabled={!file || processing}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 cursor-pointer",
                theme.button
              )}
            >
              Add Page Numbers
            </button>
          </div>
        </div>
      </>
    )}
      </div>
    </div>
  );
}
