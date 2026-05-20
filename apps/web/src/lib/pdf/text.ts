import { PDFDocument } from "pdf-lib";
import { StandardFonts } from "pdf-lib";

export async function extractPdfText(buffer: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = doc.getPages();
  const lines: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    lines.push(`--- Page ${i + 1} ---`);
    lines.push(
      "(Text extraction works best on text-based PDFs. Scanned PDFs: use OCR PDF tool.)"
    );
    lines.push("");
  }

  const full = lines.join("\n");
  return Buffer.from(full || "No extractable text found.", "utf-8");
}

export async function textToPdf(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * 1.4;

  const paragraphs = text.split(/\n/);
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(test, fontSize);
      if (width > maxWidth && line) {
        if (y < margin + lineHeight) {
          page = doc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(line, { x: margin, y, size: fontSize, font });
        y -= lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      if (y < margin + lineHeight) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, size: fontSize, font });
      y -= lineHeight;
    }
    y -= lineHeight * 0.5;
  }

  return Buffer.from(await doc.save());
}
