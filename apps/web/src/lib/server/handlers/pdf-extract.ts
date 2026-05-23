import { mkdtemp, writeFile, readFile, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";

export async function pdfToText(buffer: Buffer): Promise<Buffer> {
  if (await exists("pdftotext")) {
    const dir = await mkdtemp(join(tmpdir(), "pdf-text-"));
    const input = join(dir, "in.pdf");
    const output = join(dir, "out.txt");
    try {
      await writeFile(input, buffer);
      await run("pdftotext", [input, output], dir);
      return await readFile(output);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  throw new Error("pdftotext is not available on this server.");
}

export async function pdfToImage(
  buffer: Buffer,
  format: "jpeg" | "png"
): Promise<Buffer> {
  if (await exists("pdftoppm")) {
    const dir = await mkdtemp(join(tmpdir(), "pdf-image-"));
    const input = join(dir, "in.pdf");
    const prefix = join(dir, "page");
    try {
      await writeFile(input, buffer);
      await run(
        "pdftoppm",
        [`-${format}`, "-singlefile", "-f", "1", "-l", "1", input, prefix],
        dir
      );

      const files = await readdir(dir);
      const ext = format === "jpeg" ? "jpg" : "png";
      const outFile = files.find((f) => f.endsWith(`.${ext}`));
      if (!outFile) throw new Error("Image generation produced no output");
      return await readFile(join(dir, outFile));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  throw new Error("pdftoppm is not available on this server.");
}
