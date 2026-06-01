"use client";

import React from "react";
import { Trash2, Clipboard } from "lucide-react";
import { toast } from "sonner";

interface TextInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
}

export function TextInput({
  value,
  onChange,
  placeholder = "Type or paste your text here...",
  label = "Input Text",
  rows = 12,
}: TextInputProps) {
  const handleClear = () => {
    onChange("");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
      toast.success("Text pasted from clipboard");
    } catch (err) {
      toast.error("Failed to read clipboard data");
    }
  };

  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePaste}
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
            title="Paste from clipboard"
          >
            <Clipboard className="h-3.5 w-3.5" />
            Paste
          </button>
          <button
            onClick={handleClear}
            type="button"
            disabled={!value}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition disabled:opacity-50 disabled:hover:text-zinc-400"
            title="Clear text"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full h-full min-h-[300px] resize-y rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition duration-200"
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          Words: <strong className="text-zinc-300">{wordCount}</strong>
        </span>
        <span>
          Characters: <strong className="text-zinc-300">{charCount}</strong>
        </span>
      </div>
    </div>
  );
}
