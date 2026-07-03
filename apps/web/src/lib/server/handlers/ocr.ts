import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";
import { PDFDocument } from "pdf-lib";

export async function ocrPdf(buffer: Buffer, lang: string): Promise<Buffer> {
  if (await exists("pdftoppm") && await exists("tesseract")) {
    const dir = await mkdtemp(join(tmpdir(), "ocr-"));
    const input = join(dir, "in.pdf");
    const prefix = join(dir, "page");
    try {
      await writeFile(input, buffer);
      await run("pdftoppm", ["-png", input, prefix]);
      const { readdir } = await import("fs/promises");
      const pages = (await readdir(dir))
        .filter((f) => f.startsWith("page") && f.endsWith(".png"))
        .sort();

      const outDoc = await PDFDocument.create();

      for (const pageFile of pages) {
        const imgPath = join(dir, pageFile);
        const base = pageFile.replace(".png", "");
        const pdfPagePath = join(dir, base);
        
        // Run tesseract to produce searchable PDF page
        await run("tesseract", [imgPath, pdfPagePath, "-l", lang, "pdf"]);
        
        const pagePdfBytes = await readFile(`${pdfPagePath}.pdf`);
        const pageDoc = await PDFDocument.load(pagePdfBytes);
        const [copiedPage] = await outDoc.copyPages(pageDoc, [0]);
        outDoc.addPage(copiedPage);
      }
      return Buffer.from(await outDoc.save());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return Buffer.from(await doc.save());
}
