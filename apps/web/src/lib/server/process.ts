import { compressPdf } from "./handlers/compress";
import { convertOffice } from "./handlers/office";
import { ocrPdf } from "./handlers/ocr";
import { comparePdfs } from "./handlers/compare";
import { htmlToPdf } from "./handlers/html";
import { imageToWord } from "./handlers/image-word";
import { repairPdf } from "./handlers/repair";
import { pdfToPdfA } from "./handlers/pdfa";
import { protectPdf, unlockPdf } from "../pdf/security";
import { pdfToText, pdfToImage } from "./handlers/pdf-extract";
import { processVideo } from "./handlers/video";
import sharp from "sharp";

export interface ServerProcessResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

function getBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return fileName;
  return fileName.slice(0, dotIndex);
}

export async function processOnServer(
  toolSlug: string,
  buffers: Buffer[],
  options: Record<string, unknown> = {},
  fileNames: string[] = []
): Promise<ServerProcessResult> {
  const originalFileName = fileNames[0] || undefined;

  switch (toolSlug) {
    case "compress-pdf": {
      const out = await compressPdf(buffers[0], String(options.quality ?? "ebook"));
      const baseName = originalFileName ? getBaseName(originalFileName) : "compressed";
      return { buffer: out, mimeType: "application/pdf", fileName: `${baseName}_compressed.pdf` };
    }
    case "pdf-to-pdfa": {
      const out = await pdfToPdfA(buffers[0]);
      const baseName = originalFileName ? getBaseName(originalFileName) : "pdfa";
      return { buffer: out, mimeType: "application/pdf", fileName: `${baseName}.pdf` };
    }
    case "repair-pdf": {
      const out = await repairPdf(buffers[0]);
      const baseName = originalFileName ? getBaseName(originalFileName) : "repaired";
      return { buffer: out, mimeType: "application/pdf", fileName: `${baseName}_repaired.pdf` };
    }
    case "pdf-to-word":
      return convertOffice(buffers[0], "docx", "pdf-to-word", originalFileName);
    case "pdf-to-powerpoint":
      return convertOffice(buffers[0], "pptx", "pdf-to-powerpoint", originalFileName);
    case "pdf-to-excel":
      return convertOffice(buffers[0], "xlsx", "pdf-to-excel", originalFileName);
    case "word-to-pdf":
      return convertOffice(buffers[0], "pdf", "word-to-pdf", originalFileName);
    case "powerpoint-to-pdf":
      return convertOffice(buffers[0], "pdf", "powerpoint-to-pdf", originalFileName);
    case "excel-to-pdf":
      return convertOffice(buffers[0], "pdf", "excel-to-pdf", originalFileName);
    case "html-to-pdf": {
      const out = await htmlToPdf(buffers[0].toString("utf-8"));
      return { buffer: out, mimeType: "application/pdf", fileName: "page.pdf" };
    }
    case "image-to-word": {
      const out = await imageToWord(buffers[0]);
      const baseName = originalFileName ? getBaseName(originalFileName) : "document";
      return {
        buffer: out,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: `${baseName}.docx`,
      };
    }
    case "ocr-pdf": {
      const out = await ocrPdf(buffers[0], String(options.language ?? "eng"));
      const baseName = originalFileName ? getBaseName(originalFileName) : "searchable";
      return { buffer: out, mimeType: "application/pdf", fileName: `${baseName}_ocr.pdf` };
    }
    case "markdown-to-pdf":
    case "rtf-to-pdf":
    case "epub-to-pdf":
      return convertOffice(buffers[0], "pdf", toolSlug, originalFileName);
    case "markdown-to-word":
    case "tex-to-word":
    case "pages-to-word":
      return convertOffice(buffers[0], "docx", toolSlug, originalFileName);
    case "svg-to-png": {
      const out = await sharp(buffers[0]).png().toBuffer();
      const baseName = originalFileName ? getBaseName(originalFileName) : "converted";
      return { buffer: out, mimeType: "image/png", fileName: `${baseName}.png` };
    }
    case "heic-to-jpg":
    case "avif-to-jpg": {
      const out = await sharp(buffers[0]).jpeg({ quality: 90 }).toBuffer();
      const baseName = originalFileName ? getBaseName(originalFileName) : "converted";
      return { buffer: out, mimeType: "image/jpeg", fileName: `${baseName}.jpg` };
    }
    case "compare-pdf": {
      const { report } = await comparePdfs(buffers[0], buffers[1]);
      return { buffer: report, mimeType: "application/pdf", fileName: "comparison.pdf" };
    }
    case "protect-pdf": {
      const out = await protectPdf(buffers[0], String(options.password ?? ""));
      return { buffer: out, mimeType: "application/pdf", fileName: "protected.pdf" };
    }
    case "unlock-pdf": {
      const out = await unlockPdf(buffers[0], String(options.password ?? ""));
      return { buffer: out, mimeType: "application/pdf", fileName: "unlocked.pdf" };
    }
    case "pdf-to-text": {
      const out = await pdfToText(buffers[0]);
      const baseName = originalFileName ? getBaseName(originalFileName) : "extracted";
      return { buffer: out, mimeType: "text/plain", fileName: `${baseName}.txt` };
    }
    case "pdf-to-jpg": {
      const out = await pdfToImage(buffers[0], "jpeg");
      const baseName = originalFileName ? getBaseName(originalFileName) : "converted";
      return { buffer: out, mimeType: "image/jpeg", fileName: `${baseName}.jpg` };
    }
    case "pdf-to-png": {
      const out = await pdfToImage(buffers[0], "png");
      const baseName = originalFileName ? getBaseName(originalFileName) : "converted";
      return { buffer: out, mimeType: "image/png", fileName: `${baseName}.png` };
    }
    case "video-converter": {
      const fileName = fileNames[0] ?? undefined;
      return processVideo(buffers.length > 1 ? buffers : buffers[0], options as any, fileName);
    }
    default:
      throw new Error(`Server processing not available for: ${toolSlug}`);
  }
}
