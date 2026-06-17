import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

export async function mergePdfs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return blobFromPdf(merged);
}

export async function splitPdf(
  file: File,
  ranges: string
): Promise<Blob[]> {
  const buf = await file.arrayBuffer();
  const source = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = source.getPageCount();
  const normalized = ranges.replace(/\s*-\s*/g, "-");
  const parts = normalized.split(/[\s,;]+/).filter(Boolean);
  const outputs: Blob[] = [];

  for (const part of parts) {
    const doc = await PDFDocument.create();
    let indices: number[] = [];
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      if (isNaN(a) || isNaN(b)) continue;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i++) indices.push(i - 1);
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p)) indices = [p - 1];
    }
    indices = indices.filter((i) => i >= 0 && i < total);
    if (indices.length === 0) continue;
    const copied = await doc.copyPages(source, indices);
    copied.forEach((p) => doc.addPage(p));
    outputs.push(await blobFromPdf(doc));
  }
  return outputs;
}

export async function removePages(file: File, pages: string): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const source = await PDFDocument.load(buf, { ignoreEncryption: true });
  const remove = parsePages(pages, source.getPageCount());
  const keep = Array.from({ length: source.getPageCount() }, (_, i) => i).filter(
    (i) => !remove.has(i)
  );
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, keep);
  copied.forEach((p) => doc.addPage(p));
  return blobFromPdf(doc);
}

export async function extractPages(file: File, pages: string): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const source = await PDFDocument.load(buf, { ignoreEncryption: true });
  const indices = [...parsePages(pages, source.getPageCount())].sort((a, b) => a - b);
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, indices);
  copied.forEach((p) => doc.addPage(p));
  return blobFromPdf(doc);
}

export async function organizePdf(file: File, order: string): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const source = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = source.getPageCount();
  const doc = await PDFDocument.create();

  const normalized = order.replace(/\s*-\s*/g, "-");
  const parts = normalized.split(/[\s,;]+/).filter(Boolean);

  for (const part of parts) {
    const clean = part.toLowerCase().trim();
    if (clean === "b" || clean === "blank") {
      if (total > 0) {
        const firstPage = source.getPages()[0];
        const { width, height } = firstPage.getSize();
        doc.addPage([width, height]);
      } else {
        doc.addPage([612, 792]);
      }
    } else {
      const idx = parseInt(clean, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < total) {
        const [copied] = await doc.copyPages(source, [idx]);
        doc.addPage(copied);
      }
    }
  }

  return blobFromPdf(doc);
}

export async function rotatePdf(
  file: File,
  angle: 90 | 180 | 270,
  pages?: string
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const defaultRot = degrees(angle);

  const total = doc.getPageCount();

  if (pages && pages.trim()) {
    const normalized = pages.replace(/\s*-\s*/g, "-").replace(/\s*:\s*/g, ":");
    const parts = normalized.split(/[\s,;]+/).filter(Boolean);

    for (const part of parts) {
      if (part.includes(":")) {
        const [pagePart, anglePart] = part.split(":");
        const pageAngle = parseInt(anglePart, 10);
        if (pageAngle !== 90 && pageAngle !== 180 && pageAngle !== 270) continue;
        const pageRot = degrees(pageAngle);

        const targetPages = parsePages(pagePart, total);
        doc.getPages().forEach((page, i) => {
          if (targetPages.has(i)) {
            page.setRotation(pageRot);
          }
        });
      } else {
        const targetPages = parsePages(part, total);
        doc.getPages().forEach((page, i) => {
          if (targetPages.has(i)) {
            page.setRotation(defaultRot);
          }
        });
      }
    }
  } else {
    doc.getPages().forEach((page) => page.setRotation(defaultRot));
  }

  return blobFromPdf(doc);
}

