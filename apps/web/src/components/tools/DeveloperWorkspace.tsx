"use client";

import { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { Copy, Check } from "lucide-react";
import { ToolWorkspaceLayout } from "./ToolWorkspaceLayout";
import { PrimaryButton } from "./PrimaryButton";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

interface DeveloperWorkspaceProps {
  tool: ToolDefinition;
}

/** Fixed-height panels; content scrolls inside without growing the page. */
const PANEL_HEIGHT =
  "h-[min(28rem,calc(100dvh-14rem))] min-h-[240px] max-h-[28rem]";

const editorClass = cn(
  PANEL_HEIGHT,
  "w-full resize-none overflow-y-auto rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm leading-relaxed outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-900"
);

const outputClass = cn(
  PANEL_HEIGHT,
  "w-full overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
);

export function DeveloperWorkspace({ tool }: DeveloperWorkspaceProps) {
  const theme = CATEGORY_THEME.developer;
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setError(null);
    try {
      switch (tool.slug) {
        case "json-formatter": {
          const parsed = JSON.parse(input);
          setOutput(JSON.stringify(parsed, null, 2));
          break;
        }
        case "base64-encode":
          setOutput(btoa(unescape(encodeURIComponent(input))));
          break;
        case "base64-decode":
          setOutput(decodeURIComponent(escape(atob(input))));
          break;
        case "url-encode":
          setOutput(encodeURIComponent(input));
          break;
        case "url-decode":
          setOutput(decodeURIComponent(input));
          break;
        case "hash-generator": {
          const data = new TextEncoder().encode(input);
          const shaBuf = await crypto.subtle.digest("SHA-256", data);
          const sha = [...new Uint8Array(shaBuf)]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          setOutput(sha);
          break;
        }
        default:
          throw new Error("Unknown tool");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setOutput("");
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolWorkspaceLayout tool={tool} wide>
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <label className="flex min-h-0 flex-col">
            <span className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Input
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
              {output && (
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              )}
            </header>
            <pre
              className={cn(
                outputClass,
                !output && "text-zinc-400 dark:text-zinc-500"
              )}
            >
              {output || "Run the tool to see output here"}
            </pre>
          </section>
        </div>

        <PrimaryButton
          className={cn(theme.button, "mx-auto max-w-xs")}
          label={`Run ${tool.name}`}
          disabled={!input.trim()}
          onClick={() => void run()}
        />

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40">
            {error}
          </p>
        )}
      </section>
    </ToolWorkspaceLayout>
  );
}

function getPlaceholder(slug: string): string {
  const map: Record<string, string> = {
    "json-formatter": '{"hello": "world"}',
    "base64-encode": "Text to encode",
    "base64-decode": "VGV4dCB0byBkZWNvZGU=",
    "url-encode": "hello world",
    "url-decode": "hello%20world",
    "hash-generator": "Text to hash",
  };
  return map[slug] ?? "Enter input...";
}
