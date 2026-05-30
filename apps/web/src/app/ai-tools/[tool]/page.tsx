"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  Download,
  RefreshCw,
  ArrowLeft,
  X,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { PDFDocument } from "pdf-lib";
import { ParsedCommand, ruleBasedParse } from "@pdf-saas/shared";
import { AICommandInput } from "@/components/AICommandInput";
import { AIConfidenceCard } from "@/components/AIConfidenceCard";

const TOOL_CONFIG: Record<
  string,
  {
    name: string;
    description: string;
    suggestions: string[];
    needsAdditionalFiles: boolean;
  }
> = {
  "remove-pages": {
    name: "Remove Pages",
    description: "Remove specific page numbers or ranges from your PDF document.",
    suggestions: ["Remove page 3 and 5", "Delete page 1", "Remove pages 2 to 4"],
    needsAdditionalFiles: false,
  },
  "replace-page": {
    name: "Replace Page",
    description: "Replace a page in your PDF with a page from another PDF.",
    suggestions: ["Replace page 2 with this new page", "Swap page 1 with replacement page"],
    needsAdditionalFiles: true,
  },
  "extract-pages": {
    name: "Extract Pages",
    description: "Extract specific pages or page ranges into a brand new PDF file.",
    suggestions: ["Extract pages 4 to 8", "Extract page 2 and 3", "Extract pages 1-5"],
    needsAdditionalFiles: false,
  },
  "rotate-pages": {
    name: "Rotate Pages",
    description: "Rotate selected or all pages in your PDF by 90, 180, or 270 degrees.",
    suggestions: ["Rotate page 1 by 90 degrees", "Rotate page 2 by 180 degrees", "Rotate all pages by 90 degrees"],
    needsAdditionalFiles: false,
  },
  merge: {
    name: "Merge PDFs",
    description: "Combine multiple PDF documents together sequentially.",
    suggestions: ["Merge this PDF with another PDF", "Combine these documents", "Append the second PDF to the first"],
    needsAdditionalFiles: true,
  },
  split: {
    name: "Split PDF",
    description: "Split your PDF into two separate documents after a specified page.",
    suggestions: ["Split after page 5", "Split at page 2", "Split PDF after page 1"],
    needsAdditionalFiles: false,
  },
  compress: {
    name: "Compress PDF",
    description: "Reduce file size of your PDF while maintaining quality.",
    suggestions: ["Compress this PDF", "Reduce file size", "Make this PDF smaller"],
    needsAdditionalFiles: false,
  },
  watermark: {
    name: "Add Watermark",
    description: "Add a red transparent text watermark to all pages of your PDF.",
    suggestions: ["Add watermark CONFIDENTIAL", "Add watermark DRAFT on all pages", "Watermark with text FINAL"],
    needsAdditionalFiles: false,
  },
  "convert-to-word": {
    name: "Convert PDF to Word",
    description: "Convert your PDF document to an editable Word file (.docx).",
    suggestions: ["Convert PDF to Word", "Convert to docx", "PDF to Word document"],
    needsAdditionalFiles: false,
  },
  "reorder-pages": {
    name: "Reorder Pages",
    description: "Rearrange the pages of your PDF in any order you choose.",
    suggestions: ["Make page 3 the first page", "Reorder pages to [3, 1, 2]", "Move page 2 to the end"],
    needsAdditionalFiles: false,
  },
  "delete-blank-pages": {
    name: "Delete Blank Pages",
    description: "Identify and remove pages that are blank automatically.",
    suggestions: ["Delete all blank pages", "Remove blank pages", "Clean empty pages"],
    needsAdditionalFiles: false,
  },
  "add-page-numbers": {
    name: "Add Page Numbers",
    description: "Add centered page numbers in the footer of every page.",
    suggestions: ["Add page numbers to footer", "Add page numbers", "Numbered pages"],
    needsAdditionalFiles: false,
  },
  encrypt: {
    name: "Encrypt PDF",
    description: "Encrypt and protect your PDF with a password.",
    suggestions: ["Encrypt this PDF with password: hello123", "Lock PDF with password: secretpassword"],
    needsAdditionalFiles: false,
  },
  decrypt: {
    name: "Decrypt PDF",
    description: "Remove password security from password protected PDF documents.",
    suggestions: ["Remove password from this PDF", "Decrypt with password: hello123", "Unlock PDF"],
    needsAdditionalFiles: false,
  },
  "resize-pages": {
    name: "Resize Pages",
    description: "Resize all pages to A4 dimension and scale content to fit.",
    suggestions: ["Resize all pages to A4", "Make all pages A4 size", "Scale PDF to A4"],
    needsAdditionalFiles: false,
  },
  universal: {
    name: "Universal AI Tool",
    description: "Run any PDF instruction or multiple combined instructions.",
    suggestions: ["Remove page 3 and 5", "Compress this PDF", "Add watermark CONFIDENTIAL"],
    needsAdditionalFiles: true,
  },
};

