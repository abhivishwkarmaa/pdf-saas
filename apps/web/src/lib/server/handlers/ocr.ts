import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
      const font = await outDoc.embedFont(StandardFonts.Helvetica);

      for (const pageFile of pages) {
        const imgPath = join(dir, pageFile);
        const base = pageFile.replace(".png", "");
        const txtPath = join(dir, base);
        await run("tesseract", [imgPath, txtPath, "-l", lang]);
        let text = "";
        try {
          text = await readFile(`${txtPath}.txt`, "utf-8");
        } catch {
          text = "";
        }
        const page = outDoc.addPage([612, 792]);
        page.drawText(text.slice(0, 3000), {
          x: 40,
          y: 750,
          size: 9,
          font,
          color: rgb(0, 0, 0),
          maxWidth: 532,
          lineHeight: 12,
        });
      }
      return Buffer.from(await outDoc.save());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return Buffer.from(await doc.save());
}
