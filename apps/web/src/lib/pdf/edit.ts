import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export async function watermarkPdf(
  buffer: Buffer,
  text: string
): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - (text.length * 6) / 2,
      y: height / 2,
      size: 48,
      font,
      color: rgb(0.75, 0.75, 0.75),
      opacity: 0.4,
      rotate: degrees(-45),
    });
  }
  return Buffer.from(await doc.save());
}

export async function addPageNumbers(buffer: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    page.drawText(`${i + 1}`, {
      x: width / 2 - 8,
      y: 20,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });
  return Buffer.from(await doc.save());
}

export async function cropPdf(
  buffer: Buffer,
  margin: number
): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.setCropBox(margin, margin, width - margin * 2, height - margin * 2);
  }
  return Buffer.from(await doc.save());
}

export async function redactPdf(
  buffer: Buffer,
  regions: { page: number; x: number; y: number; w: number; h: number }[]
): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  for (const r of regions) {
    const page = doc.getPage(r.page - 1);
    page.drawRectangle({
      x: r.x,
      y: r.y,
      width: r.w,
      height: r.h,
      color: rgb(0, 0, 0),
    });
  }
  return Buffer.from(await doc.save());
}

export async function signPdf(
  pdfBuffer: Buffer,
  signatureBuffer: Buffer,
  pageIndex: number,
  x: number,
  y: number,
  width: number
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const isPng = signatureBuffer[0] === 0x89;
  const image = isPng
    ? await doc.embedPng(signatureBuffer)
    : await doc.embedJpg(signatureBuffer);
  const page = doc.getPage(pageIndex);
  const aspect = image.height / image.width;
  page.drawImage(image, { x, y, width, height: width * aspect });
  return Buffer.from(await doc.save());
}
