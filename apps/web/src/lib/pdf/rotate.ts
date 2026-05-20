import { PDFDocument, degrees } from "pdf-lib";

export async function rotatePdf(
  buffer: Buffer,
  angle: 90 | 180 | 270,
  pages?: string
): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const rotation = degrees(angle);
  const pageList = pages
    ? pages.split(",").map((p) => parseInt(p.trim(), 10) - 1)
    : Array.from({ length: total }, (_, i) => i);

  for (const i of pageList) {
    if (i >= 0 && i < total) {
      const page = doc.getPage(i);
      page.setRotation(rotation);
    }
  }
  return Buffer.from(await doc.save());
}
