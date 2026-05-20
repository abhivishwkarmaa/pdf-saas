import { PDFDocument } from "pdf-lib";

function parsePageList(pages: string, total: number): number[] {
  const indices = new Set<number>();
  for (const part of pages.split(",").map((p) => p.trim())) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      for (let i = a; i <= b; i++) {
        if (i >= 1 && i <= total) indices.add(i - 1);
      }
    } else {
      const p = parseInt(part, 10);
      if (p >= 1 && p <= total) indices.add(p - 1);
    }
  }
  return [...indices].sort((a, b) => a - b);
}

export async function removePages(
  buffer: Buffer,
  pagesToRemove: string
): Promise<Buffer> {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = source.getPageCount();
  const remove = new Set(parsePageList(pagesToRemove, total));
  const keep = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !remove.has(i)
  );
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, keep);
  copied.forEach((p) => doc.addPage(p));
  return Buffer.from(await doc.save());
}

export async function extractPages(
  buffer: Buffer,
  pages: string
): Promise<Buffer> {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = source.getPageCount();
  const indices = parsePageList(pages, total);
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, indices);
  copied.forEach((p) => doc.addPage(p));
  return Buffer.from(await doc.save());
}

export async function organizePages(
  buffer: Buffer,
  order: string
): Promise<Buffer> {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = source.getPageCount();
  const indices = order
    .split(",")
    .map((p) => parseInt(p.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < total);
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, indices);
  copied.forEach((p) => doc.addPage(p));
  return Buffer.from(await doc.save());
}
