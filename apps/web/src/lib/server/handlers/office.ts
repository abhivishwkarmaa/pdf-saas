import { mkdtemp, writeFile, readFile, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";
import { Document, Packer, Paragraph, TextRun } from "docx";
import pptxgen from "pptxgenjs";

const extMap: Record<string, string> = {
  docx: ".docx",
  pptx: ".pptx",
  xlsx: ".xlsx",
  pdf: ".pdf",
};

export async function pdfToWord(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "pdf-word-"));
  const input = join(dir, "input.pdf");
  const outputTxt = join(dir, "text.txt");
  try {
    await writeFile(input, buffer);
    let text = "";
    if (await exists("pdftotext")) {
      try {
        await run("pdftotext", ["-layout", input, outputTxt], dir);
        text = await readFile(outputTxt, "utf-8");
      } catch (err) {
        console.error("pdftotext error:", err);
      }
    }

    // OCR Fallback if pdftotext didn't yield any text (e.g. scanned PDF)
    if (!text.trim() && (await exists("pdftoppm")) && (await exists("tesseract"))) {
      const prefix = join(dir, "page");
      await run("pdftoppm", ["-png", input, prefix], dir);
      const files = await readdir(dir);
      const pages = files
        .filter((f) => f.startsWith("page") && f.endsWith(".png"))
        .sort();

      const ocrTexts: string[] = [];
      for (const pageFile of pages) {
        const imgPath = join(dir, pageFile);
        const base = pageFile.replace(".png", "");
        const txtPath = join(dir, base);
        await run("tesseract", [imgPath, txtPath, "-l", "eng"], dir);
        try {
          const pageText = await readFile(`${txtPath}.txt`, "utf-8");
          ocrTexts.push(pageText);
        } catch {
          ocrTexts.push("");
        }
      }
      text = ocrTexts.join("\x0c");
    }

    if (!text.trim()) {
      text = "[Empty document or text extraction failed]";
    }

    const pagesText = text.split("\x0c");
    const sections = pagesText.map((pageText) => {
      const paragraphs = pageText
        .split("\n")
        .map((line) => new Paragraph({ children: [new TextRun(line)] }));
      return {
        children: paragraphs,
      };
    });

    const doc = new Document({ sections });
    return Buffer.from(await Packer.toBuffer(doc));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function pdfToExcel(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "pdf-excel-"));
  const input = join(dir, "input.pdf");
  const outputTxt = join(dir, "text.txt");
  const csvFile = join(dir, "table.csv");
  const xlsxFile = join(dir, "table.xlsx");
  try {
    await writeFile(input, buffer);
    let text = "";
    if (await exists("pdftotext")) {
      try {
        await run("pdftotext", ["-layout", input, outputTxt], dir);
        text = await readFile(outputTxt, "utf-8");
      } catch (err) {
        console.error("pdftotext error:", err);
      }
    }

    const lines = text.split("\n");
    const csvRows = lines.map((line) => {
      const cols = line.trim().split(/\s{2,}/);
      const escapedCols = cols.map((col) => {
        const val = col.replace(/"/g, '""');
        return `"${val}"`;
      });
      return escapedCols.join(",");
    });

    await writeFile(csvFile, csvRows.join("\n"), "utf-8");

    if (await exists("soffice")) {
      await run(
        "soffice",
        [
          "--headless",
          "--norestore",
          "--convert-to",
          "xlsx",
          "--outdir",
          dir,
          csvFile,
        ],
        dir
      );
      return await readFile(xlsxFile);
    }

    return await readFile(csvFile);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function pdfToPowerPoint(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "pdf-ppt-"));
  const input = join(dir, "input.pdf");
  const outputTxt = join(dir, "text.txt");
  const prefix = join(dir, "page");
  try {
    await writeFile(input, buffer);

    let text = "";
    if (await exists("pdftotext")) {
      try {
        await run("pdftotext", ["-layout", input, outputTxt], dir);
        text = await readFile(outputTxt, "utf-8");
      } catch (err) {
        console.error("pdftotext error:", err);
      }
    }
    const pagesText = text.split("\x0c");

    let pages: string[] = [];
    if (await exists("pdftoppm")) {
      await run("pdftoppm", ["-png", "-r", "150", input, prefix], dir);
      const files = await readdir(dir);
      pages = files
        .filter((f) => f.startsWith("page") && f.endsWith(".png"))
        .sort();
    }

    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";

    const numPages = Math.max(pagesText.length, pages.length);
    for (let i = 0; i < numPages; i++) {
      const slide = pptx.addSlide();
      const pageText = pagesText[i] || "";
      const pageImgFile = pages[i];

      if (pageText.trim()) {
        slide.slideNumber = { x: "90%", y: "90%" };
        slide.addNotes(pageText.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, ""));
      }

      if (pageImgFile) {
        const imgPath = join(dir, pageImgFile);
        const imgBuffer = await readFile(imgPath);
        slide.addImage({
          data: `data:image/png;base64,${imgBuffer.toString("base64")}`,
          x: 0,
          y: 0,
          w: "100%",
          h: "100%",
        });
      } else {
        slide.addText(pageText.slice(0, 2000), {
          x: 0.5,
          y: 0.5,
          w: "90%",
          h: "80%",
          fontSize: 14,
          color: "333333",
          valign: "top",
        });
      }
    }

    const outputBuffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    return outputBuffer;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function convertOffice(
  buffer: Buffer,
  targetFormat: string,
  toolSlug: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const inputExt = guessInputExt(toolSlug, buffer);

  if (inputExt === ".pdf") {
    if (targetFormat === "docx") {
      const out = await pdfToWord(buffer);
      return { buffer: out, mimeType: mimeFor("docx"), fileName: "converted.docx" };
    }
    if (targetFormat === "pptx") {
      const out = await pdfToPowerPoint(buffer);
      return { buffer: out, mimeType: mimeFor("pptx"), fileName: "converted.pptx" };
    }
    if (targetFormat === "xlsx") {
      const out = await pdfToExcel(buffer);
      return { buffer: out, mimeType: mimeFor("xlsx"), fileName: "converted.xlsx" };
    }
  }

  if (!(await exists("soffice"))) {
    throw new Error(
      "LibreOffice is not installed on this server. Install it for office conversions."
    );
  }

  const dir = await mkdtemp(join(tmpdir(), "office-"));
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

