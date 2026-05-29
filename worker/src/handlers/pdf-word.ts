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

      // Check whether PyMuPDF and python-docx are installed
      let hasImageDocx = false;
      try {
        await run(pythonBin, ["-c", "import fitz, docx"]);
        hasImageDocx = true;
      } catch {
        hasImageDocx = false;
      }

      if (hasImageDocx) {
        try {
          const pyScript = `
import fitz
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

doc = fitz.open(r"${input}")
word_doc = Document()
for section in word_doc.sections:
    section.top_margin = Pt(0)
    section.bottom_margin = Pt(0)
    section.left_margin = Pt(0)
    section.right_margin = Pt(0)
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)

for i in range(len(doc)):
    page = doc[i]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img_path = f"${dir}/page_{i}.png"
    pix.save(img_path)
    if i > 0:
        word_doc.add_page_break()
    p = word_doc.add_paragraph()
    p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = Pt(0)
    r = p.add_run()
    r.add_picture(img_path, width=Inches(8.5), height=Inches(11))

word_doc.save(r"${output}")
`;
          await run(pythonBin, ["-c", pyScript]);

          const out = await readFile(output);
          const key = `outputs/${uuidv4()}/converted.docx`;
          await putObjectBuffer(key, out, DOCX_MIME);
          return { outputKey: key, mimeType: DOCX_MIME, fileName: "converted.docx" };
        } catch (e) {
          console.error("Image DOCX conversion failed, falling back to LibreOffice", e);
        }
      }
    }

    // ── Strategy 2: Li
    // breOffice fallback ─────────────────────────────────
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
