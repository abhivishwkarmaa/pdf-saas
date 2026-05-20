import { compressPdf } from "./handlers/compress";
import { convertOffice } from "./handlers/office";
import { ocrPdf } from "./handlers/ocr";
import { comparePdfs } from "./handlers/compare";
import { htmlToPdf } from "./handlers/html";
import { imageToWord } from "./handlers/image-word";
import { repairPdf } from "./handlers/repair";
import { pdfToPdfA } from "./handlers/pdfa";
import { protectPdf, unlockPdf } from "../pdf/security";
import sharp from "sharp";

export interface ServerProcessResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export async function processOnServer(
  toolSlug: string,
  buffers: Buffer[],
  options: Record<string, unknown> = {}
): Promise<ServerProcessResult> {
  switch (toolSlug) {
    case "compress-pdf": {
      const out = await compressPdf(buffers[0], String(options.quality ?? "ebook"));
      return { buffer: out, mimeType: "application/pdf", fileName: "compressed.pdf" };
    }
    case "pdf-to-pdfa": {
      const out = await pdfToPdfA(buffers[0]);
      return { buffer: out, mimeType: "application/pdf", fileName: "pdfa.pdf" };
    }
    case "repair-pdf": {
      const out = await repairPdf(buffers[0]);
      return { buffer: out, mimeType: "application/pdf", fileName: "repaired.pdf" };
    }
    case "pdf-to-word":
      return convertOffice(buffers[0], "docx", "pdf-to-word");
    case "pdf-to-powerpoint":
      return convertOffice(buffers[0], "pptx", "pdf-to-powerpoint");
    case "pdf-to-excel":
      return convertOffice(buffers[0], "xlsx", "pdf-to-excel");
    case "word-to-pdf":
      return convertOffice(buffers[0], "pdf", "word-to-pdf");
    case "powerpoint-to-pdf":
      return convertOffice(buffers[0], "pdf", "powerpoint-to-pdf");
    case "excel-to-pdf":
      return convertOffice(buffers[0], "pdf", "excel-to-pdf");
    case "html-to-pdf": {
      const out = await htmlToPdf(buffers[0].toString("utf-8"));
      return { buffer: out, mimeType: "application/pdf", fileName: "page.pdf" };
    }
    case "image-to-word": {
      const out = await imageToWord(buffers[0]);
      return {
        buffer: out,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: "document.docx",
      };
    }
    case "ocr-pdf": {
      const out = await ocrPdf(buffers[0], String(options.language ?? "eng"));
      return { buffer: out, mimeType: "application/pdf", fileName: "searchable.pdf" };
    }
    case "markdown-to-pdf":
    case "rtf-to-pdf":
    case "epub-to-pdf":
      return convertOffice(buffers[0], "pdf", toolSlug);
    case "markdown-to-word":
    case "tex-to-word":
    case "pages-to-word":
      return convertOffice(buffers[0], "docx", toolSlug);
    case "svg-to-png": {
      const out = await sharp(buffers[0]).png().toBuffer();
      return { buffer: out, mimeType: "image/png", fileName: "converted.png" };
    }
    case "heic-to-jpg":
    case "avif-to-jpg": {
      const out = await sharp(buffers[0]).jpeg({ quality: 90 }).toBuffer();
      return { buffer: out, mimeType: "image/jpeg", fileName: "converted.jpg" };
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
    default:
      throw new Error(`Server processing not available for: ${toolSlug}`);
  }
}
