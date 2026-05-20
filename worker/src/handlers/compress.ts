import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../lib/exec.js";
import { PDFDocument } from "pdf-lib";

const profiles: Record<string, string[]> = {
  screen: ["/screen", "/screen"],
  ebook: ["/ebook", "/ebook"],
  print: ["/printer", "/printer"],
};

export async function compressPdf(
  buffer: Buffer,
  quality: string
): Promise<Buffer> {
  if (await exists("gs")) {
    const dir = await mkdtemp(join(tmpdir(), "compress-"));
    const input = join(dir, "in.pdf");
    const output = join(dir, "out.pdf");
    try {
      await writeFile(input, buffer);
      const profile = profiles[quality] ?? profiles.ebook;
      await run("gs", [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        `-dPDFSETTINGS=${profile[0]}`,
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${output}`,
        input,
      ]);
      return await readFile(output);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return Buffer.from(await doc.save({ useObjectStreams: true }));
}
