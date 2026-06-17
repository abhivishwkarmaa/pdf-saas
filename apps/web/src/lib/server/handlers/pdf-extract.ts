import { mkdtemp, writeFile, readFile, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";
import JSZip from "jszip";

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
  format: "jpeg" | "png",
  options: Record<string, unknown> = {}
): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  if (options.mode === "extract") {
    if (await exists("pdfimages")) {
      const dir = await mkdtemp(join(tmpdir(), "pdf-extract-"));
      const input = join(dir, "in.pdf");
      const prefix = join(dir, "extracted");
      try {
        await writeFile(input, buffer);
        await run("pdfimages", ["-png", "-j", input, prefix], dir);

        const files = await readdir(dir);
        const imageFiles = files
          .filter((f) => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg"))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

        if (imageFiles.length === 0) {
          throw new Error("No embedded images found in this PDF.");
        }

        if (imageFiles.length === 1) {
          const fileBuffer = await readFile(join(dir, imageFiles[0]));
          const name = imageFiles[0];
          const ext = name.endsWith(".png") ? "png" : "jpg";
          const mimeType = ext === "png" ? "image/png" : "image/jpeg";
          return {
            buffer: fileBuffer,
            mimeType,
            ext,
          };
        }

        const zip = new JSZip();
        for (const file of imageFiles) {
          const fileBuffer = await readFile(join(dir, file));
          zip.file(file, fileBuffer);
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
        return {
          buffer: zipBuffer,
          mimeType: "application/zip",
          ext: "zip",
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
    throw new Error("pdfimages is not available on this server.");
  }

  if (await exists("pdftoppm")) {
    const dir = await mkdtemp(join(tmpdir(), "pdf-image-"));
    const input = join(dir, "in.pdf");
    const prefix = join(dir, "page");
    try {
      await writeFile(input, buffer);
      const dpi = options.quality === "low" ? "150" : "300";
      await run(
        "pdftoppm",
        [`-${format}`, "-r", dpi, input, prefix],
        dir
      );

      const files = await readdir(dir);
      const ext = format === "jpeg" ? "jpg" : "png";
      const imageFiles = files
        .filter((f) => f.endsWith(`.${ext}`))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

      if (imageFiles.length === 0) {
        throw new Error("Image generation produced no output");
      }

      if (imageFiles.length === 1) {
        const fileBuffer = await readFile(join(dir, imageFiles[0]));
        return {
          buffer: fileBuffer,
          mimeType: format === "jpeg" ? "image/jpeg" : "image/png",
          ext,
        };
      }

      const zip = new JSZip();
      for (const file of imageFiles) {
        const fileBuffer = await readFile(join(dir, file));
        zip.file(file, fileBuffer);
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      return {
        buffer: zipBuffer,
        mimeType: "application/zip",
        ext: "zip",
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  throw new Error("pdftoppm is not available on this server.");
}

