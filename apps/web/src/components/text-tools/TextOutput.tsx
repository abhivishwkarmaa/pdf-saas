"use client";

import React, { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";

interface TextOutputProps {
  value: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  customRender?: React.ReactNode;
  downloadFileName?: string;
}

export function TextOutput({
  value,
  label = "Output Result",
  placeholder = "Result will appear here...",
  rows = 12,
  customRender,
  downloadFileName = "result.txt",
}: TextOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Result copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy text");
    }
  };

  const handleDownload = () => {
    if (!value) return;
    try {
      const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${downloadFileName}`);
    } catch (err) {
      toast.error("Failed to download file");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            type="button"
            disabled={!value}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition disabled:opacity-50"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            type="button"
            disabled={!value}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition disabled:opacity-50"
            title="Download as file"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        {customRender ? (
          <div className="w-full h-full min-h-[300px] overflow-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-100">
            {customRender}
          </div>
        ) : (
          <textarea
            value={value}
            readOnly
            placeholder={placeholder}
            rows={rows}
            className="w-full h-full min-h-[300px] resize-y rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          Output size: <strong className="text-zinc-300">{value.length}</strong> chars
        </span>
      </div>
    </div>
  );
}
