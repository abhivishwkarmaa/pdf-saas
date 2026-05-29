import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../lib/exec.js";
import { v4 as uuidv4 } from "uuid";
import { putObjectBuffer } from "@pdf-saas/storage";
import type { HandlerResult } from "./index.js";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Convert a PDF buffer to DOCX while preserving images.
 *
 * Strategy (in priority order):
 *  1. pdf2docx  – Python library that renders each PDF page, preserving all
 *                 images, screenshots, and vector graphics.
 *  2. LibreOffice – text-only fallback for environments without Python.
 */
export async function pdfToWord(buffer: Buffer): Promise<HandlerResult> {
  const dir = await mkdtemp(join(tmpdir(), "pdf2word-"));
  const input = join(dir, "input.pdf");
  const output = join(dir, "output.docx");

  try {
    await writeFile(input, buffer);

    // ── Strategy 1: pdf2docx (image-preserving) ──────────────────────────
    const hasPython = (await exists("python3")) || (await exists("python"));
    if (hasPython) {
      const pythonBin = (await exists("python3")) ? "python3" : "python";

      // Check whether pdf2docx is installed
      let hasPdf2docx = false;
      try {
        await run(pythonBin, ["-c", "import pdf2docx"]);
        hasPdf2docx = true;
      } catch {
        hasPdf2docx = false;
      }

      if (hasPdf2docx) {
        try {
          await run(pythonBin, [
            "-c",
            `from pdf2docx import Converter; cv=Converter(r"${input}"); cv.convert(r"${output}"); cv.close()`,
          ]);

          const out = await readFile(output);
          const key = `outputs/${uuidv4()}/converted.docx`;
          await putObjectBuffer(key, out, DOCX_MIME);
          return { outputKey: key, mimeType: DOCX_MIME, fileName: "converted.docx" };
        } catch (e) {
          console.error("pdf2docx failed, falling back to LibreOffice", e);
        }
      }
    }

    // ── Strategy 2: LibreOffice fallback ─────────────────────────────────
    if (!(await exists("soffice"))) {
      throw new Error(
        "Neither pdf2docx (Python) nor LibreOffice is available. " +
          "Rebuild the Docker worker image to include pdf2docx."
      );
    }

    await run(
      "soffice",
      ["--headless", "--norestore", "--convert-to", "docx", "--outdir", dir, input],
      dir
    );

    // LibreOffice names the output after the input file
    const outFile = "input.docx";
    const out = await readFile(join(dir, outFile));
    const key = `outputs/${uuidv4()}/converted.docx`;
    await putObjectBuffer(key, out, DOCX_MIME);
    return { outputKey: key, mimeType: DOCX_MIME, fileName: "converted.docx" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
