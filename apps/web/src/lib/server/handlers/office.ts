import { mkdtemp, writeFile, readFile, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";

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
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  if (!(await exists("soffice"))) {
    throw new Error(
      "LibreOffice is not installed on this server. Install it for office conversions."
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
      (f) =>
        f.endsWith(extMap[targetFormat] ?? `.${targetFormat}`) &&
        f !== `input${inputExt}`
    );
    const chosen = outFile ?? files.find((f) => f !== `input${inputExt}`);
    if (!chosen) throw new Error("Conversion produced no output");

    const out = await readFile(join(dir, chosen));
    const mime = mimeFor(targetFormat);
    return { buffer: out, mimeType: mime, fileName: chosen };
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
