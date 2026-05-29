import type { JobPayload } from "@pdf-saas/shared";
import { v4 as uuidv4 } from "uuid";
import { getObjectBuffer, putObjectBuffer } from "@pdf-saas/storage";
import { compressPdf } from "./compress.js";
import { convertOffice } from "./office.js";
import { pdfToWord } from "./pdf-word.js";
import { ocrPdf } from "./ocr.js";
import { comparePdfs } from "./compare.js";
import { htmlToPdf } from "./html.js";
import { imageToWord } from "./image-word.js";
import { repairPdf } from "./repair.js";
import { pdfToPdfA } from "./pdfa.js";
import { processVideo } from "./video.js";
import { prisma } from "../lib/db.js";

export interface HandlerResult {
  outputKey: string;
  outputKeys?: string[];
  mimeType: string;
  fileName: string;
}

function getBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return fileName;
  return fileName.slice(0, dotIndex);
}

export async function runHandler(payload: JobPayload): Promise<HandlerResult> {
  const buffers = await Promise.all(payload.inputKeys.map(getObjectBuffer));
  const opts = payload.options ?? {};
  const fileNames = (opts._fileNames as string[]) || [];
  const originalFileName = fileNames[0] || undefined;

  switch (payload.toolSlug) {
    case "compress-pdf": {
      const quality = String(opts.quality ?? "ebook");
      const out = await compressPdf(buffers[0], quality);
      const baseName = originalFileName ? getBaseName(originalFileName) : "compressed";
      const outFileName = `${baseName}_compressed.pdf`;
      const key = `outputs/${uuidv4()}/${outFileName}`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: outFileName };
    }
    case "pdf-to-pdfa": {
      const out = await pdfToPdfA(buffers[0]);
      const baseName = originalFileName ? getBaseName(originalFileName) : "pdfa";
      const outFileName = `${baseName}.pdf`;
      const key = `outputs/${uuidv4()}/${outFileName}`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: outFileName };
    }
    case "repair-pdf": {
      const out = await repairPdf(buffers[0]);
      const baseName = originalFileName ? getBaseName(originalFileName) : "repaired";
      const outFileName = `${baseName}_repaired.pdf`;
      const key = `outputs/${uuidv4()}/${outFileName}`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: outFileName };
    }
    case "pdf-to-word":
      return pdfToWord(buffers[0], originalFileName);
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
      const baseName = originalFileName ? getBaseName(originalFileName) : "searchable";
      const outFileName = `${baseName}_ocr.pdf`;
      const key = `outputs/${uuidv4()}/${outFileName}`;
      await putObjectBuffer(key, out, "application/pdf");
      return { outputKey: key, mimeType: "application/pdf", fileName: outFileName };
    }
    case "markdown-to-pdf":
    case "markdown-to-word":
    case "rtf-to-pdf":
    case "tex-to-word":
    case "pages-to-word":
      return convertOffice(
        buffers[0],
        payload.toolSlug.includes("pdf") ? "pdf" : "docx",
        payload.toolSlug,
        originalFileName
      );
    case "epub-to-pdf": {
      const out = await convertOffice(buffers[0], "pdf", "epub-to-pdf", originalFileName);
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
    case "video-converter": {
      const fileNames = (opts._fileNames as string[]) || ["video.mp4"];
      const result = await processVideo(
        buffers.length > 1 ? buffers : buffers[0],
        opts as any,
        fileNames[0],
        async (progress, speed, eta, logLine) => {
          try {
            await prisma.job.update({
              where: { id: payload.jobId },
              data: {
                progress,
                speed,
                eta,
                logs: {
                  push: logLine,
                },
              },
            });
          } catch (e) {
            // ignore database write errors
          }
        }
      );

      let outputKey = "";
      let outputKeys: string[] = [];

      if (result.splitOutputs && result.splitOutputs.length > 0) {
        for (const out of result.splitOutputs) {
          const key = `outputs/${uuidv4()}/${out.fileName}`;
          await putObjectBuffer(key, out.buffer, out.mimeType);
          outputKeys.push(key);
        }
        outputKey = outputKeys[0];
      } else {
        outputKey = `outputs/${uuidv4()}/${result.fileName}`;
        await putObjectBuffer(outputKey, result.buffer, result.mimeType);
        outputKeys = [outputKey];
      }

      // Update database outputs
      try {
        await prisma.job.update({
          where: { id: payload.jobId },
          data: {
            outputKey,
            outputKeys,
            mimeType: result.mimeType,
            fileName: result.fileName,
          },
        });
      } catch (e) {}

      // Append mock captions or scene analysis logs if generated
      if (result.captions) {
        const captionsKey = `${outputKey}.srt`;
        await putObjectBuffer(captionsKey, Buffer.from(result.captions), "text/plain");
        try {
          await prisma.job.update({
            where: { id: payload.jobId },
            data: {
              logs: {
                push: `[AI Captions generated and saved to: ${captionsKey}]`,
              },
            },
          });
        } catch {}
      }

      return {
        outputKey,
        outputKeys,
        mimeType: result.mimeType,
        fileName: result.fileName,
      };
    }
    default:
      throw new Error(`No async handler for ${payload.toolSlug}`);
  }
}
