import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";
import { PDFDocument } from "pdf-lib";

export async function repairPdf(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "repair-"));
  const input = join(dir, "in.pdf");
  const output = join(dir, "out.pdf");

  try {
    await writeFile(input, buffer);

    // Strategy 1: qpdf linearization & structural recovery
    if (await exists("qpdf")) {
      try {
        await run("qpdf", ["--linearize", "--warning-exit-0", input, output]);
        return await readFile(output);
      } catch {
        try {
          await run("qpdf", ["--replace-input", input]);
          return await readFile(input);
        } catch {
          // Continue to Strategy 2
        }
      }
    }

    // Strategy 2: Ghostscript stream & XREF reconstruction
    if (await exists("gs")) {
      try {
        await run("gs", [
          "-sDEVICE=pdfwrite",
          "-dCompatibilityLevel=1.4",
          "-dPDFSETTINGS=/default",
          "-dNOPAUSE",
          "-dQUIET",
          "-dBATCH",
          `-sOutputFile=${output}`,
          input,
        ]);
        return await readFile(output);
      } catch {
        // Continue to Strategy 3
      }
    }

    // Strategy 3: pdf-lib parsing fallback
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return Buffer.from(await doc.save({ useObjectStreams: true }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
