"use client";

import React, { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { TextOutput } from "@/components/text-tools/TextOutput";

export default function UrlEncoderPage() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  
  const [uriOutput, setUriOutput] = useState("");
  const [componentOutput, setComponentOutput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!input) {
      setUriOutput("");
      setComponentOutput("");
      setErrorMsg("");
      return;
    }

    setErrorMsg("");
    if (mode === "encode") {
      try {
        setUriOutput(encodeURI(input));
        setComponentOutput(encodeURIComponent(input));
      } catch (err) {
        setErrorMsg("Failed to encode URL. Invalid character sequence.");
      }
    } else {
      try {
        // Run decodes independently in case one succeeds and the other fails
        let decUri = "";
        let decComp = "";
        try {
          decUri = decodeURI(input);
        } catch (e) {
          decUri = "decodeURI failed: Invalid URL sequence";
        }
        try {
          decComp = decodeURIComponent(input);
        } catch (e) {
          decComp = "decodeURIComponent failed: Invalid URL sequence";
        }

        setUriOutput(decUri);
        setComponentOutput(decComp);

        if (decUri.startsWith("decodeURI") && decComp.startsWith("decodeURIComponent")) {
          setErrorMsg("Both URL decoding methods encountered invalid escape sequences.");
        }
      } catch (err) {
        setErrorMsg("URL Decode failed");
      }
    }
  }, [input, mode]);

  return (
    <TextToolLayout
      title="URL Encoder / Decoder"
      description="Safely encode special characters for query strings and URL slugs, or decode web address components back to text."
      icon={Globe}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Input */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
          <TextInput
            value={input}
            onChange={setInput}
            label={mode === "encode" ? "Raw Input Text" : "Encoded URL Input"}
            placeholder={
              mode === "encode"
                ? "Enter URL parameters or string to encode (e.g. query=hello world & check=1)..."
                : "Enter encoded URL parameters (e.g. query%3Dhello%20world%20%26%20check%3D1)..."
            }
          />
        </div>

        {/* Right Column: Double Output */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
            <TextOutput
              value={uriOutput}
              label={mode === "encode" ? "encodeURI Result" : "decodeURI Result"}
              placeholder="Result will appear here..."
              rows={5}
            />
            <p className="text-[10px] text-zinc-500 mt-2">
              {mode === "encode"
                ? "Encodes special characters except: , / ? : @ & = + $ # (leaves valid URL structure intact)"
                : "Decodes a full URL string."}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
            <TextOutput
              value={componentOutput}
              label={mode === "encode" ? "encodeURIComponent Result" : "decodeURIComponent Result"}
              placeholder="Result will appear here..."
              rows={5}
            />
            <p className="text-[10px] text-zinc-500 mt-2">
              {mode === "encode"
                ? "Encodes all special characters including: , / ? : @ & = + $ # (suitable for query parameters)"
                : "Decodes query parameters."}
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-900/40 bg-rose-500/10 p-4 text-rose-400 font-semibold text-sm">
          ⚠️ URL Processing Notice — {errorMsg}
        </div>
      )}

      {/* Mode Controls */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 flex gap-2">
        <button
          onClick={() => {
            setMode("encode");
            setInput("");
          }}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition ${
            mode === "encode"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
          }`}
        >
          URL Encode Mode
        </button>
        <button
          onClick={() => {
            setMode("decode");
            setInput("");
          }}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition ${
            mode === "decode"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
          }`}
        >
          URL Decode Mode
        </button>
      </div>
    </TextToolLayout>
  );
}
