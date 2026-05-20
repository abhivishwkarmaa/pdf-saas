import { mkdtemp, writeFile, readFile, readdir, rm } from "fs/promises";
import { join, extname } from "path";
import { tmpdir } from "os";
import { run, exists } from "../lib/exec.js";
import { v4 as uuidv4 } from "uuid";
import { putObjectBuffer } from "@pdf-saas/storage";
import type { HandlerResult } from "./index.js";

const extMap: Record<string, string> = {
  docx: ".docx",
  pptx: ".pptx",
  xlsx: ".xlsx",
  pdf: ".pdf",
};

export async function convertOffice(
  buffer: Buffer,
  targetFormat: string,
  toolSlug: string
): Promise<HandlerResult> {
  if (!(await exists("soffice"))) {
    throw new Error(
      "LibreOffice not installed. Start the Docker worker for office conversions."
    );
  }

  const dir = await mkdtemp(join(tmpdir(), "office-"));
  const inputExt = guessInputExt(toolSlug, buffer);
  const input = join(dir, `input${inputExt}`);
  try {
    await writeFile(input, buffer);
    await run(
      "soffice",
      [
        "--headless",
        "--norestore",
        "--convert-to",
        targetFormat,
        "--outdir",
        dir,
        input,
      ],
      dir
    );

    const files = await readdir(dir);
    const outFile = files.find(
      (f) => f.endsWith(extMap[targetFormat] ?? `.${targetFormat}`) && f !== `input${inputExt}`
    );
    if (!outFile) {
      const any = files.find((f) => f !== `input${inputExt}`);
      if (!any) throw new Error("Conversion produced no output");
      const out = await readFile(join(dir, any));
      const mime = mimeFor(targetFormat);
      const fileName = any;
      const key = `outputs/${uuidv4()}/${fileName}`;
      await putObjectBuffer(key, out, mime);
      return {
        outputKey: key,
        mimeType: mime,
        fileName,
      };
    }

    const out = await readFile(join(dir, outFile));
    const mime = mimeFor(targetFormat);
    const key = `outputs/${uuidv4()}/${outFile}`;
    await putObjectBuffer(key, out, mime);
    return {
      outputKey: key,
      mimeType: mime,
      fileName: outFile,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function guessInputExt(toolSlug: string, buffer: Buffer): string {
  if (toolSlug.startsWith("pdf-to")) return ".pdf";
  if (buffer.slice(0, 4).toString() === "%PDF") return ".pdf";
  if (toolSlug === "word-to-pdf") return ".docx";
  if (toolSlug === "powerpoint-to-pdf") return ".pptx";
  if (toolSlug === "excel-to-pdf") return ".xlsx";
  if (toolSlug.startsWith("markdown")) return ".md";
  if (toolSlug === "rtf-to-pdf") return ".rtf";
  if (toolSlug === "tex-to-word") return ".tex";
  if (toolSlug === "pages-to-word") return ".pages";
  if (toolSlug === "epub-to-pdf") return ".epub";
  return ".pdf";
}

function mimeFor(format: string): string {
  const m: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return m[format] ?? "application/octet-stream";
}
