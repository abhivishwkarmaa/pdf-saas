"use client";

import { useEffect, useState } from "react";

const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/rtf",
  "application/x-tex",
]);

const TEXT_EXTENSIONS = new Set(["md", "markdown", "mdown", "mkd", "txt", "rtf", "tex", "log"]);

function isTextFile(file: File): boolean {
  if (TEXT_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTENSIONS.has(ext);
}

function updateTextPreview(file: File | undefined, setSnippet: (s: string | null) => void, cancelled: { current: boolean }) {
  if (!file || !isTextFile(file)) {
    if (!cancelled.current) setSnippet(null);
    return;
  }

  void file
    .slice(0, 64_000)
    .text()
    .then((text) => {
      if (cancelled.current) return;
      const trimmed = text.trim();
      if (!trimmed) {
        setSnippet(null);
        return;
      }
      setSnippet(trimmed.length > 2000 ? `${trimmed.slice(0, 2000)}…` : trimmed);
    })
    .catch(() => {
      if (!cancelled.current) setSnippet(null);
    });
}

export function useTextFilePreview(files: File[]): string | null {
  const [snippet, setSnippet] = useState<string | null>(null);

  useEffect(() => {
    const cancelled = { current: false };
    const id = window.setTimeout(() => {
      updateTextPreview(files[0], setSnippet, cancelled);
    }, 0);

    return () => {
      cancelled.current = true;
      window.clearTimeout(id);
    };
  }, [files]);

  return snippet;
}