export default function AIToolPage() {
  const router = useRouter();
  const { tool } = useParams() as { tool: string };
  const config = TOOL_CONFIG[tool] || TOOL_CONFIG.universal;

  // File states
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);

  // Command & AI Parsing states
  const [commandText, setCommandText] = useState<string>("");
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);

  // Job Execution states
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobError, setJobError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Load page count and check encryption using pdf-lib on upload
  const handleMainFileChange = async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setMainFile(file);
    setIsEncrypted(false);
    setTotalPages(0);
    setParsedCommand(null);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setTotalPages(pdfDoc.getPageCount());
    } catch (err) {
      setIsEncrypted(true);
      setTotalPages(1); // placeholder for encrypted
    }
  };

  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfs = files.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (pdfs.length < files.length) {
      toast.error("Only PDF files are accepted");
    }
    setAdditionalFiles((prev) => [...prev, ...pdfs]);
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Preview Action - parses command text
  const handlePreview = async () => {
    if (!commandText.trim()) {
      toast.error("Please enter a command");
      return;
    }

    const token = localStorage.getItem("token");

    setIsParsing(true);
    setParsedCommand(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiUrl}/api/ai-tools/parse`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          command: commandText,
          totalPages: totalPages,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to parse command");
      }

      const parsed = (await res.json()) as ParsedCommand;
      setParsedCommand(parsed);
      toast.success("AI parsed your command successfully!");
    } catch (err: any) {
      console.warn("API parsing failed, trying local rule-based parser:", err);
      const fallback = ruleBasedParse(commandText, totalPages);
      if (fallback) {
        setParsedCommand(fallback);
        toast.info("Using basic mode — AI parsing unavailable");
      } else {
        toast.error('Could not understand command. Try: "remove page 3" or "extract pages 1 to 5"');
      }
    } finally {
      setIsParsing(false);
    }
  };

  // Execute Action - schedules enqueued BullMQ job
  const handleExecute = async () => {
    if (!mainFile) return;

    const token = localStorage.getItem("token");

    setIsExecuting(true);
    setJobError(null);
    setDownloadUrl(null);
    setJobProgress(10);
    setJobStatus("Uploading & queueing job...");

    try {
      const formData = new FormData();
      formData.append("file", mainFile);
      additionalFiles.forEach((f) => formData.append("additionalFiles", f));
      formData.append("command", commandText);
      if (parsedCommand) {
        formData.append("parsedCommand", JSON.stringify(parsedCommand));
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiUrl}/api/ai-tools/execute`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to submit execution job");
      }

      const { jobId } = await res.json();
      setJobId(jobId);
      setJobStatus("Job enqueued in background...");
    } catch (err: any) {
      toast.error(err.message || "Execution submission failed");
      setJobError(err.message || "Execution submission failed");
      setIsExecuting(false);
    }
  };

  // Poll Job status
  useEffect(() => {
    if (!jobId || !isExecuting) return;

    let intervalId: any;

    const checkJob = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/api/ai-tools/jobs/${jobId}`, {
          headers,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || data.message || "Failed to check job progress");
        }
        const job = await res.json();

        setJobProgress(job.progress);
        setJobStatus(job.status === "processing" ? "Processing PDF contents..." : job.status);

        if (job.status === "completed") {
          setDownloadUrl(job.downloadUrl);
          setIsExecuting(false);
          setJobId(null);
          toast.success("PDF processing complete!");
          clearInterval(intervalId);
        } else if (job.status === "failed") {
          setJobError(job.error || "PDF processing failed");
          setIsExecuting(false);
          setJobId(null);
          toast.error(job.error || "PDF processing failed");
          clearInterval(intervalId);
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    };

    // Poll every 2 seconds
    intervalId = setInterval(checkJob, 2000);
    return () => clearInterval(intervalId);
  }, [jobId, isExecuting]);

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleReset = () => {
    setMainFile(null);
    setAdditionalFiles([]);
    setTotalPages(0);
    setIsEncrypted(false);
    setCommandText("");
    setParsedCommand(null);
    setIsExecuting(false);
    setJobId(null);
    setJobStatus("");
    setJobProgress(0);
    setJobError(null);
    setDownloadUrl(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-4 relative">
      <Toaster position="top-right" richColors />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.1),transparent_50%)]" />

      <div className="mx-auto max-w-2xl relative space-y-6">
        {/* Back Link */}
        <Link
          href="/ai-tools"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-450 hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to AI Tools
        </Link>

        {/* Title Block */}
        <div className="space-y-1.5 border-b border-zinc-950 pb-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-extrabold text-white">
              AI Tool Workspace — {config.name}
            </h1>
          </div>
          <p className="text-zinc-455 text-sm text-zinc-400">{config.description}</p>
        </div>

        {/* Wizard Main Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-6">
          {/* Step 1: Upload PDF */}
          {!mainFile ? (
            <div className="space-y-3">
              <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium block">
                Step 1: Upload PDF Document
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleMainFileChange(file);
                }}
                className="border-2 border-dashed border-zinc-700 hover:border-purple-500/40 rounded-2xl p-8 text-center bg-zinc-900/40 hover:bg-zinc-905 cursor-pointer transition-all duration-300 group"
                onClick={() => document.getElementById("main-upload")?.click()}
              >
                <input
                  id="main-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleMainFileChange(file);
                  }}
                />
                <UploadCloud className="mx-auto h-12 w-12 text-zinc-450 group-hover:text-purple-400 transition" />
                <p className="text-sm font-semibold mt-3 text-zinc-200">
                  Drag & drop your PDF here, or{" "}
                  <span className="text-purple-400 hover:underline">browse</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1.5">Max file size 500MB</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-bold text-zinc-300 flex items-center justify-between">
                <span className="text-zinc-400 text-xs uppercase tracking-wider font-medium">PDF Document Loaded</span>
                <button
                  onClick={handleReset}
                  disabled={isExecuting}
                  className="text-red-400 hover:text-red-300 text-sm cursor-pointer font-bold"
                >
                  Change File
                </button>
              </div>
              <div className="bg-zinc-850 border border-zinc-700 rounded-lg p-4 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium text-sm truncate">{mainFile.name}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {formatBytes(mainFile.size)} •{" "}
                    {isEncrypted ? "Password Protected" : `${totalPages} Pages`}
                  </p>
                </div>
              </div>

              {/* Step 2: Upload Additional PDF (if replacement or merge task) */}
              {config.needsAdditionalFiles && (
                <div className="space-y-3 pt-2">
                  <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium block">
                    Upload Secondary / Replacement PDF(s)
                  </label>
                  <div className="flex flex-col gap-2">
                    {additionalFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-zinc-800 border border-zinc-700 p-3 text-sm text-zinc-200"
                      >
                        <span className="truncate pr-4 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAdditionalFile(i)}
                          className="text-zinc-400 hover:text-red-400 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => document.getElementById("add-upload")?.click()}
                      className="w-full border border-dashed border-zinc-600 rounded-lg py-4 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add PDF File
                    </button>
                    <input
                      id="add-upload"
                      type="file"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={handleAdditionalFilesChange}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Type Command */}
              {!parsedCommand ? (
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium block">
                    Step 2: Enter AI Command
                  </label>
                  <AICommandInput
                    value={commandText}
                    onChange={setCommandText}
                    onPreview={handlePreview}
                    isLoading={isParsing}
                    suggestions={config.suggestions}
                  />
                </div>
              ) : (
                /* Step 4: Show Preview Card */
                <div className="space-y-4 pt-2 border-t border-zinc-800">
                  <label className="text-zinc-400 text-xs uppercase tracking-wider font-medium block">
                    Step 3: Preview AI Plan
                  </label>
                  <AIConfidenceCard
                    command={parsedCommand}
                    onRephrase={() => setParsedCommand(null)}
                  />

                  {/* Step 5: Execute Button */}
                  {!isExecuting && !downloadUrl && (
                    <button
                      type="button"
                      onClick={handleExecute}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-md transition-all hover:scale-[1.01]"
                    >
                      🚀 Execute AI Command
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Job Processing State */}
          {isExecuting && (
            <div className="space-y-4 pt-4 border-t border-zinc-800 text-center">
              <div className="flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
                <p className="text-sm font-bold text-zinc-200">{jobStatus}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${jobProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-zinc-450 text-zinc-400">{jobProgress}%</span>
              </div>
            </div>
          )}

          {/* Job Error State */}
          {jobError && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-400">
                  {jobError.toLowerCase().includes("auth") ||
                  jobError.toLowerCase().includes("session") ||
                  jobError.toLowerCase().includes("token") ||
                  jobError.includes("401") ||
                  jobError.toLowerCase().includes("login")
                    ? "Authentication Required"
                    : "Processing Failed"}
                </p>
                <p className="text-xs text-zinc-400 mt-1 text-left">
                  {jobError.toLowerCase().includes("auth") ||
                  jobError.toLowerCase().includes("session") ||
                  jobError.toLowerCase().includes("token") ||
                  jobError.includes("401") ||
                  jobError.toLowerCase().includes("login")
                    ? "Please log in or create a free account to execute AI commands and process your PDF."
                    : jobError}
                </p>
                {jobError.toLowerCase().includes("auth") ||
                jobError.toLowerCase().includes("session") ||
                jobError.toLowerCase().includes("token") ||
                jobError.includes("401") ||
                jobError.toLowerCase().includes("login") ? (
                  <div className="flex gap-3 mt-3">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center text-xs bg-purple-600 hover:bg-purple-550 text-white font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      Sign Up Free
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => setJobError(null)}
                    className="text-sm text-purple-400 hover:underline mt-2 block font-semibold text-left"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Job Completed State */}
          {downloadUrl && (
            <div className="space-y-4 pt-4 border-t border-zinc-800 text-center">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-450">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p className="text-base font-bold text-white">Execution Succeeded!</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <a
                  href={downloadUrl}
                  download
                  className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-550 font-bold text-sm text-white transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download Result
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-3 px-4 rounded-xl border border-zinc-650 bg-zinc-800 hover:bg-zinc-700 font-bold text-sm text-zinc-200 hover:text-white transition"
                >
                  Try Another File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
