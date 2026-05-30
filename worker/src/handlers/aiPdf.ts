import { mkdtemp, writeFile, readFile, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import archiver from "archiver";
import sharp from "sharp";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import {
  ParsedCommand,
  JobPayload,
  ValidationError,
} from "@pdf-saas/shared";
import { getObjectBuffer, putObjectBuffer } from "@pdf-saas/storage";
import { parseAICommand } from "../lib/aiCommandParser.js";
import { ruleBasedParse } from "../lib/ruleBasedParser.js";
import { run, exists } from "../lib/exec.js";
import type { HandlerResult } from "./index.js";

export async function executeAICommand(
  pdfBuffer: Buffer,
  command: ParsedCommand,
  additionalBuffers?: Buffer[]
): Promise<{ buffer: Buffer; mimeType: string; fileName: string; explanation: string }> {
  const explanation = command.explanation;

  switch (command.action) {
    case "remove_pages": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const total = pdfDoc.getPageCount();
      const pagesToRemove = [...(command.pages || [])];
      if (command.pageRange) {
        for (let i = command.pageRange.from; i <= command.pageRange.to; i++) {
          pagesToRemove.push(i);
        }
      }

      const uniquePages = Array.from(new Set(pagesToRemove));
      for (const p of uniquePages) {
        if (p < 1 || p > total) {
          throw new ValidationError(
            `Page ${p} is out of range. This PDF has ${total} pages.`,
            400,
            `Page ${p} does not exist. This PDF has ${total} pages.`,
            "PAGE_OUT_OF_RANGE"
          );
        }
      }

      if (uniquePages.length === total) {
        throw new ValidationError(
          "Cannot remove all pages.",
          400,
          "Cannot remove all pages — result would be empty PDF",
          "CANNOT_REMOVE_ALL_PAGES"
        );
      }

      const indices = uniquePages.map((p) => p - 1).sort((a, b) => b - a);
      for (const idx of indices) {
        pdfDoc.removePage(idx);
      }

      const saved = await pdfDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "modified.pdf",
        explanation,
      };
    }

    case "extract_pages": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const total = pdfDoc.getPageCount();
      const pagesToExtract: number[] = [];
      if (command.pageRange) {
        for (let i = command.pageRange.from; i <= command.pageRange.to; i++) {
          pagesToExtract.push(i);
        }
      } else if (command.pages) {
        pagesToExtract.push(...command.pages);
      }

      const uniquePages = Array.from(new Set(pagesToExtract)).sort((a, b) => a - b);
      if (uniquePages.length === 0) {
        throw new ValidationError("No pages specified for extraction");
      }

      for (const p of uniquePages) {
        if (p < 1 || p > total) {
          throw new ValidationError(
            `Page ${p} is out of range. This PDF has ${total} pages.`,
            400,
            `Page ${p} does not exist. This PDF has ${total} pages.`,
            "PAGE_OUT_OF_RANGE"
          );
        }
      }

      const newPdfDoc = await PDFDocument.create();
      const copiedPages = await newPdfDoc.copyPages(
        pdfDoc,
        uniquePages.map((p) => p - 1)
      );
      copiedPages.forEach((p) => newPdfDoc.addPage(p));

      const saved = await newPdfDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "extracted.pdf",
        explanation,
      };
    }

    case "rotate_pages": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const total = pdfDoc.getPageCount();
      const rotationDegrees = command.rotationDegrees || 90;
      if (![90, 180, 270].includes(rotationDegrees)) {
        throw new ValidationError("Invalid rotation degrees. Must be 90, 180, or 270.");
      }

      let pagesToRotate = [...(command.pages || [])];
      if (pagesToRotate.length === 0) {
        pagesToRotate = Array.from({ length: total }, (_, i) => i + 1);
      }

      for (const p of pagesToRotate) {
        if (p < 1 || p > total) {
          throw new ValidationError(
            `Page ${p} is out of range. This PDF has ${total} pages.`,
            400,
            `Page ${p} does not exist. This PDF has ${total} pages.`,
            "PAGE_OUT_OF_RANGE"
          );
        }
        const page = pdfDoc.getPage(p - 1);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + rotationDegrees) % 360));
      }

      const saved = await pdfDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "rotated.pdf",
        explanation,
      };
    }

    case "merge": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      if (!additionalBuffers || additionalBuffers.length === 0) {
        throw new ValidationError("No additional PDFs provided for merging");
      }

      for (const buf of additionalBuffers) {
        const docToMerge = await PDFDocument.load(buf);
        const copiedPages = await pdfDoc.copyPages(
          docToMerge,
          docToMerge.getPageIndices()
        );
        copiedPages.forEach((p) => pdfDoc.addPage(p));
      }

      const saved = await pdfDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "merged.pdf",
        explanation,
      };
    }

    case "replace_page": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const total = pdfDoc.getPageCount();
      const pageToReplace = command.pages?.[0] || 1;
      if (pageToReplace < 1 || pageToReplace > total) {
        throw new ValidationError(
          `Page ${pageToReplace} is out of range. This PDF has ${total} pages.`,
          400,
          `Page ${pageToReplace} does not exist. This PDF has ${total} pages.`,
          "PAGE_OUT_OF_RANGE"
        );
      }
      if (!additionalBuffers || additionalBuffers.length === 0) {
        throw new ValidationError("No replacement PDF file provided");
      }

      const replacerDoc = await PDFDocument.load(additionalBuffers[0]);
      if (replacerDoc.getPageCount() === 0) {
        throw new ValidationError("Replacement PDF contains no pages.");
      }

      const copiedPages = await pdfDoc.copyPages(replacerDoc, [0]);
      pdfDoc.insertPage(pageToReplace - 1, copiedPages[0]);
      pdfDoc.removePage(pageToReplace);

      const saved = await pdfDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "replaced.pdf",
        explanation,
      };
    }

    case "split": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const total = pdfDoc.getPageCount();
      const splitAfterPage = command.splitAfterPage || Math.floor(total / 2);
      if (splitAfterPage < 1 || splitAfterPage >= total) {
        throw new ValidationError(
          `Split after page ${splitAfterPage} must be between 1 and ${total - 1}.`,
          400,
          `Cannot split at page ${splitAfterPage}. PDF only has ${total} pages.`,
          "INVALID_SPLIT_PAGE"
        );
      }

      const part1Doc = await PDFDocument.create();
      const part1Pages = await part1Doc.copyPages(
        pdfDoc,
        Array.from({ length: splitAfterPage }, (_, i) => i)
      );
      part1Pages.forEach((p) => part1Doc.addPage(p));
      const part1Buffer = Buffer.from(await part1Doc.save());

      const part2Doc = await PDFDocument.create();
      const part2Pages = await part2Doc.copyPages(
        pdfDoc,
        Array.from({ length: total - splitAfterPage }, (_, i) => i + splitAfterPage)
      );
      part2Pages.forEach((p) => part2Doc.addPage(p));
      const part2Buffer = Buffer.from(await part2Doc.save());

      const archive = archiver("zip", { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
        archive.on("data", (chunk) => chunks.push(chunk));
        archive.on("end", () => resolve(Buffer.concat(chunks)));
        archive.on("error", (err) => reject(err));

        archive.append(part1Buffer, { name: "part1.pdf" });
        archive.append(part2Buffer, { name: "part2.pdf" });
        archive.finalize();
      });

      return {
        buffer: zipBuffer,
        mimeType: "application/zip",
        fileName: "split.zip",
        explanation,
      };
    }

    case "compress": {
      if (!(await exists("gs"))) {
        // Fallback to pdf-lib if Ghostscript is missing
        const doc = await PDFDocument.load(pdfBuffer);
        const saved = await doc.save({ useObjectStreams: true });
        return {
          buffer: Buffer.from(saved),
          mimeType: "application/pdf",
          fileName: "compressed.pdf",
          explanation: explanation + " (Fallback compression applied)",
        };
      }

      const dir = await mkdtemp(join(tmpdir(), "compress-"));
      const input = join(dir, "in.pdf");
      const output = join(dir, "out.pdf");
      try {
        await writeFile(input, pdfBuffer);
        const targetSize = command.targetSize || "ebook";
        const gsProfile =
          targetSize === "screen"
            ? "/screen"
            : targetSize === "printer"
            ? "/printer"
            : "/ebook";

        await run("gs", [
          "-sDEVICE=pdfwrite",
          "-dCompatibilityLevel=1.4",
          `-dPDFSETTINGS=${gsProfile}`,
          "-dNOPAUSE",
          "-dQUIET",
          "-dBATCH",
          `-sOutputFile=${output}`,
          input,
        ]);
        const compressed = await readFile(output);
        return {
          buffer: compressed,
          mimeType: "application/pdf",
          fileName: "compressed.pdf",
          explanation,
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }

    case "watermark": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const text = command.watermarkText || "CONFIDENTIAL";
      const opacity = command.watermarkOpacity ?? 0.3;
      const pos = command.watermarkPosition || "center";

      for (const page of pages) {
        const { width, height } = page.getSize();
        let fontSize = 24;
        let x = 0;
        let y = 0;

        if (pos === "center") {
          fontSize = 48;
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
        } else if (pos === "top") {
          fontSize = 24;
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          x = (width - textWidth) / 2;
          y = height - 50;
        } else {
          fontSize = 24;
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          x = (width - textWidth) / 2;
          y = 50;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(1, 0, 0),
          opacity,
        });
      }

      const saved = await pdfDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "watermarked.pdf",
        explanation,
      };
    }

    case "convert_to_word": {
      if (!(await exists("soffice"))) {
        throw new Error(
          "LibreOffice (soffice) is not installed on this system. Cannot convert to Word."
        );
      }

      const dir = await mkdtemp(join(tmpdir(), "word-"));
      const input = join(dir, "input.pdf");
      try {
        await writeFile(input, pdfBuffer);
        await run("soffice", [
          "--headless",
          "--norestore",
          "--convert-to",
          "docx",
          "--outdir",
          dir,
          input,
        ]);
        const files = await readdir(dir);
        const outFile = files.find((f) => f.endsWith(".docx"));
        if (!outFile) {
          throw new Error("LibreOffice conversion failed to produce docx");
        }
        const docxBuffer = await readFile(join(dir, outFile));
        return {
          buffer: docxBuffer,
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileName: "converted.docx",
          explanation,
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }

    case "reorder_pages": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const total = pdfDoc.getPageCount();
      const reorderMap = command.reorderMap || [];
      if (reorderMap.length === 0) {
        throw new ValidationError("No page reordering map specified");
      }
      for (const p of reorderMap) {
        if (p < 1 || p > total) {
          throw new ValidationError(
            `Page ${p} in reorder map is out of range. PDF has ${total} pages.`,
            400,
            `Page ${p} does not exist. PDF only has ${total} pages.`,
            "PAGE_OUT_OF_RANGE"
          );
        }
      }

      const reorderedDoc = await PDFDocument.create();
      const copiedPages = await reorderedDoc.copyPages(
        pdfDoc,
        reorderMap.map((p) => p - 1)
      );
      copiedPages.forEach((p) => reorderedDoc.addPage(p));

      const saved = await reorderedDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "reordered.pdf",
        explanation,
      };
    }

    case "delete_blank_pages": {
      if (!(await exists("pdftoppm"))) {
        throw new Error("pdftoppm (poppler-utils) is not installed on this system.");
      }

      const dir = await mkdtemp(join(tmpdir(), "blank-"));
      const input = join(dir, "in.pdf");
      const prefix = join(dir, "page");
      try {
        await writeFile(input, pdfBuffer);
        await run("pdftoppm", ["-png", input, prefix]);

        const files = await readdir(dir);
        const pageFiles = files
          .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)![0], 10);
            const numB = parseInt(b.match(/\d+/)![0], 10);
            return numA - numB;
          });

        const nonBlankPageNumbers: number[] = [];
        for (let i = 0; i < pageFiles.length; i++) {
          const pageFile = pageFiles[i];
          const imgPath = join(dir, pageFile);

          const { data, info } = await sharp(imgPath)
            .raw()
            .toBuffer({ resolveWithObject: true });

          let whitePixels = 0;
          const totalPixels = info.width * info.height;
          const channels = info.channels;

          for (let j = 0; j < data.length; j += channels) {
            const r = data[j];
            const g = data[j + 1];
            const b = data[j + 2];
            if (r >= 240 && g >= 240 && b >= 240) {
              whitePixels++;
            }
          }

          const whiteRatio = whitePixels / totalPixels;
          if (whiteRatio <= 0.95) {
            nonBlankPageNumbers.push(i + 1);
          }
        }

        if (nonBlankPageNumbers.length === 0) {
          throw new ValidationError(
            "Cannot remove all blank pages - result would be empty PDF",
            400,
            "All pages in the PDF are blank. Removing them would result in an empty PDF.",
            "CANNOT_REMOVE_ALL_PAGES"
          );
        }

        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const cleanDoc = await PDFDocument.create();
        const copiedPages = await cleanDoc.copyPages(
          pdfDoc,
          nonBlankPageNumbers.map((p) => p - 1)
        );
        copiedPages.forEach((p) => cleanDoc.addPage(p));

        const saved = await cleanDoc.save();
        return {
          buffer: Buffer.from(saved),
          mimeType: "application/pdf",
          fileName: "cleaned.pdf",
          explanation,
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }

    case "add_page_numbers": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const total = pages.length;

      for (let i = 0; i < total; i++) {
        const page = pages[i];
        const { width } = page.getSize();
        const text = `Page ${i + 1} of ${total}`;
        const fontSize = 10;
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: 20,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }

      const saved = await pdfDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "numbered.pdf",
        explanation,
      };
    }

    case "encrypt": {
      if (!(await exists("qpdf"))) {
        throw new Error("qpdf is not installed on this system.");
      }

      const dir = await mkdtemp(join(tmpdir(), "encrypt-"));
      const input = join(dir, "in.pdf");
      const output = join(dir, "out.pdf");
      try {
        await writeFile(input, pdfBuffer);
        const password = command.password || "hello123";
        await run("qpdf", [
          "--encrypt",
          password,
          password,
          "256",
          "--",
          input,
          output,
        ]);
        const encrypted = await readFile(output);
        return {
          buffer: encrypted,
          mimeType: "application/pdf",
          fileName: "encrypted.pdf",
          explanation,
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }

    case "decrypt": {
      if (!(await exists("qpdf"))) {
        throw new Error("qpdf is not installed on this system.");
      }

      const dir = await mkdtemp(join(tmpdir(), "decrypt-"));
      const input = join(dir, "in.pdf");
      const output = join(dir, "out.pdf");
      try {
        await writeFile(input, pdfBuffer);
        const password = command.password || "";
        const args = ["--decrypt"];
        if (password) {
          args.push(`--password=${password}`);
        }
        args.push(input, output);
        await run("qpdf", args);
        const decrypted = await readFile(output);
        return {
          buffer: decrypted,
          mimeType: "application/pdf",
          fileName: "decrypted.pdf",
          explanation,
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }

    case "resize_pages": {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const targetWidth = 595; // A4 width
      const targetHeight = 842; // A4 height

      for (const page of pages) {
        const { width, height } = page.getSize();
        const scaleX = targetWidth / width;
        const scaleY = targetHeight / height;
        page.scale(scaleX, scaleY);
        page.setSize(targetWidth, targetHeight);
      }

      const saved = await pdfDoc.save();
      return {
        buffer: Buffer.from(saved),
        mimeType: "application/pdf",
        fileName: "resized.pdf",
        explanation,
      };
    }

    default:
      throw new ValidationError(`Unknown or unsupported AI command action: ${command.action}`);
  }
}

export async function handleAiPdf(payload: JobPayload): Promise<HandlerResult> {
  const inputKey = payload.inputKeys[0];
  if (!inputKey) {
    throw new ValidationError("No input PDF key provided in job payload");
  }

  const mainBuffer = await getObjectBuffer(inputKey);

  // 1. Check if the PDF is password-protected or load page count
  let totalPages = 0;
  let isEncrypted = false;

  try {
    const pdfDoc = await PDFDocument.load(mainBuffer);
    totalPages = pdfDoc.getPageCount();
  } catch (err) {
    isEncrypted = true;
  }

  // 2. Resolve additional buffers if present
  const additionalBuffers: Buffer[] = [];
  const addKeys = payload.additionalKeys || (payload.options?.additionalKeys as string[]) || [];
  for (const key of addKeys) {
    additionalBuffers.push(await getObjectBuffer(key));
  }

  // 3. Resolve the command mapping
  let command: ParsedCommand | undefined = payload.parsedAiCommand;
  if (!command) {
    const rawCommand = payload.aiCommand || (payload.options?.aiCommand as string);
    if (!rawCommand) {
      throw new ValidationError("No command or parsed command provided");
    }

    // Try rule-based parser first
    const ruleResult = ruleBasedParse(rawCommand, isEncrypted ? 1 : totalPages);
    if (ruleResult) {
      command = ruleResult;
    } else {
      // Fallback to OpenAI Command Parser
      command = await parseAICommand(rawCommand, isEncrypted ? 1 : totalPages);
    }
  }

  // 4. Handle encrypted PDF gate
  if (isEncrypted && command.action !== "decrypt") {
    throw new ValidationError(
      "This PDF is password protected. Use Decrypt PDF tool first.",
      400,
      "This PDF is password protected. Use Decrypt PDF tool first.",
      "PDF_PASSWORD_PROTECTED"
    );
  }

  // 5. Execute action
  const result = await executeAICommand(mainBuffer, command, additionalBuffers);

  // 6. Upload results to storage
  const outFileName = result.fileName;
  const key = `outputs/${uuidv4()}/${outFileName}`;
  await putObjectBuffer(key, result.buffer, result.mimeType);

  return {
    outputKey: key,
    mimeType: result.mimeType,
    fileName: outFileName,
  };
}
