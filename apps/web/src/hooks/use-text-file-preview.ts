"use client";

import { useEffect, useState } from "react";

const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/rtf",
  "application/x-tex",
]);

export function useTextFilePreview(files: File[]): string | null {
  const [snippet, setSnippet] = useState<string | null>(null);

  useEffect(() => {
    const file = files[0];
    if (!file || !TEXT_TYPES.has(file.type)) {
      setSnippet(null);
      return;
    }

    let cancelled = false;
    void file
      .slice(0, 64_000)
      .text()
      .then((text) => {
        if (cancelled) return;
        const trimmed = text.trim();
        if (!trimmed) {
          setSnippet(null);
          return;
        }
        setSnippet(trimmed.length > 2000 ? `${trimmed.slice(0, 2000)}…` : trimmed);
      })
      .catch(() => {
        if (!cancelled) setSnippet(null);
      });

    return () => {
      cancelled = true;
    };
  }, [files]);

  return snippet;
}