export async function imagesToPdf(
  files: File[],
  options: Record<string, string> = {}
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const pageSize = options.pageSize || "a4";
  const orientation = options.orientation || "portrait";
  const marginStr = options.margin || "none";

  let margin = 0;
  if (marginStr === "small") margin = 20;
  else if (marginStr === "big") margin = 50;

  for (const file of files) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const image =
      file.type === "image/png"
        ? await doc.embedPng(buf)
        : await doc.embedJpg(buf);

    const imgWidth = image.width;
    const imgHeight = image.height;

    let pageWidth = imgWidth;
    let pageHeight = imgHeight;

    if (pageSize === "a4") {
      pageWidth = orientation === "landscape" ? 841.89 : 595.28;
      pageHeight = orientation === "landscape" ? 595.28 : 841.89;
    } else if (pageSize === "letter") {
      pageWidth = orientation === "landscape" ? 792 : 612;
      pageHeight = orientation === "landscape" ? 612 : 792;
    } else if (pageSize === "fit") {
      pageWidth = imgWidth + 2 * margin;
      pageHeight = imgHeight + 2 * margin;
    }

    const page = doc.addPage([pageWidth, pageHeight]);

    const printableWidth = pageWidth - 2 * margin;
    const printableHeight = pageHeight - 2 * margin;

    const scale = Math.min(printableWidth / imgWidth, printableHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    const x = margin + (printableWidth - drawWidth) / 2;
    const y = margin + (printableHeight - drawHeight) / 2;

    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }
  return blobFromPdf(doc);
}

export async function watermarkPdf(file: File, text: string): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 4,
      y: height / 2,
      size: 36,
      font,
      color: rgb(0.8, 0.8, 0.8),
      opacity: 0.35,
      rotate: degrees(-45),
    });
  }
  return blobFromPdf(doc);
}

export async function addPageNumbers(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((page, i) => {
    const { width } = page.getSize();
    page.drawText(String(i + 1), {
      x: width / 2 - 6,
      y: 20,
      size: 12,
      font,
    });
  });
  return blobFromPdf(doc);
}

export async function txtToPdf(file: File): Promise<Blob> {
  const text = await file.text();
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage([612, 792]);
  const margin = 50;
  const fontSize = 11;
  const lineHeight = 14;
  let y = 792 - margin;
  const lines = text.split("\n");
  for (const line of lines) {
    if (y < margin + lineHeight) {
      page = doc.addPage([612, 792]);
      y = 792 - margin;
    }
    const cleanLine = line.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
    page.drawText(cleanLine, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  }
  return blobFromPdf(doc);
}

export async function cropPdf(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const dx = width * 0.1;
    const dy = height * 0.1;
    page.setCropBox(dx, dy, width - 2 * dx, height - 2 * dy);
  }
  return blobFromPdf(doc);
}

export async function redactPdf(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 50,
      y: height - 100,
      width: width - 100,
      height: 60,
      color: rgb(0, 0, 0),
    });
  }
  return blobFromPdf(doc);
}

export async function signPdf(files: File[]): Promise<Blob> {
  if (files.length < 2) {
    throw new Error("Please upload both a PDF and a signature image.");
  }
  const pdfFile = files.find((f) => f.type === "application/pdf");
  const imgFile = files.find((f) => f.type.startsWith("image/"));
  if (!pdfFile || !imgFile) {
    throw new Error("Please upload one PDF file and one image file.");
  }
  const pdfBuf = await pdfFile.arrayBuffer();
  const imgBuf = await imgFile.arrayBuffer();
  const doc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
  const image =
    imgFile.type === "image/png"
      ? await doc.embedPng(imgBuf)
      : await doc.embedJpg(imgBuf);
  const pages = doc.getPages();
  if (pages.length > 0) {
    const firstPage = pages[0];
    const { width } = firstPage.getSize();
    firstPage.drawImage(image, {
      x: width - 200,
      y: 50,
      width: 150,
      height: 75,
    });
  }
  return blobFromPdf(doc);
}

function parsePages(pages: string, total: number): Set<number> {
  const set = new Set<number>();
  const normalized = pages.replace(/\s*-\s*/g, "-");
  const parts = normalized.split(/[\s,;]+/).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      if (isNaN(a) || isNaN(b)) continue;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= total) set.add(i - 1);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= total) {
        set.add(p - 1);
      }
    }
  }
  return set;
}

async function blobFromPdf(doc: PDFDocument): Promise<Blob> {
  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
