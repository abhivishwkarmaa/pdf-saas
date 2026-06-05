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
function getBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return fileName;
  return fileName.slice(0, dotIndex);
}

export async function pdfToWord(
  buffer: Buffer,
  originalFileName?: string
): Promise<HandlerResult> {
  const dir = (await mkdtemp(join(tmpdir(), "pdf2word-"))).replace(/\\/g, "/");
  const input = join(dir, "input.pdf").replace(/\\/g, "/");
  const output = join(dir, "output.docx").replace(/\\/g, "/");
  const baseName = originalFileName ? getBaseName(originalFileName) : "converted";
  const outFileName = `${baseName}.docx`;

  try {
    await writeFile(input, buffer);

    // ── Strategy 1: pdf2docx (image-preserving) ──────────────────────────
    const hasPython = (await exists("python3")) || (await exists("python"));
    if (hasPython) {
      const pythonBin = (await exists("python3")) ? "python3" : "python";

      // Check whether PyMuPDF is installed
      let hasFitz = false;
      try {
        await run(pythonBin, ["-c", "import fitz"]);
        hasFitz = true;
      } catch {}

      if (hasFitz) {
        try {
          const pyScript = `
import fitz
import sys
import os

input_path = r"${input}"
output_path = r"${output}"
temp_dir = r"${dir}"

def analyzePdf(doc):
    total_chars = 0
    total_images = 0
    total_drawings = 0
    pages_count = len(doc)
    is_scanned = True
    
    for page in doc:
        text = page.get_text().strip()
        total_chars += len(text)
        if len(text) > 0:
            is_scanned = False
            
        imgs = page.get_images(full=True)
        total_images += len(imgs)
        
        drawings = page.get_drawings()
        total_drawings += len(drawings)
        
    avg_chars = total_chars / pages_count if pages_count > 0 else 0
    
    # Intelligently classify PDF type
    if pages_count == 0:
        pdf_type = "scanned"
    elif is_scanned or (total_chars < 50 and total_images > 0):
        pdf_type = "scanned"
    elif total_images == 0 and total_drawings < pages_count * 10 and avg_chars > 300:
        pdf_type = "text_heavy"
    elif total_images > pages_count * 2 or total_drawings > pages_count * 50:
        pdf_type = "graphic_heavy"
    else:
        pdf_type = "mixed"
        
    return {
        "pdf_type": pdf_type,
        "text_count": total_chars,
        "image_count": total_images,
        "drawing_count": total_drawings,
        "avg_chars": avg_chars
    }

def validateOutput(docx_path, expect_images):
    if not os.path.exists(docx_path):
        return False
    if not expect_images:
        return True
    try:
        import zipfile
        with zipfile.ZipFile(docx_path, 'r') as z:
            for name in z.namelist():
                if name.startswith('word/media/'):
                    return True
        return False
    except Exception as e:
        print(f"Validation error: {e}")
        return False

def convertTextPdf(input_path, output_path):
    from pdf2docx import Converter
    cv = Converter(input_path)
    cv.convert(output_path)
    cv.close()

def convertGraphicPdf(doc, output_path, temp_dir):
    from docx import Document
    from docx.shared import Pt, Inches
    from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

    word_doc = Document()
    for i in range(len(doc)):
        page = doc[i]
        w = page.rect.width / 72.0
        h = page.rect.height / 72.0
        
        max_dim = 22.0
        if w > max_dim or h > max_dim:
            scale = max_dim / max(w, h)
            w = w * scale
            h = h * scale
            
        if i > 0:
            section = word_doc.add_section()
        else:
            section = word_doc.sections[0]
            
        section.top_margin = Pt(0)
        section.bottom_margin = Pt(0)
        section.left_margin = Pt(0)
        section.right_margin = Pt(0)
        section.page_width = Inches(w)
        section.page_height = Inches(h)
        
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_path = f"{temp_dir}/page_{i}.jpg"
        pix.save(img_path)
        
        p = word_doc.add_paragraph()
        p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = Pt(0)
        r = p.add_run()
        r.font.size = Pt(1)
        r.add_picture(img_path, width=Inches(w * 0.99), height=Inches(h * 0.99))
        
    word_doc.save(output_path)

def convertScannedPdf(doc, output_path, temp_dir):
    convertGraphicPdf(doc, output_path, temp_dir)

try:
    doc = fitz.open(input_path)
    analysis = analyzePdf(doc)
    print(f"PDF Type Detected: {analysis['pdf_type']}")
    print(f"Text Count: {analysis['text_count']}")
    print(f"Image Count: {analysis['image_count']}")
    print(f"Drawing Count: {analysis['drawing_count']}")
    
    strategy = analysis["pdf_type"]
    converted = False
    
    if strategy == "text_heavy":
        try:
            print("Selected conversion strategy: pdf2docx (Text Heavy)")
            convertTextPdf(input_path, output_path)
            if validateOutput(output_path, expect_images=False):
                converted = True
        except Exception as e:
            print(f"pdf2docx failed: {e}. Falling back to graphic mode.")
            
    elif strategy == "mixed":
        try:
            print("Selected conversion strategy: pdf2docx (Mixed)")
            convertTextPdf(input_path, output_path)
            # Expect images if PDF has raster images OR significant vector drawings (logos, QR codes)
            expect_img = (analysis["image_count"] > 0) or (analysis["drawing_count"] > 5)
            if validateOutput(output_path, expect_images=expect_img):
                converted = True
                print("Validation successful for Mixed PDF.")
            else:
                print("Validation failed: images disappeared. Falling back to graphic mode.")
        except Exception as e:
            print(f"pdf2docx Mixed failed: {e}. Falling back to graphic mode.")
            
    if not converted:
        if strategy == "scanned":
            print("Selected conversion strategy: Scanned PDF")
            convertScannedPdf(doc, output_path, temp_dir)
        else:
            print("Selected conversion strategy: Graphic Heavy / Fallback")
            convertGraphicPdf(doc, output_path, temp_dir)
            
    doc.close()
    
    if os.path.exists(output_path):
        print(f"Final DOCX size: {os.path.getsize(output_path)} bytes")
    else:
        print("Error: Output file does not exist.")
        sys.exit(1)
        
except Exception as e:
    print(f"Critical execution error: {e}")
    sys.exit(1)
`;
          await run(pythonBin, ["-c", pyScript]);
          const out = await readFile(output);
          const key = `outputs/${uuidv4()}/${outFileName}`;
          await putObjectBuffer(key, out, DOCX_MIME);
          return { outputKey: key, mimeType: DOCX_MIME, fileName: outFileName };
        } catch (e) {
          console.error("Python DOCX conversion failed, falling back to LibreOffice", e);
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
    const key = `outputs/${uuidv4()}/${outFileName}`;
    await putObjectBuffer(key, out, DOCX_MIME);
    return { outputKey: key, mimeType: DOCX_MIME, fileName: outFileName };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
