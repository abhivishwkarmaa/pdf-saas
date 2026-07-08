import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";
import { Document, Packer, Paragraph, TextRun, ImageRun, PageBreak } from "docx";
import sharp from "sharp";
import JSZip from "jszip";
import heicConvert from "heic-convert";

function getBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return fileName;
  return fileName.slice(0, dotIndex);
}

async function runOcr(pngBuffer: Buffer): Promise<string> {
  if (await exists("tesseract")) {
    const dir = await mkdtemp(join(tmpdir(), "img-ocr-"));
    const input = join(dir, "image.png");
    const out = join(dir, "out");
    try {
      await writeFile(input, pngBuffer);
      await run("tesseract", [input, out, "-l", "eng"]);
      return await readFile(`${out}.txt`, "utf-8");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } else {
    return "[OCR unavailable - install tesseract in worker container]";
  }
}

async function generateDocx(
  pngBuffer: Buffer,
  width: number,
  height: number,
  text: string
): Promise<Buffer> {
  const maxWidth = 600;
  let targetWidth = width;
  let targetHeight = height;
  if (width > maxWidth) {
    targetWidth = maxWidth;
    targetHeight = Math.round((height * maxWidth) / width);
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: pngBuffer,
                type: "png",
                transformation: {
                  width: targetWidth,
                  height: targetHeight,
                },
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun("")] }),
          ...text
            .split("\n")
            .filter(Boolean)
            .map(
              (line) =>
                new Paragraph({ children: [new TextRun(line)] })
            ),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export async function imageToWord(
  buffers: Buffer[],
  fileNames: string[],
  options: Record<string, unknown> = {}
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  if (buffers.length === 0) {
    throw new Error("No files uploaded.");
  }

  // 1. Sanitize and validate all uploaded images
  const safeImages: { buffer: Buffer; width: number; height: number; originalName: string }[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const originalName = fileNames[i] || `image-${i + 1}.png`;
    try {
      let activeBuffer = buffers[i];
      if (
        originalName.toLowerCase().endsWith(".heic") ||
        originalName.toLowerCase().endsWith(".heif")
      ) {
        try {
          const jpegBuffer = await heicConvert({
            buffer: buffers[i],
            format: "JPEG",
            quality: 0.9,
          });
          activeBuffer = Buffer.from(jpegBuffer);
        } catch (heicErr) {
          console.error("HEIC conversion failed in batch handler:", heicErr);
        }
      }

      const sharpImg = sharp(activeBuffer);
      const metadata = await sharpImg.metadata();
      const width = metadata.width || 600;
      const height = metadata.height || 400;
      const pngBuffer = await sharpImg.png().toBuffer();
      safeImages.push({
        buffer: pngBuffer,
        width,
        height,
        originalName,
      });
    } catch (err) {
      throw new Error(
        `Invalid or unsupported image file: ${originalName}. Please upload a valid image.`
      );
    }
  }

  const mode = String(options.mode || "merge");

  // 2. Process based on mode and file count
  if (safeImages.length === 1 || mode === "separate") {
    if (safeImages.length === 1) {
      const img = safeImages[0];
      const text = await runOcr(img.buffer);
      const docxBuffer = await generateDocx(img.buffer, img.width, img.height, text);
      const baseName = getBaseName(img.originalName);
      return {
        buffer: docxBuffer,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: `${baseName}.docx`,
      };
    } else {
      // Multiple files separately -> Bundle into a ZIP
      const zip = new JSZip();
      for (const img of safeImages) {
        const text = await runOcr(img.buffer);
        const docxBuffer = await generateDocx(img.buffer, img.width, img.height, text);
        const baseName = getBaseName(img.originalName);
        zip.file(`${baseName}.docx`, docxBuffer);
      }
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      return {
        buffer: zipBuffer,
        mimeType: "application/zip",
        fileName: "documents.zip",
      };
    }
  }

  // 3. Merge all images into a single DOCX document
  const children: any[] = [];
  for (let i = 0; i < safeImages.length; i++) {
    const img = safeImages[i];
    const text = await runOcr(img.buffer);

    const maxWidth = 600;
    let targetWidth = img.width;
    let targetHeight = img.height;
    if (img.width > maxWidth) {
      targetWidth = maxWidth;
      targetHeight = Math.round((img.height * maxWidth) / img.width);
    }

    // Embed Image
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: img.buffer,
            type: "png",
            transformation: {
              width: targetWidth,
              height: targetHeight,
            },
          }),
        ],
      })
    );

    // Separator spacing
    children.push(new Paragraph({ children: [new TextRun("")] }));

    // Extracted Text
    children.push(
      ...text
        .split("\n")
        .filter(Boolean)
        .map(
          (line) =>
            new Paragraph({ children: [new TextRun(line)] })
        )
    );

    // Add page break between images if not the last one
    if (i < safeImages.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const mergedBuffer = Buffer.from(await Packer.toBuffer(doc));
  const baseName = getBaseName(safeImages[0].originalName);
  return {
    buffer: mergedBuffer,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileName: `${baseName}_merged.docx`,
  };
}
