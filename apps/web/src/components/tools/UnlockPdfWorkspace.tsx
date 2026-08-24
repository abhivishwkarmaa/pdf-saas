"use client";

import React, { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Upload,
  X,
  FileText,
  Loader2,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  CheckCircle2,
  FileCheck,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Check,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface UnlockPdfWorkspaceProps {
  tool: ToolDefinition;
}

export function UnlockPdfWorkspace({ tool }: UnlockPdfWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category] || {
    button: "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20",
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    icon: Unlock,
  };

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasLegalRights, setHasLegalRights] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Result state
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");

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
    setResultBlob(null);
    setResultFileName("");
  };

  // Process unlocking via API
  const handleProcessUnlock = async () => {
    if (!file) {
      toast.error("Please upload a PDF file first.");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter the document password.");
      return;
    }
    if (!hasLegalRights) {
      toast.error("Please confirm authorization to unlock this document.");
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
          password: password.trim(),
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
          setStatusMessage("Decrypting security certificates & removing restrictions... 20%");
          let percent = 20;
          progressInterval = setInterval(() => {
            if (percent < 95) {
              percent += Math.floor(Math.random() * 4) + 2;
              if (percent > 95) percent = 95;

              if (percent < 50) {
                setStatusMessage(`Decrypting security certificates & removing restrictions... ${percent}%`);
              } else if (percent < 85) {
                setStatusMessage(`Unlocking document permissions & stream... ${percent}%`);
              } else {
                setStatusMessage(`Finalizing unlocked output... ${percent}%`);
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
            const outFileName = match?.[1] ?? `${file.name.replace(/\.[^/.]+$/, "")}_unlocked.pdf`;
            resolve({ blob, fileName: outFileName });
          } else {
            try {
              const blob = xhr.response as Blob;
              const responseText = blob ? await blob.text() : "";
              const err = JSON.parse(responseText);
              reject(new Error(err.error ?? "Incorrect password or decryption failed."));
            } catch (parseErr: any) {
              reject(new Error(parseErr?.message || "Incorrect password or decryption failed."));
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

      toast.success("PDF unlocked & restrictions removed successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to unlock PDF. Please verify your password.");
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
    toast.success("Downloaded unlocked PDF!");
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
            Unlock Another File
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
            PDF Decryption & Password Removal
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
            <Unlock className="h-8 w-8 text-red-600 dark:text-red-400" />
          </span>
          <span className="text-center">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Click or drag a password-protected PDF here to unlock
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Remove document passwords, printing blocks, and editing restrictions permanently.
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
          {/* Left Column: Visual Document Badge & Security Status */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Header Document Card */}
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
                    <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Password Protected
                    </span>
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                Encrypted
              </span>
            </div>

            {/* Conversion Result Banner (Shown after processing) */}
            {resultBlob && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      PDF Unlocked Successfully!
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        Decrypted
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Password has been removed. You can now open, edit, and print freely.
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

            {/* Visual Unlock Graphic Stage */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-6 sm:p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 min-h-[380px] flex flex-col items-center justify-center text-center relative overflow-hidden select-none">
              <div className="w-20 h-20 rounded-3xl bg-red-600/10 border border-red-500/20 flex items-center justify-center shadow-lg mb-4">
                <Unlock className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>

              <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                Unlock PDF Document
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                Enter your document's password in the form to permanently strip security encryptions and restrictions.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Removes Opening Password
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Enables Printing
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Enables Text Copying
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Password Form & Decrypt Button */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                  <KeyRound className="h-4 w-4 text-red-600 dark:text-red-400" />
                  Enter Document Password
                </h3>
                <p className="text-xs text-zinc-500">
                  Provide the password that currently protects this file.
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password..."
                      className="w-full rounded-xl border border-zinc-300 bg-white pl-3.5 pr-12 py-2.5 text-xs font-medium text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                      title={showPassword ? "Hide" : "Show"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Legal Rights Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                  <input
                    type="checkbox"
                    checked={hasLegalRights}
                    onChange={(e) => setHasLegalRights(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                  />
                  <span>
                    I confirm that I have the legal authorization or ownership right to unlock and remove protections from this PDF.
                  </span>
                </label>
              </div>

              {/* Status Message / Progress indicator */}
              {processing && statusMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900/40 dark:bg-red-950/20 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Decryption Guarantee */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Lossless Decryption Guarantee:
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Permanent decryption — output file will never ask for passwords again</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Server files are immediately purged right after processing</span>
                  </div>
                </div>
              </div>

              {/* Unlock Action Button */}
              <button
                onClick={() => void handleProcessUnlock()}
                disabled={processing || !password.trim() || !hasLegalRights}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98]",
                  theme.button,
                  (processing || !password.trim() || !hasLegalRights) && "opacity-75 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Decrypting & Removing Restrictions...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Unlock PDF Document</span>
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
