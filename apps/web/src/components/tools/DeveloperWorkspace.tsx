"use client";

import { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { Copy, Check, Info, AlertTriangle } from "lucide-react";
import { ToolWorkspaceLayout } from "./ToolWorkspaceLayout";
import { PrimaryButton } from "./PrimaryButton";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";
import {
  formatJson,
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

const PANEL_HEIGHT =
  "h-[min(26rem,calc(100dvh-16rem))] min-h-[220px] max-h-[26rem]";

const editorClass = cn(
  PANEL_HEIGHT,
  "w-full resize-none overflow-y-auto rounded-xl border border-zinc-300 bg-white p-3.5 font-mono text-sm leading-relaxed outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-amber-400"
);

const outputClass = cn(
  PANEL_HEIGHT,
  "w-full overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-zinc-800 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-200"
);

export function DeveloperWorkspace({ tool }: DeveloperWorkspaceProps) {
  const theme = CATEGORY_THEME.developer;
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    line?: number;
    column?: number;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hashes, setHashes] = useState<HashResult | null>(null);

  // Options state
  const [jsonMode, setJsonMode] = useState<"format-2" | "format-4" | "format-tab" | "minify">("format-2");
  const [base64UrlSafe, setBase64UrlSafe] = useState(false);
  const [base64LineWrap, setBase64LineWrap] = useState(false);
  const [urlEncodeMode, setUrlEncodeMode] = useState<"component" | "uri" | "rfc3986">("component");
  const [urlSpaceAsPlus, setUrlSpaceAsPlus] = useState(false);
  const [urlPlusAsSpace, setUrlPlusAsSpace] = useState(false);
  const [hashUppercase, setHashUppercase] = useState(false);

  const run = async () => {
    setErrorDetails(null);
    setHashes(null);

    if (!input.trim()) {
      setOutput("");
      return;
    }

    switch (tool.slug) {
      case "json-formatter": {
        const res = formatJson(input, { mode: jsonMode });
        if (res.success) {
          setOutput(res.output);
        } else if (res.error) {
          setErrorDetails(res.error);
          setOutput("");
        }
        break;
      }
      case "base64-encode": {
        const res = encodeBase64(input, {
          urlSafe: base64UrlSafe,
          lineWrap: base64LineWrap,
        });
        setOutput(res);
        break;
      }
      case "base64-decode": {
        const res = decodeBase64(input);
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
        const h = await generateHashes(input, { uppercase: hashUppercase });
        setHashes(h);
        setOutput(h.sha256);
        break;
      }
      default:
        setErrorDetails({ message: "Unknown tool" });
    }
  };

  // Re-run automatically when tool options change
  useEffect(() => {
    if (input) {
      void run();
    }
  }, [
    jsonMode,
    base64UrlSafe,
    base64LineWrap,
    urlEncodeMode,
    urlSpaceAsPlus,
    urlPlusAsSpace,
    hashUppercase,
  ]);

  const copyToClipboard = async (text: string, key = "main") => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <ToolWorkspaceLayout tool={tool} wide>
      <section className="space-y-4">
        {/* Tool Options Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {tool.slug === "json-formatter" && (
              <label className="flex items-center gap-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Formatting:
                </span>
                <select
                  value={jsonMode}
                  onChange={(e) => setJsonMode(e.target.value as any)}
                  className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 font-medium text-zinc-800 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <option value="format-2">2 Spaces</option>
                  <option value="format-4">4 Spaces</option>
                  <option value="format-tab">Tabs</option>
                  <option value="minify">Minify (Single Line)</option>
                </select>
              </label>
            )}

            {tool.slug === "base64-encode" && (
              <>
                <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={base64UrlSafe}
                    onChange={(e) => setBase64UrlSafe(e.target.checked)}
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                  />
                  URL-Safe Base64 (- and _)
                </label>
                <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={base64LineWrap}
                    onChange={(e) => setBase64LineWrap(e.target.checked)}
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                  />
                  Wrap Lines (76 chars)
                </label>
              </>
            )}

            {tool.slug === "url-encode" && (
              <>
                <label className="flex items-center gap-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Mode:
                  </span>
                  <select
                    value={urlEncodeMode}
                    onChange={(e) => setUrlEncodeMode(e.target.value as any)}
                    className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 font-medium text-zinc-800 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="component">Component (encodeURIComponent)</option>
                    <option value="uri">Full URI (encodeURI)</option>
                    <option value="rfc3986">RFC 3986 (!'()*)</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={urlSpaceAsPlus}
                    onChange={(e) => setUrlSpaceAsPlus(e.target.checked)}
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                  />
                  Spaces as "+"
                </label>
              </>
            )}

            {tool.slug === "url-decode" && (
              <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={urlPlusAsSpace}
                  onChange={(e) => setUrlPlusAsSpace(e.target.checked)}
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                />
                Decode "+" as Space
              </label>
            )}

            {tool.slug === "hash-generator" && (
              <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hashUppercase}
                  onChange={(e) => setHashUppercase(e.target.checked)}
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                />
                Uppercase Hexadecimal
              </label>
            )}
          </div>

          {input.length > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Input: {input.length} chars ({new TextEncoder().encode(input).length} bytes)
            </span>
          )}
        </div>

        {/* Input / Output Panels */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <label className="flex min-h-0 flex-col">
            <span className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Input</span>
              {input && (
                <button
                  type="button"
                  onClick={() => setInput("")}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Clear
                </button>
              )}
            </span>
            <textarea
              className={editorClass}
              placeholder={getPlaceholder(tool.slug)}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
            />
          </label>

          <section className="flex min-h-0 flex-col">
            <header className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Output
              </span>
              {output && tool.slug !== "hash-generator" && (
                <button
                  type="button"
                  onClick={() => void copyToClipboard(output, "main")}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                >
                  {copiedKey === "main" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Output
                    </>
                  )}
                </button>
              )}
            </header>

            {tool.slug === "hash-generator" && hashes ? (
              <div className={cn(PANEL_HEIGHT, "w-full overflow-y-auto space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-700/80 dark:bg-zinc-950")}>
                <HashRow label="MD5" hash={hashes.md5} copiedKey={copiedKey} onCopy={(val) => copyToClipboard(val, "md5")} />
                <HashRow label="SHA-1" hash={hashes.sha1} copiedKey={copiedKey} onCopy={(val) => copyToClipboard(val, "sha1")} />
                <HashRow label="SHA-256" hash={hashes.sha256} copiedKey={copiedKey} onCopy={(val) => copyToClipboard(val, "sha256")} />
                <HashRow label="SHA-384" hash={hashes.sha384} copiedKey={copiedKey} onCopy={(val) => copyToClipboard(val, "sha384")} />
                <HashRow label="SHA-512" hash={hashes.sha512} copiedKey={copiedKey} onCopy={(val) => copyToClipboard(val, "sha512")} />
              </div>
            ) : (
              <pre
                className={cn(
                  outputClass,
                  !output && "text-zinc-400 dark:text-zinc-500"
                )}
              >
                {output || "Run the tool or type input to see output here"}
              </pre>
            )}
          </section>
        </div>

        <PrimaryButton
          className={cn(theme.button, "mx-auto max-w-xs")}
          label={`Run ${tool.name}`}
          disabled={!input.trim()}
          onClick={() => void run()}
        />

        {errorDetails && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{errorDetails.message}</p>
                {errorDetails.line && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Location: Line {errorDetails.line}
                    {errorDetails.column ? `, Column ${errorDetails.column}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </ToolWorkspaceLayout>
  );
}

function HashRow({
  label,
  hash,
  copiedKey,
  onCopy,
}: {
  label: string;
  hash: string;
  copiedKey: string | null;
  onCopy: (val: string) => void;
}) {
  const isCopied = copiedKey === label.toLowerCase();
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => onCopy(hash)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <p className="font-mono text-xs break-all text-zinc-800 dark:text-zinc-200 select-all">
        {hash}
      </p>
    </div>
  );
}

function getPlaceholder(slug: string): string {
  const map: Record<string, string> = {
    "json-formatter": '{"hello": "world", "status": true}',
    "base64-encode": "Enter text or multi-byte string to encode...",
    "base64-decode": "Paste Base64 or URL-Safe Base64 string to decode...",
    "url-encode": "Enter text or URL to encode...",
    "url-decode": "Enter percent-encoded URL (e.g., hello%20world or hello+world)...",
    "hash-generator": "Enter text to compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes...",
  };
  return map[slug] ?? "Enter input...";
}
