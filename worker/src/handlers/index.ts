import type { JobPayload } from "@pdf-saas/shared";
import { v4 as uuidv4 } from "uuid";
import { getObjectBuffer, putObjectBuffer } from "@pdf-saas/storage";
import { compressPdf } from "./compress.js";
import { convertOffice } from "./office.js";
import { ocrPdf } from "./ocr.js";
import { comparePdfs } from "./compare.js";
import { htmlToPdf } from "./html.js";
import { imageToWord } from "./image-word.js";
import { repairPdf } from "./repair.js";
import { pdfToPdfA } from "./pdfa.js";

export interface HandlerResult {
  outputKey: string;
  outputKeys?: string[];
  mimeType: string;
  fileName: string;
}

export async function runHandler(payload: JobPayload): Promise<HandlerResult> {
  const buffers = await Promise.all(payload.inputKeys.map(getObjectBuffer));
  const opts = payload.options ?? {};

  switch (payload.toolSlug) {
    case "compress-pdf": {
      const quality = String(opts.quality ?? "ebook");
      const out = await compressPdf(buffers[0], quality);
      const key = `outputs/${uuidv4()}/compressed.pdf`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: "compressed.pdf" };
    }
    case "pdf-to-pdfa": {
      const out = await pdfToPdfA(buffers[0]);
      const key = `outputs/${uuidv4()}/output.pdf`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: "pdfa.pdf" };
    }
    case "repair-pdf": {
      const out = await repairPdf(buffers[0]);
      const key = `outputs/${uuidv4()}/repaired.pdf`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: "repaired.pdf" };
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
      const html = buffers[0].toString("utf-8");
      const out = await htmlToPdf(html);
      const key = `outputs/${uuidv4()}/page.pdf`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: "page.pdf" };
    }
    case "image-to-word": {
      const out = await imageToWord(buffers[0]);
      const key = `outputs/${uuidv4()}/document.docx`;
      await putObjectBuffer(
        key,
        out,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      return {
        outputKey: key,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: "document.docx",
      };
    }
    case "ocr-pdf": {
      const lang = String(opts.language ?? "eng");
      const out = await ocrPdf(buffers[0], lang);
      const key = `outputs/${uuidv4()}/searchable.pdf`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: "searchable.pdf" };
    }
    case "markdown-to-pdf":
    case "markdown-to-word":
    case "rtf-to-pdf":
    case "tex-to-word":
    case "pages-to-word":
      return convertOffice(
        buffers[0],
        payload.toolSlug.includes("pdf") ? "pdf" : "docx",
        payload.toolSlug
      );
    case "epub-to-pdf": {
      const out = await convertOffice(buffers[0], "pdf", "epub-to-pdf");
      return out;
    }
    case "svg-to-png": {
      const sharp = (await import("sharp")).default;
      const out = await sharp(buffers[0]).png().toBuffer();
      const key = `outputs/${uuidv4()}/converted.png`;
      await putObjectBuffer(key, out, "image/png");
      return {
        outputKey: key,
        mimeType: "image/png",
        fileName: "converted.png",
      };
    }
    case "compare-pdf": {
      const out = await comparePdfs(buffers[0], buffers[1]);
      const key = `outputs/${uuidv4()}/comparison.pdf`;
      await putObjectBuffer(key, out.report, "application/pdf");
      return {
        outputKey: key,
        mimeType: "application/pdf",
        fileName: "comparison-report.pdf",
      };
    }
    default:
      throw new Error(`No async handler for ${payload.toolSlug}`);
  }
}
