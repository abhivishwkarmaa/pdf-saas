import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { runCommand, commandExists } from "../exec";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export async function imagesToPdf(buffers: Buffer[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (const buf of buffers) {
    const png = await sharp(buf).png().toBuffer();
    const image = await doc.embedPng(png);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return Buffer.from(await doc.save());
}

export async function pdfToImages(
  buffer: Buffer,
  format: "jpg" | "png"
): Promise<{ buffers: Buffer[]; mimeType: string }> {
  if (await commandExists("pdftoppm")) {
    const dir = await mkdtemp(join(tmpdir(), "pdf-img-"));
    const input = join(dir, "input.pdf");
    const prefix = join(dir, "page");
    try {
      await writeFile(input, buffer);
      const ext = format === "jpg" ? "jpeg" : "png";
      await runCommand("pdftoppm", [
        format === "jpg" ? "-jpeg" : "-png",
        input,
        prefix,
      ]);
      const { readdir } = await import("fs/promises");
      const files = (await readdir(dir))
        .filter((f) => f.startsWith("page") && f.endsWith(`.${ext === "jpeg" ? "jpg" : "png"}`))
        .sort();
      const buffers: Buffer[] = [];
      for (const f of files) {
        buffers.push(await readFile(join(dir, f)));
      }
      return {
        buffers,
        mimeType: format === "jpg" ? "image/jpeg" : "image/png",
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  // Fallback: render via pdf-lib page count only (placeholder single page)
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const count = doc.getPageCount();
  const buffers: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    const single = await PDFDocument.create();
    const [page] = await single.copyPages(doc, [i]);
    single.addPage(page);
    const pdfBuf = Buffer.from(await single.save());
    buffers.push(pdfBuf);
  }
  return { buffers, mimeType: "application/pdf" };
}
