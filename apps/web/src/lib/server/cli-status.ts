import { exists } from "./exec";

const CLI_TOOLS = [
  { id: "soffice", label: "LibreOffice", tools: ["office", "html-to-pdf"] },
  { id: "gs", label: "Ghostscript", tools: ["compress-pdf", "pdf-to-pdfa"] },
  { id: "qpdf", label: "qpdf", tools: ["repair-pdf"] },
  { id: "pdftoppm", label: "Poppler", tools: ["ocr-pdf"] },
  { id: "tesseract", label: "Tesseract", tools: ["ocr-pdf", "image-to-word"] },
] as const;

export async function getCliStatus() {
  const checks = await Promise.all(
    CLI_TOOLS.map(async (t) => ({
      ...t,
      available: await exists(t.id),
    }))
  );
  const allReady = checks.every((c) => c.available);
  return { allReady, checks };
}
