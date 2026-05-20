import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../lib/exec.js";
import { PDFDocument } from "pdf-lib";

export async function repairPdf(buffer: Buffer): Promise<Buffer> {
  if (await exists("qpdf")) {
    const dir = await mkdtemp(join(tmpdir(), "repair-"));
    const input = join(dir, "in.pdf");
    const output = join(dir, "out.pdf");
    try {
      await writeFile(input, buffer);
      try {
        await run("qpdf", ["--linearize", input, output]);
        return await readFile(output);
      } catch {
        await run("qpdf", ["--replace-input", input]);
        return await readFile(input);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return Buffer.from(await doc.save());
}
