import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../lib/exec.js";
import { PDFDocument } from "pdf-lib";

export async function pdfToPdfA(buffer: Buffer): Promise<Buffer> {
  if (await exists("gs")) {
    const dir = await mkdtemp(join(tmpdir(), "pdfa-"));
    const input = join(dir, "in.pdf");
    const output = join(dir, "out.pdf");
    try {
      await writeFile(input, buffer);
      await run("gs", [
        "-dPDFA=2",
        "-dBATCH",
        "-dNOPAUSE",
        "-sProcessColorModel=DeviceRGB",
        "-sDEVICE=pdfwrite",
        "-sPDFACompatibilityPolicy=1",
        `-sOutputFile=${output}`,
        input,
      ]);
      return await readFile(output);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return Buffer.from(await doc.save());
}
