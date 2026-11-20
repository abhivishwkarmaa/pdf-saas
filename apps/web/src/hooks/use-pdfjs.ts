"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

/**
 * Robust hook to load local PDF.js and its worker from /vendor/pdfjs/.
 * Completely eliminates external CDN dependencies (cdnjs) for 100% offline reliability.
 */
export function usePdfJs(): boolean {
  const [loaded, setLoaded] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.pdfjsLib) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.pdfjsLib) {
      if (!window.pdfjsLib.GlobalWorkerOptions?.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
      }
      setLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[data-pdfjs="true"]') as HTMLScriptElement | null;
    if (existingScript) {
      const handleLoad = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
          setLoaded(true);
        }
      };
      if ((window as any).pdfjsLib) {
        handleLoad();
      } else {
        existingScript.addEventListener("load", handleLoad);
        return () => existingScript.removeEventListener("load", handleLoad);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "/vendor/pdfjs/pdf.min.js";
    script.dataset.pdfjs = "true";
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
        setLoaded(true);
      }
    };
    script.onerror = (e) => {
      console.error("Failed to load local PDF.js bundle from /vendor/pdfjs/", e);
    };
    document.body.appendChild(script);
  }, []);

  return loaded;
}
