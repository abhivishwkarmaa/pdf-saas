import type { ToolDefinition } from "./types.js";

/** Tools that need server CLI (LibreOffice, ghostscript, qpdf, tesseract) */
export const SERVER_TOOL_SLUGS = new Set<string>([
  "compress-pdf",
  "pdf-to-pdfa",
  "repair-pdf",
  "pdf-to-word",
  "pdf-to-powerpoint",
  "pdf-to-excel",
  "word-to-pdf",
  "powerpoint-to-pdf",
  "excel-to-pdf",
  "html-to-pdf",
  "image-to-word",
  "ocr-pdf",
  "compare-pdf",
  "markdown-to-pdf",
  "markdown-to-word",
  "rtf-to-pdf",
  "tex-to-word",
  "pages-to-word",
  "epub-to-pdf",
  "protect-pdf",
  "unlock-pdf",
  "heic-to-jpg",
  "svg-to-png",
  "avif-to-jpg",
]);

export type ToolRuntime = "browser" | "server" | "utility";

export function resolveRuntime(tool: ToolDefinition): ToolRuntime {
  if (tool.kind === "utility") return "utility";
  if (SERVER_TOOL_SLUGS.has(tool.slug)) return "server";
  return "browser";
}
