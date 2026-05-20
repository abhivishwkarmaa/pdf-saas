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
  const parts = ranges.split(",").map((r) => r.trim());
  const outputs: Blob[] = [];

  for (const part of parts) {
    const doc = await PDFDocument.create();
    let indices: number[] = [];
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      for (let i = a; i <= b; i++) indices.push(i - 1);
    } else {
      indices = [parseInt(part, 10) - 1];
    }
    indices = indices.filter((i) => i >= 0 && i < total);
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
  const indices = order
    .split(",")
    .map((p) => parseInt(p.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < total);
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, indices);
  copied.forEach((p) => doc.addPage(p));
  return blobFromPdf(doc);
}

export async function rotatePdf(
  file: File,
  angle: 90 | 180 | 270
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const rot = degrees(angle);
  doc.getPages().forEach((page) => page.setRotation(rot));
  return blobFromPdf(doc);
}

export async function imagesToPdf(files: File[]): Promise<Blob> {
  const doc = await PDFDocument.create();
  for (const file of files) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const image =
      file.type === "image/png"
        ? await doc.embedPng(buf)
        : await doc.embedJpg(buf);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
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

function parsePages(pages: string, total: number): Set<number> {
  const set = new Set<number>();
  for (const part of pages.split(",").map((p) => p.trim())) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      for (let i = a; i <= b; i++) if (i >= 1 && i <= total) set.add(i - 1);
    } else {
      const p = parseInt(part, 10);
      if (p >= 1 && p <= total) set.add(p - 1);
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
