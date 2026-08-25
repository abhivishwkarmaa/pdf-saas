"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Copy,
  Check,
  Upload,
  Download,
  Trash2,
  ArrowRightLeft,
  Binary,
  Globe,
  Hash,
  FileCode2,
  FileText,
  Sparkles,
  Clipboard,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  encodeBase64,
  decodeBase64,
  encodeUrl,
  decodeUrl,
  generateHashes,
  type HashResult,
} from "@/lib/client/dev-tools";

interface DeveloperWorkspaceProps {
  tool: ToolDefinition;
}

// Sample presets for instant testing
const SAMPLE_PRESETS: Record<string, { label: string; text: string }[]> = {
  "base64-encode": [
    { label: "Hello World", text: "Hello, World! 🚀 Secure PDF SaaS Studio." },
    { label: "JSON Payload", text: '{"user":"admin","role":"superuser","active":true}' },
    { label: "Multi-line Text", text: "Line 1: Authentication Token\nLine 2: Client Secret\nLine 3: Public Key" },
  ],
  "base64-decode": [
    { label: "Standard B64", text: "SGVsbG8sIFdvcmxkISDwn5 rocketIFNlY3VyZSBQREYgU2FhUyBTdHVkaW8u" },
    { label: "JSON Base64", text: "eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoic3VwZXJ1c2VyIiwiYWN0aXZlIjp0cnVlfQ==" },
    { label: "URL-Safe B64", text: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" },
  ],
  "url-encode": [
    { label: "Query String", text: "https://example.com/search?q=PDF SaaS & Convert Tools=100% Free&tag=dev#top" },
    { label: "Special Chars", text: "email=user+test@example.com&redirect_uri=https://app.io/oauth?v=1&scope=read write" },
    { label: "Unicode & Emojis", text: "search=नमस्ते दुनिया & filter=🔥⚡💎" },
  ],
  "url-decode": [
    { label: "Percent-Encoded", text: "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3DPDF%20SaaS%20%26%20Convert%20Tools%3D100%25%20Free" },
    { label: "Plus as Spaces", text: "first_name=John+Doe&company=Acme+Corp+Inc" },
    { label: "OAuth Callback", text: "code=4%2F0AY0e-g7b&scope=email%20profile%20openid" },
  ],
  "hash-generator": [
    { label: "Secret Key", text: "my-super-secret-api-key-2026" },
    { label: "Password Text", text: "Admin@Password#Secure123!" },
    { label: "Long Document", text: "The quick brown fox jumps over the lazy dog. 1234567890." },
  ],
};

export function DeveloperWorkspace({ tool }: DeveloperWorkspaceProps) {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [hashes, setHashes] = useState<HashResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ message: string } | null>(null);

  // Tool-specific options
  const [base64UrlSafe, setBase64UrlSafe] = useState(false);
  const [base64LineWrap, setBase64LineWrap] = useState(false);
  const [base64DataUri, setBase64DataUri] = useState(false);
  const [dataUriMime, setDataUriMime] = useState("text/plain");

  const [urlEncodeMode, setUrlEncodeMode] = useState<"component" | "uri" | "rfc3986">("component");
  const [urlSpaceAsPlus, setUrlSpaceAsPlus] = useState(false);
  const [urlPlusAsSpace, setUrlPlusAsSpace] = useState(false);

  const [hashUppercase, setHashUppercase] = useState(false);

  // Copy statuses
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedHashKey, setCopiedHashKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial preset
  useEffect(() => {
    const presets = SAMPLE_PRESETS[tool.slug];
    if (presets && presets.length > 0) {
      setInput(presets[0].text);
    } else {
      setInput("Hello, World! 🚀");
    }
  }, [tool.slug]);

  // Real-time calculation on input or options change
  useEffect(() => {
    setErrorDetails(null);
    setHashes(null);

    if (!input) {
      setOutput("");
      return;
    }

    try {
      switch (tool.slug) {
        case "base64-encode": {
          let res = encodeBase64(input, {
            urlSafe: base64UrlSafe,
            lineWrap: base64LineWrap,
          });
          if (base64DataUri) {
            res = `data:${dataUriMime};base64,${res}`;
          }
          setOutput(res);
          break;
        }
        case "base64-decode": {
          let cleanInput = input.trim();
          // Strip data URI prefix if present
          if (cleanInput.startsWith("data:") && cleanInput.includes(";base64,")) {
            cleanInput = cleanInput.split(";base64,")[1] || "";
          }
          const res = decodeBase64(cleanInput);
          if (res.success) {
            setOutput(res.output);
          } else if (res.error) {
            setErrorDetails({ message: res.error });
            setOutput("");
          }
          break;
        }
        case "url-encode": {
          const res = encodeUrl(input, {
            mode: urlEncodeMode,
            spaceAsPlus: urlSpaceAsPlus,
          });
          setOutput(res);
          break;
        }
        case "url-decode": {
          const res = decodeUrl(input, { plusAsSpace: urlPlusAsSpace });
          if (res.success) {
            setOutput(res.output);
            if (res.error) {
              setErrorDetails({ message: res.error });
            }
          } else if (res.error) {
            setErrorDetails({ message: res.error });
            setOutput("");
          }
          break;
        }
        case "hash-generator": {
          void generateHashes(input, { uppercase: hashUppercase }).then((h) => {
            setHashes(h);
            setOutput(h.sha256);
          });
          break;
        }
        default:
          setOutput(input);
      }
    } catch (err: any) {
      setErrorDetails({ message: err?.message || "Processing error" });
      setOutput("");
    }
  }, [
    input,
    tool.slug,
    base64UrlSafe,
    base64LineWrap,
    base64DataUri,
    dataUriMime,
    urlEncodeMode,
    urlSpaceAsPlus,
    urlPlusAsSpace,
    hashUppercase,
  ]);

  // Copy helper
  const handleCopyMain = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopiedMain(true);
    toast.success("Output copied to clipboard!");
    setTimeout(() => setCopiedMain(false), 2000);
  };

  const handleCopyHash = async (val: string, key: string) => {
    await navigator.clipboard.writeText(val);
    setCopiedHashKey(key);
    toast.success(`Copied ${key.toUpperCase()} hash!`);
    setTimeout(() => setCopiedHashKey(null), 2000);
  };

  // Swap input and output for bidirectional tools
  const handleSwap = () => {
    if (output) {
      setInput(output);
      toast.success("Swapped input and output!");
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInput(text);
        toast.success("Pasted from clipboard!");
      }
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  // Upload file text / binary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit");
      return;
    }

    try {
      if (tool.slug === "base64-encode" && !file.type.startsWith("text/")) {
        // Encode binary file
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const b64 = res.split(",")[1] || "";
          setInput(`[File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`);
          setOutput(base64DataUri ? res : b64);
          toast.success(`Encoded binary file "${file.name}"`);
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setInput(text);
        toast.success(`Loaded "${file.name}"`);
      }
    } catch (err) {
      toast.error("Failed to read file");
    }
  };

  // Download output
  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tool.slug}-output.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded output file!");
  };

  // Related developer tools navigation list
  const devToolsList = [
    { slug: "base64-encode", name: "Base64 Encode", icon: Binary },
    { slug: "base64-decode", name: "Base64 Decode", icon: Binary },
    { slug: "url-encode", name: "URL Encode", icon: Globe },
    { slug: "url-decode", name: "URL Decode", icon: Globe },
    { slug: "hash-generator", name: "Hash Generator", icon: Hash },
    { slug: "json-formatter", name: "JSON Formatter", icon: FileCode2 },
  ];

  const presets = SAMPLE_PRESETS[tool.slug] || [];

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8 space-y-6">
      <Toaster position="top-center" richColors />

      {/* TOP HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/#developer"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Developer Tools
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
                {tool.name}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                {tool.description}
              </p>
            </div>
          </div>
        </div>

        {/* Client-Side Real-time Badge */}
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>100% In-Browser & Private</span>
        </div>
      </div>

      {/* QUICK DEVELOPER TOOLS SWITCHER BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200 dark:border-zinc-800">
        {devToolsList.map((t) => {
          const Icon = t.icon;
          const isActive = tool.slug === t.slug;
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition",
                isActive
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.name}</span>
            </Link>
          );
        })}
      </div>

      {/* TOOL OPTIONS & PRESETS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        {/* Dynamic Tool Options */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Base64 Encode Options */}
          {tool.slug === "base64-encode" && (
            <>
              <label className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={base64UrlSafe}
                  onChange={(e) => setBase64UrlSafe(e.target.checked)}
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>URL-Safe Base64 ( - and _ )</span>
              </label>

              <label className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={base64LineWrap}
                  onChange={(e) => setBase64LineWrap(e.target.checked)}
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>Wrap Lines (76 chars)</span>
              </label>

              <label className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={base64DataUri}
                  onChange={(e) => setBase64DataUri(e.target.checked)}
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>Data URI Scheme Prefix</span>
              </label>
            </>
          )}

          {/* URL Encode Options */}
          {tool.slug === "url-encode" && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-600 dark:text-zinc-400">Mode:</span>
                <select
                  value={urlEncodeMode}
                  onChange={(e) => setUrlEncodeMode(e.target.value as any)}
                  className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 font-semibold text-zinc-800 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <option value="component">Component (encodeURIComponent)</option>
                  <option value="uri">Full URI (encodeURI)</option>
                  <option value="rfc3986">RFC 3986 Strict (!&apos;()*)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={urlSpaceAsPlus}
                  onChange={(e) => setUrlSpaceAsPlus(e.target.checked)}
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>Encode spaces as &quot;+&quot;</span>
              </label>
            </>
          )}

          {/* URL Decode Options */}
          {tool.slug === "url-decode" && (
            <label className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={urlPlusAsSpace}
                onChange={(e) => setUrlPlusAsSpace(e.target.checked)}
                className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
              />
              <span>Decode &quot;+&quot; as space</span>
            </label>
          )}

          {/* Hash Generator Options */}
          {tool.slug === "hash-generator" && (
            <label className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hashUppercase}
                onChange={(e) => setHashUppercase(e.target.checked)}
                className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
              />
              <span>Uppercase Hexadecimal Output</span>
            </label>
          )}
        </div>

        {/* Quick Sample Presets */}
        {presets.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400">Samples:</span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInput(p.text);
                  toast.success(`Loaded "${p.label}"`);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-zinc-700 dark:text-zinc-300 hover:text-amber-600 font-semibold text-[11px] transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN DUAL-PANE STUDIO (INPUT & OUTPUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* LEFT PANE: INPUT */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden min-h-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-zinc-800 dark:text-zinc-200">Input Data</span>
              <span className="text-[11px] text-zinc-400 font-mono">
                ({input.length} chars • {new TextEncoder().encode(input).length} bytes)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePaste}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition"
                title="Paste from clipboard"
              >
                <Clipboard className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition"
                title="Upload file text/data"
              >
                <Upload className="h-3.5 w-3.5" />
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </button>

              {input && (
                <button
                  type="button"
                  onClick={() => setInput("")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                  title="Clear input"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type, paste, or upload text here to process in real-time..."
            className="flex-1 w-full p-4 bg-transparent font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none placeholder:text-zinc-400 min-h-[300px]"
            spellCheck={false}
          />
        </div>

        {/* RIGHT PANE: OUTPUT */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden min-h-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                {tool.slug === "hash-generator" ? "Cryptographic Hashes" : "Converted Output"}
              </span>
              {output && tool.slug !== "hash-generator" && (
                <span className="text-[11px] text-zinc-400 font-mono">
                  ({output.length} chars • {new TextEncoder().encode(output).length} bytes)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Swap Button for encoders/decoders */}
              {(tool.slug.includes("encode") || tool.slug.includes("decode")) && (
                <button
                  type="button"
                  onClick={handleSwap}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                  title="Swap output into input"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>Swap</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownload}
                disabled={!output}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition disabled:opacity-40"
                title="Download output text"
              >
                <Download className="h-3.5 w-3.5" />
              </button>

              {tool.slug !== "hash-generator" && (
                <button
                  type="button"
                  onClick={handleCopyMain}
                  disabled={!output}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition shadow-xs disabled:opacity-40"
                >
                  {copiedMain ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>Copy</span>
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-auto">
            {tool.slug === "hash-generator" && hashes ? (
              <div className="space-y-3 font-mono text-xs">
                <HashItem
                  label="MD5"
                  hash={hashes.md5}
                  copied={copiedHashKey === "md5"}
                  onCopy={() => handleCopyHash(hashes.md5, "md5")}
                />
                <HashItem
                  label="SHA-1"
                  hash={hashes.sha1}
                  copied={copiedHashKey === "sha1"}
                  onCopy={() => handleCopyHash(hashes.sha1, "sha1")}
                />
                <HashItem
                  label="SHA-256"
                  hash={hashes.sha256}
                  copied={copiedHashKey === "sha256"}
                  onCopy={() => handleCopyHash(hashes.sha256, "sha256")}
                />
                <HashItem
                  label="SHA-384"
                  hash={hashes.sha384}
                  copied={copiedHashKey === "sha384"}
                  onCopy={() => handleCopyHash(hashes.sha384, "sha384")}
                />
                <HashItem
                  label="SHA-512"
                  hash={hashes.sha512}
                  copied={copiedHashKey === "sha512"}
                  onCopy={() => handleCopyHash(hashes.sha512, "sha512")}
                />
              </div>
            ) : (
              <div
                className={cn(
                  "font-mono text-xs leading-relaxed whitespace-pre-wrap break-all min-h-[300px]",
                  output
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 italic flex items-center justify-center text-center"
                )}
              >
                {output || "Output will be generated in real-time as you type or paste input."}
              </div>
            )}
          </div>

          {/* Diagnostics Error Alert */}
          {errorDetails && (
            <div className="border-t border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="font-bold text-red-700 dark:text-red-300">Conversion Warning / Error</span>
                <p className="font-mono text-[11px]">{errorDetails.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HashItem({
  label,
  hash,
  copied,
  onCopy,
}: {
  label: string;
  hash: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400">
        <span className="text-amber-600 dark:text-amber-400">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <p className="font-mono text-xs break-all text-zinc-900 dark:text-zinc-100 select-all">
        {hash}
      </p>
    </div>
  );
}
