"use client";

import { useEffect, useMemo } from "react";

/** Stable object URLs for file previews; revoked on change/unmount. */
export function useFilePreviewUrls(files: File[]): string[] {
  const urls = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );

  useEffect(() => {
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [urls]);

  return urls;
}
