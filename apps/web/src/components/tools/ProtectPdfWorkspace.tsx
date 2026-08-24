"use client";

import React, { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Download,
  CheckCircle2,
  FileCheck,
  Sparkles,
  ArrowLeft,
  Printer,
  FileEdit,
  Files,
  Sliders,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface ProtectPdfWorkspaceProps {
  tool: ToolDefinition;
}

export function ProtectPdfWorkspace({ tool }: ProtectPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Lock,
  };

  const [file, setFile] = useState<File | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Document preview
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  // Security Credentials
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Security Policy Checkboxes
  const [restrictPrinting, setRestrictPrinting] = useState(false);
  const [restrictCopying, setRestrictCopying] = useState(false);
  const [restrictModifying, setRestrictModifying] = useState(true);

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

  // PDFJS script loader
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

  // Render first page preview when PDF is uploaded
  useEffect(() => {
    if (!file || !pdfjsLoaded) return;
    const currentFile = file;
    let active = true;

    async function loadPdf() {
      setLoading(true);
      setResultBlob(null);

      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages;

        if (active) {
          setTotalPages(total);
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (active) {
              setPagePreviewUrl(canvas.toDataURL());
            }
          }
        }
      } catch (err) {
        console.error("PDF load error:", err);
        if (active) toast.error("Could not load PDF document preview");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPdf();
    return () => {
      active = false;
    };
  }, [file, pdfjsLoaded]);

  const passwordsMatch = password.length > 0 && password === repeatPassword;

  // Generate random password helper
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let newPass = "";
    for (let i = 0; i < 8; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPass);
    setRepeatPassword(newPass);
    setShowPassword(true);
    toast.success("Generated random password!");
  };

  const copyPasswordToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPass(true);
      toast.success("Password copied to clipboard!");
      setTimeout(() => setCopiedPass(false), 2000);
    } catch {}
  };

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
    setPassword("");
    setRepeatPassword("");
    setPagePreviewUrl(null);
    setResultBlob(null);
    setResultFileName("");
  };

  // Process encryption request via API
  const handleProcessProtect = async () => {
    if (!file) {
      toast.error("Please upload a PDF file first.");
      return;
    }
    if (!password) {
      toast.error("Please enter an encryption password.");
      return;
    }
    if (password !== repeatPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setProcessing(true);
    setStatusMessage("Uploading document... 0%");

    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append(
        "options",
        JSON.stringify({
          password,
          repeatPassword,
          restrictPrinting,
          restrictCopying,
          restrictModifying,
        })
      );

      const xhr = new XMLHttpRequest();
      let progressInterval: NodeJS.Timeout | null = null;

      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatusMessage(`Uploading document... ${percent}%`);
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Applying AES-256 military-grade encryption... 15%");
          let percent = 15;
          progressInterval = setInterval(() => {
            if (percent < 95) {
              percent += Math.floor(Math.random() * 4) + 2;
              if (percent > 95) percent = 95;

              if (percent < 50) {
                setStatusMessage(`Applying AES-256 military-grade encryption... ${percent}%`);
              } else if (percent < 85) {
                setStatusMessage(`Securing document permissions & stream... ${percent}%`);
              } else {
                setStatusMessage(`Finalizing encrypted output... ${percent}%`);
              }
            }
          }, 250);
        });

        const cleanup = () => {
          if (progressInterval) clearInterval(progressInterval);
        };

        xhr.addEventListener("load", async () => {
          cleanup();
          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            const disposition = xhr.getResponseHeader("Content-Disposition");
            const match = disposition?.match(/filename="([^\"]+)"/);
            const outFileName = match?.[1] ?? `${file.name.replace(/\.[^/.]+$/, "")}_protected.pdf`;
            resolve({ blob, fileName: outFileName });
          } else {
            try {
              const blob = xhr.response as Blob;
              const responseText = blob ? await blob.text() : "";
              const err = JSON.parse(responseText);
              reject(new Error(err.error ?? "Encryption failed"));
            } catch (parseErr: any) {
              reject(new Error(parseErr?.message || "Encryption failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          cleanup();
          reject(new Error("Network connection error"));
        });

        xhr.open("POST", `/api/process/${tool.slug}`);
        xhr.responseType = "blob";
        xhr.send(formData);
      });

      const { blob: outBlob, fileName: outName } = await responsePromise;
      setResultBlob(outBlob);
      setResultFileName(outName);

      // Download automatically
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF encrypted & protected successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to encrypt PDF");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!resultBlob || !resultFileName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded protected PDF!");
  };

  const originalSizeMb = file ? (file.size / (1024 * 1024)).toFixed(2) : "0";
  const Icon = theme.icon;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <Toaster position="top-center" richColors />

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/#pdf"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to PDF Tools
        </Link>

        {file && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Protect Another File
          </button>
        )}
      </div>

      {/* Header */}
      {!file && (
        <div className="mb-8 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
            PDF Security & AES Encryption
          </span>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {tool.name}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
      )}

      {/* Upload Dropzone */}
      {!file && (
        <label className="upload-dropzone upload-dropzone-pdf w-full relative group cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={handleFileChange}
          />
          <span className="upload-icon-container group-hover:scale-105 transition-transform">
            <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag a PDF document here to protect
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Encrypt with 256-bit AES password protection and prevent unauthorized access.
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              Max file size: {tool.maxMb} MB
            </p>
          </span>
        </label>
      )}

      {/* Active Workspace */}
      {file && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Visual Document Preview & Security Shield Badge */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Header Document Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white max-w-xs truncate">
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {originalSizeMb} MB
                    </span>
                    <span>•</span>
                    <span>{totalPages} Pages</span>
                    <span>•</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Ready to Encrypt
                    </span>
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                AES-256
              </span>
            </div>

            {/* Conversion Result Banner (Shown after processing) */}
            {resultBlob && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      PDF Protected Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Encrypted
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Your document is now encrypted and requires your password to open.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadAgain}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Again
                </button>
              </div>
            )}

            {/* Live PDF Preview with Shield Overlay */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[440px] flex flex-col items-center justify-center relative overflow-hidden select-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Loading PDF preview...
                  </p>
                </div>
              ) : pagePreviewUrl ? (
                <div className="relative rounded-lg shadow-2xl border border-zinc-300 bg-white dark:border-zinc-800 overflow-hidden select-none w-72 sm:w-80 h-[380px] sm:h-[420px] flex items-center justify-center">
                  {/* Document Page Thumbnail */}
                  <img
                    src={pagePreviewUrl}
                    alt="Document Preview"
                    className="w-full h-full object-contain pointer-events-none opacity-85"
                  />

                  {/* Security Shield Lock Overlay */}
                  <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-600/90 border border-red-400 flex items-center justify-center shadow-xl mb-3">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-base font-bold text-white">Password Protection</h4>
                    <p className="text-xs text-zinc-200 mt-1 max-w-[200px]">
                      {password ? "AES-256 Key Configured" : "Enter password in the panel to encrypt"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">Loading document...</p>
              )}
            </div>
          </div>

          {/* Right Column: Password Inputs, Strength Meter & Policy Controls */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <KeyRound className="h-4 w-4 text-red-600 dark:text-red-400" />
                  Set Document Password
                </h3>
                <p className="text-xs text-zinc-500">
                  Users will be required to enter this password to view or unlock the PDF.
                </p>
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Encryption Password:
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate Random
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter any password (e.g. 1234)..."
                      className="w-full rounded-xl border border-zinc-300 bg-white pl-3.5 pr-20 py-2.5 text-xs font-medium text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white transition"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {password && (
                        <button
                          type="button"
                          onClick={copyPasswordToClipboard}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                          title="Copy Password"
                        >
                          {copiedPass ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                        title={showPassword ? "Hide" : "Show"}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Repeat Password */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Repeat Password:
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    placeholder="Re-enter password to confirm..."
                    className={cn(
                      "w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-medium focus:outline-none dark:bg-zinc-900 transition",
                      repeatPassword && !passwordsMatch
                        ? "border-red-500 focus:border-red-500 text-red-600"
                        : passwordsMatch
                        ? "border-emerald-500 focus:border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-zinc-300 focus:border-red-500 text-zinc-900 dark:border-zinc-700 dark:text-white"
                    )}
                  />

                  {repeatPassword && (
                    <p className={cn("mt-1 text-[11px] font-semibold flex items-center gap-1", passwordsMatch ? "text-emerald-600" : "text-red-500")}>
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Passwords match!
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3" /> Passwords do not match
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Security Policy Options */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-2.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  Additional Permissions Policy:
                </span>

                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={restrictModifying}
                      onChange={(e) => setRestrictModifying(e.target.checked)}
                      className="rounded border-zinc-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <FileEdit className="h-3.5 w-3.5 text-zinc-400" />
                      Prevent editing & page modifications
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={restrictCopying}
                      onChange={(e) => setRestrictCopying(e.target.checked)}
                      className="rounded border-zinc-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <Files className="h-3.5 w-3.5 text-zinc-400" />
                      Prevent text copying & graphic extraction
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={restrictPrinting}
                      onChange={(e) => setRestrictPrinting(e.target.checked)}
                      className="rounded border-zinc-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <Printer className="h-3.5 w-3.5 text-zinc-400" />
                      Prevent document printing
                    </span>
                  </label>
                </div>
              </div>

              {/* Status Message / Progress indicator */}
              {processing && statusMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900/40 dark:bg-red-950/20 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Encryption Security Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Military-Grade 256-Bit AES Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Industry standard AES-256 encryption compliant with Adobe PDF specs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Files automatically purged from server immediately after processing</span>
                  </div>
                </div>
              </div>

              {/* Protect PDF Button */}
              <button
                onClick={() => void handleProcessProtect()}
                disabled={processing || !password || password !== repeatPassword}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || !password || password !== repeatPassword) && "opacity-75 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Encrypting & Protecting PDF...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Protect PDF Document</span>
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
