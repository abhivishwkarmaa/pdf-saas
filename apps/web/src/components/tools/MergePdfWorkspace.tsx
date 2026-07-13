"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  RotateCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Loader2,
  RefreshCw,
  Plus,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface MergePdfWorkspaceProps {
  tool: ToolDefinition;
}

interface MergePage {
  pageIndex: number; // 0-based
  previewUrl: string;
  rotated: number; // 0, 90, 180, 270
  deleted: boolean;
}

interface MergeFile {
  id: string;
  file: File;
  name: string;
  pages: MergePage[];
}

export function MergePdfWorkspace({ tool }: MergePdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Dynamic PDFJS injection
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfjsLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  const loadFilePages = async (id: string, file: File) => {
    setLoadingFiles((prev) => ({ ...prev, [id]: true }));
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error("PDF.js library not loaded yet.");
      }
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDoc.numPages;
      const pages: MergePage[] = [];

      for (let pIndex = 1; pIndex <= numPages; pIndex++) {
        const page = await pdfDoc.getPage(pIndex);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          pages.push({
            pageIndex: pIndex - 1,
            previewUrl: canvas.toDataURL(),
            rotated: 0,
            deleted: false,
          });
        }
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, pages } : f))
      );
    } catch (err) {
      console.error("Error loading PDF pages:", err);
      toast.error(`Could not read pages for ${file.name}`);
      // Remove file if failed to load
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setLoadingFiles((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const uploaded = Array.from(e.target.files);
    
    if (files.length + uploaded.length > 50) {
      toast.error("Maximum 50 PDF files allowed");
      return;
    }

    const newFiles: MergeFile[] = uploaded.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        id,
        file,
        name: file.name,
        pages: [],
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    // Render pages for each uploaded file
    newFiles.forEach((nf) => {
      void loadFilePages(nf.id, nf.file);
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === files.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...files];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFiles(updated);
  };

  const rotatePage = (fileId: string, pageIndex: number) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        return {
          ...f,
          pages: f.pages.map((p) =>
            p.pageIndex === pageIndex
              ? { ...p, rotated: (p.rotated + 90) % 360 }
              : p
          ),
        };
      })
    );
  };

  const toggleDeletePage = (fileId: string, pageIndex: number) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        return {
          ...f,
          pages: f.pages.map((p) =>
            p.pageIndex === pageIndex ? { ...p, deleted: !p.deleted } : p
          ),
        };
      })
    );
  };

  const handleMerge = async () => {
    if (files.length === 0) {
      toast.error("Please upload PDF files to merge");
      return;
    }

    // Check if at least one page is not deleted
    const hasActivePages = files.some((f) => f.pages.some((p) => !p.deleted));
    if (!hasActivePages) {
      toast.error("At least one page must be included in the merged PDF");
      return;
    }

    setProcessing(true);
    setStatusMessage("Reading files... 0%");

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      
      let totalPagesProcessed = 0;
      const totalPagesToProcess = files.reduce(
        (sum, f) => sum + f.pages.filter((p) => !p.deleted).length,
        0
      );

      for (let i = 0; i < files.length; i++) {
        const mergeFile = files[i];
        const arrayBuffer = await mergeFile.file.arrayBuffer();
        const sourceDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

        for (let j = 0; j < mergeFile.pages.length; j++) {
          const pageConfig = mergeFile.pages[j];
          if (pageConfig.deleted) continue;

          const [copiedPage] = await merged.copyPages(sourceDoc, [pageConfig.pageIndex]);
          
          if (pageConfig.rotated > 0) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees((currentRotation + pageConfig.rotated) % 360));
          }

          merged.addPage(copiedPage);
          totalPagesProcessed++;
          setStatusMessage(
            `Merging pages... ${Math.round((totalPagesProcessed / totalPagesToProcess) * 100)}%`
          );
        }
      }

      setStatusMessage("Saving merged PDF... 95%");
      const mergedBytes = await merged.save();
      const blob = new Blob([mergedBytes as any], { type: "application/pdf" });
      
      setStatusMessage("Downloading... 100%");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Done! Your merged PDF is ready.");
    } catch (err) {
      console.error("Merge error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong during merging.");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  };

  const totalPagesCount = files.reduce((sum, f) => sum + f.pages.length, 0);
  const activePagesCount = files.reduce((sum, f) => sum + f.pages.filter(p => !p.deleted).length, 0);

  const Icon = theme.icon;

  return (
    <>
      <Toaster position="top-center" richColors />
      {files.length === 0 && (
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
      <div className="flex flex-col gap-6">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/#pdf"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to PDF Tools
          </Link>
          {files.length > 0 && (
            <button
              onClick={() => setFiles([])}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Upload Box (Only when no files are uploaded) */}
        {files.length === 0 && (
          <label className="upload-dropzone upload-dropzone-pdf w-full relative">
            <input
              type="file"
              accept=".pdf"
              multiple
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={handleFilesUpload}
            />
            <span className="upload-icon-container">
              <Upload />
            </span>
            <span className="text-center">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Click or drag PDF files here to upload
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Supports up to 50 PDF files. Maximum size 50MB per file.
              </p>
            </span>
          </label>
        )}

        {/* Workspace content */}
        {files.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Left Column: Files list (takes 3 cols), scrollable inside viewport */}
            <div className="lg:col-span-3 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {files.map((file, fileIdx) => (
                <div
                  key={file.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  {/* File Header */}
                  <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-900">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-zinc-500" />
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {file.name}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {(file.file.size / (1024 * 1024)).toFixed(2)} MB • {file.pages.length || "Loading"} pages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Reordering Controls */}
                      <button
                        onClick={() => moveFile(fileIdx, "up")}
                        disabled={fileIdx === 0}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                        title="Move Up"
                      >
                        <ArrowUp className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => moveFile(fileIdx, "down")}
                        disabled={fileIdx === files.length - 1}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                        title="Move Down"
                      >
                        <ArrowDown className="h-4.5 w-4.5" />
                      </button>

                      <button
                        onClick={() => removeFile(file.id)}
                        className="ml-2 rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        title="Delete File"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pages Grid */}
                  {loadingFiles[file.id] ? (
                    <div className="flex h-24 items-center justify-center gap-2 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
                      Loading page thumbnails...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                      {file.pages.map((page) => (
                        <div
                          key={page.pageIndex}
                          className={cn(
                            "relative flex flex-col items-center rounded-lg border border-zinc-200 bg-zinc-50 p-2 transition dark:border-zinc-800 dark:bg-zinc-900",
                            page.deleted && "opacity-40"
                          )}
                        >
                          {/* Page Thumbnail Image */}
                          <div className="relative mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded border bg-white dark:border-zinc-800">
                            <img
                              src={page.previewUrl}
                              alt={`Page ${page.pageIndex + 1}`}
                              className="max-h-full max-w-full object-contain transition-transform"
                              style={{ transform: `rotate(${page.rotated}deg)` }}
                            />
                            {page.deleted && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-bold text-white">
                                DELETED
                              </div>
                            )}
                          </div>

                          {/* Page label and action buttons */}
                          <div className="flex w-full items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-semibold">Page {page.pageIndex + 1}</span>
                            
                            <div className="flex items-center gap-1">
                              {!page.deleted ? (
                                <>
                                  <button
                                    onClick={() => rotatePage(file.id, page.pageIndex)}
                                    className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                    title="Rotate Page"
                                  >
                                    <RotateCw className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => toggleDeletePage(file.id, page.pageIndex)}
                                    className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    title="Remove Page"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => toggleDeletePage(file.id, page.pageIndex)}
                                  className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  Restore
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right Column: Sticky Sidebar for Controls & Stats */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Merge Settings
                </h3>

                {/* Add More Files Card */}
                {files.length < 50 && (
                  <div className="group relative flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4 text-center transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/50">
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                      onChange={handleFilesUpload}
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
                        <Plus className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Add More PDF Files
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        ({files.length} of 50)
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats Section */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>Uploaded PDFs:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {files.length} / 50
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Pages:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {totalPagesCount}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-900">
                    <span>Pages in Merged PDF:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {activePagesCount}
                    </span>
                  </div>
                </div>

                {/* Merge PDF Process Button */}
                <button
                  onClick={() => void handleMerge()}
                  disabled={processing || files.length === 0}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-md transition-all active:scale-[0.98]",
                    theme.button,
                    processing && "opacity-80 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {statusMessage || "Processing..."}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Merge PDF Document
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
