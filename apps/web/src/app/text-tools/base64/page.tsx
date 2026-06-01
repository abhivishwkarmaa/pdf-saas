"use client";

import React, { useState, useEffect } from "react";
import { Lock, Upload, File } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";
import { toast } from "sonner";

type Base64Mode = "encode" | "decode" | "file";

export default function Base64Page() {
  const [mode, setMode] = useState<Base64Mode>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [includePrefix, setIncludePrefix] = useState(true);

  // Unicode safe Base64 encoding
  const encodeBase64 = (str: string) => {
    try {
      const bytes = new TextEncoder().encode(str);
      const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
      return btoa(binString);
    } catch (err) {
      return "Encoding error";
    }
  };

  // Unicode safe Base64 decoding
  const decodeBase64 = (str: string) => {
    try {
      const binString = atob(str.trim());
      const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch (err) {
      throw new Error("Input string is not valid Base64 encoded data.");
    }
  };

  // Live conversion for text modes
  useEffect(() => {
    if (mode === "file") return;

    if (!input) {
      setOutput("");
      setErrorMsg("");
      return;
    }

    setErrorMsg("");
    if (mode === "encode") {
      setOutput(encodeBase64(input));
    } else {
      try {
        setOutput(decodeBase64(input));
      } catch (err) {
        if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Invalid Base64 sequence");
        }
        setOutput("");
      }
    }
  }, [input, mode]);

  // Handle file reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    // Limit file size to 10MB in browser
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Please select a file smaller than 10MB.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        toast.error("Failed to read file contents");
        return;
      }

      if (includePrefix) {
        setOutput(dataUrl);
      } else {
        const rawBase64 = dataUrl.split(",")[1];
        setOutput(rawBase64);
      }
      toast.success(`Processed file "${file.name}"`);
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    reader.readAsDataURL(file);
  };

  // Recalculate file Base64 if includePrefix toggle is switched
  useEffect(() => {
    if (mode === "file" && selectedFile) {
      processFile(selectedFile);
    }
  }, [includePrefix]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <TextToolLayout
      title="Base64 Encode / Decode"
      description="Encode plain text or binary files into Base64 format, or decode Base64 strings back to text."
      icon={Lock}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Input */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          {mode === "file" ? (
            <div className="flex flex-col h-full">
              <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                File Input
              </span>
              
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex-1 min-h-[300px] border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/30 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition relative group"
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                      <File className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200 truncate max-w-[200px] mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <p className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block">
                      File Loaded Successfully
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center mx-auto text-zinc-500 group-hover:text-white transition">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-300">
                        Drag and drop your file here
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        or click to browse from files (Max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <TextInput
              value={input}
              onChange={setInput}
              label={mode === "encode" ? "Plain Text Input" : "Base64 Input"}
              placeholder={
                mode === "encode"
                  ? "Enter text to encode into Base64 format..."
                  : "Enter Base64 string to decode back to readable text..."
              }
            />
          )}
        </div>

        {/* Right Column: Output */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label={mode === "decode" ? "Decoded Text" : "Base64 Output"}
            placeholder="Result will appear here automatically..."
            downloadFileName={mode === "decode" ? "decoded.txt" : "encoded.b64"}
          />
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && mode === "decode" && (
        <div className="rounded-xl border border-rose-900/40 bg-rose-500/10 p-4 text-rose-400 font-semibold text-sm">
          ⚠️ Decode Error — {errorMsg}
        </div>
      )}

      {/* Mode selectors */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["encode", "decode", "file"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setOutput("");
                setErrorMsg("");
              }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border capitalize transition ${
                mode === m
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
              }`}
            >
              {m === "file" ? "File to Base64" : `${m} text`}
            </button>
          ))}
        </div>

        {/* Optional file settings */}
        {mode === "file" && selectedFile && (
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
            <input
              type="checkbox"
              checked={includePrefix}
              onChange={(e) => setIncludePrefix(e.target.checked)}
              className="h-4 w-4 bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
            />
            Include Data URL prefix (e.g. &quot;data:image/png;base64,...&quot;)
          </label>
        )}
      </div>
    </TextToolLayout>
  );
}
