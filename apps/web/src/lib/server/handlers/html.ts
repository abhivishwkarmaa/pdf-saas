import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function htmlToPdf(html: string): Promise<Buffer> {
  if (await exists("soffice")) {
    const dir = await mkdtemp(join(tmpdir(), "html-"));
    const input = join(dir, "input.html");
    const output = join(dir, "input.pdf");
    try {
      await writeFile(input, html);
      await run(
        "soffice",
        ["--headless", "--convert-to", "pdf", "--outdir", dir, input],
        dir
      );
      return await readFile(output);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = html.replace(/<[^>]+>/g, " ").slice(0, 2000);
  page.drawText(text, { x: 50, y: 700, size: 10, font, maxWidth: 500 });
  return Buffer.from(await doc.save());
}
