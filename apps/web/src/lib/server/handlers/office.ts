import { mkdtemp, writeFile, readFile, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists, runWithOutput } from "../exec";
import { ocrPdf } from "./ocr";
import { Document, Packer, Paragraph, TextRun } from "docx";
import pptxgen from "pptxgenjs";

const extMap: Record<string, string> = {
  docx: ".docx",
  pptx: ".pptx",
  xlsx: ".xlsx",
  pdf: ".pdf",
};

async function optimizeDocxWithPython(pythonBin: string, docxPath: string): Promise<void> {
  const pyScript = `
import zipfile
import os
import io
try:
    from PIL import Image
except ImportError:
    Image = None

docx_path = r"${docxPath.replace(/\\/g, "/")}"
if os.path.exists(docx_path):
    temp_zip = docx_path + ".temp"
    try:
        with zipfile.ZipFile(docx_path, 'r') as zin:
            with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    data = zin.read(item.filename)
                    if Image and item.filename.startswith("word/media/") and any(item.filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".tiff"]):
                        try:
                            # Optimize image
                            img = Image.open(io.BytesIO(data))
                            out_bytes = io.BytesIO()
                            
                            # Keep format identical to avoid violating [Content_Types].xml
                            if img.format == "JPEG" or img.mode == "RGB" and not item.filename.lower().endswith(".png"):
                                img.save(out_bytes, format="JPEG", quality=75)
                                data = out_bytes.getvalue()
                            elif img.format == "PNG" or item.filename.lower().endswith(".png"):
                                # Shrink RGB PNGs by converting to 8-bit palette
                                if img.mode == "RGB":
                                    img = img.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
                                img.save(out_bytes, format="PNG", optimize=True)
                                data = out_bytes.getvalue()
                        except Exception as e:
                            pass
                    zout.writestr(item, data)
        os.replace(temp_zip, docx_path)
    except Exception as e:
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
`;
  try {
    await run(pythonBin, ["-c", pyScript]);
  } catch (err) {
    console.error("Error optimizing DOCX images:", err);
  }
}

async function detectPdfType(pdfPath: string): Promise<string> {
  const hasPython = (await exists("python3")) || (await exists("python"));
  if (!hasPython) return "scanned";
  const pythonBin = (await exists("python3")) ? "python3" : "python";

  const pyScript = `
import fitz
import sys
try:
    doc = fitz.open(r"${pdfPath.replace(/\\/g, "/")}")
    pages_count = len(doc)
    if pages_count == 0:
        print("scanned")
        sys.exit(0)
    
    total_chars = 0
    total_images = 0
    total_drawings = 0
    total_tables = 0
    is_scanned = True
    has_large_image_or_ocr = False
    
    pages_to_scan = min(pages_count, 5)
    for i in range(pages_to_scan):
        page = doc[i]
        text = page.get_text("text").strip()
        total_chars += len(text)
        if len(text) > 50:
            is_scanned = False
            
        page_area = page.rect.width * page.rect.height
        imgs = page.get_images(full=True)
        total_images += len(imgs)
        for img_info in imgs:
            xref = img_info[0]
            try:
                rects = page.get_image_rects(xref)
                for r in rects:
                    if r.width * r.height > 0.85 * page_area:
                        has_large_image_or_ocr = True
            except:
                pass
                
        total_drawings += len(page.get_drawings())
        try:
            total_tables += len(page.find_tables().tables)
        except:
            pass
            
    avg_chars = total_chars / pages_to_scan if pages_to_scan > 0 else 0
    if is_scanned or has_large_image_or_ocr or (total_chars < 100 and total_images > 0):
        print("scanned")
    elif total_images == 0 and total_drawings < pages_to_scan * 15 and avg_chars > 300:
        print("text_heavy")
    elif total_images > pages_to_scan * 2 or total_drawings > pages_to_scan * 40 or total_tables > 0:
        print("graphic_heavy")
    else:
        print("mixed")
except Exception as e:
    print("scanned")
`;
  try {
    const output = await runWithOutput(pythonBin, ["-c", pyScript]);
    return output.trim();
  } catch (err) {
    console.error("Error detecting PDF type:", err);
    return "scanned";
  }
}

async function convertPdfToWordViaAdobe(buffer: Buffer): Promise<Buffer> {
  const clientId = process.env.ADOBE_CLIENT_ID;
  const clientSecret = process.env.ADOBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Adobe Client ID or Client Secret is not configured.");
  }

  // 1. Get Access Token
  const tokenRes = await fetch("https://ims-na1.adobelogin.com/ims/token/v3", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "openid,AdobeID,pdf_services",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get Adobe access token: ${errText}`);
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // 2. Create Upload Asset
  const assetRes = await fetch("https://pdf-services.adobe.io/assets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "x-api-key": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mediaType: "application/pdf" }),
  });

  if (!assetRes.ok) {
    const errText = await assetRes.text();
    throw new Error(`Failed to create Adobe upload asset: ${errText}`);
  }

  const { uploadUri, assetID } = (await assetRes.json()) as {
    uploadUri: string;
    assetID: string;
  };

  // 3. Upload the PDF
  const uploadRes = await fetch(uploadUri, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: buffer as any,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload PDF to Adobe: ${errText}`);
  }

  // 4. Create Export Job
  const jobRes = await fetch("https://pdf-services.adobe.io/operation/exportpdf", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "x-api-key": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assetID,
      targetFormat: "docx",
    }),
  });

  if (!jobRes.ok) {
    const errText = await jobRes.text();
    throw new Error(`Failed to create export job in Adobe: ${errText}`);
  }

  const statusUrl = jobRes.headers.get("location");
  if (!statusUrl) {
    throw new Error("Adobe export job response did not return a status location header.");
  }

  // 5. Poll Job Status
  let downloadUri = "";
  const maxAttempts = 90; // 90 attempts * 1.0s = 90s max poll time
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pollRes = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-api-key": clientId,
      },
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text();
      throw new Error(`Adobe job polling failed: ${errText}`);
    }

    const jobStatus = (await pollRes.json()) as {
      status: string;
      asset?: { downloadUri: string };
      error?: unknown;
    };

    if (jobStatus.status === "done" || jobStatus.status === "completed" || jobStatus.status === "success") {
      downloadUri = jobStatus.asset?.downloadUri || "";
      break;
    } else if (jobStatus.status === "failed") {
      throw new Error(`Adobe export job failed: ${JSON.stringify(jobStatus.error)}`);
    }
  }

  if (!downloadUri) {
    throw new Error("Adobe export job timed out or returned no download URI.");
  }

  // 6. Download the DOCX file
  const downloadRes = await fetch(downloadUri);
  if (!downloadRes.ok) {
    throw new Error(`Failed to download converted DOCX from Adobe: ${downloadRes.statusText}`);
  }

  const outArrayBuffer = await downloadRes.arrayBuffer();
  return Buffer.from(outArrayBuffer);
}

async function detectOfficeType(buffer: Buffer, ext: string): Promise<string> {
  const pythonBin = (await exists("python3")) ? "python3" : "python";
  const tempFile = join(tmpdir(), `detect-office-${Date.now()}${ext}`).replace(/\\/g, "/");
  try {
    await writeFile(tempFile, buffer);
    const pyScript = `
import zipfile
import sys
import os

filePath = r"${tempFile}"
ext = os.path.splitext(filePath)[1].lower()

try:
    with zipfile.ZipFile(filePath, 'r') as zip_ref:
        names = zip_ref.namelist()
        has_media = False
        if ext in ['.docx', '.doc']:
            has_media = any(name.startswith('word/media/') for name in names)
        elif ext in ['.pptx', '.ppt']:
            has_media = any(name.startswith('ppt/media/') for name in names)
        elif ext in ['.xlsx', '.xls']:
            has_media = any(name.startswith('xl/media/') for name in names)
        
        if has_media:
            print("graphic_heavy")
        else:
            print("text_heavy")
except Exception as e:
    print("graphic_heavy")
`;
    const output = await runWithOutput(pythonBin, ["-c", pyScript]);
    return output.trim();
  } catch (err) {
    console.error("Error detecting Office type:", err);
    return "graphic_heavy";
  } finally {
    try {
      await rm(tempFile, { force: true });
    } catch {}
  }
}

async function convertOfficeToPdfViaAdobe(buffer: Buffer, ext: string): Promise<Buffer> {
  const clientId = process.env.ADOBE_CLIENT_ID;
  const clientSecret = process.env.ADOBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Adobe Client ID or Client Secret is not configured.");
  }

  // 1. Get Access Token
  const tokenRes = await fetch("https://ims-na1.adobelogin.com/ims/token/v3", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "openid,AdobeID,pdf_services",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get Adobe access token: ${errText}`);
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Get Mime type
  let mimeType = "application/octet-stream";
  if (ext === ".docx" || ext === ".doc") {
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (ext === ".pptx" || ext === ".ppt") {
    mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  } else if (ext === ".xlsx" || ext === ".xls") {
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  // 2. Create Upload Asset
  const assetRes = await fetch("https://pdf-services.adobe.io/assets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "x-api-key": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mediaType: mimeType }),
  });

  if (!assetRes.ok) {
    const errText = await assetRes.text();
    throw new Error(`Failed to create Adobe upload asset: ${errText}`);
  }

  const { uploadUri, assetID } = (await assetRes.json()) as {
    uploadUri: string;
    assetID: string;
  };

  // 3. Upload the file
  const uploadRes = await fetch(uploadUri, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: buffer as any,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload file to Adobe: ${errText}`);
  }

  // 4. Create Create PDF Job
  const jobRes = await fetch("https://pdf-services.adobe.io/operation/createpdf", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "x-api-key": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assetID,
    }),
  });

  if (!jobRes.ok) {
    const errText = await jobRes.text();
    throw new Error(`Failed to create Create PDF job in Adobe: ${errText}`);
  }

  const statusUrl = jobRes.headers.get("location");
  if (!statusUrl) {
    throw new Error("Adobe createpdf job response did not return a status location header.");
  }

  // 5. Poll Job Status
  let downloadUri = "";
  const maxAttempts = 90; // 90s max poll time
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pollRes = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-api-key": clientId,
      },
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text();
      throw new Error(`Adobe job polling failed: ${errText}`);
    }

    const jobStatus = (await pollRes.json()) as {
      status: string;
      asset?: { downloadUri: string };
      error?: unknown;
    };

    if (jobStatus.status === "done" || jobStatus.status === "completed" || jobStatus.status === "success") {
      downloadUri = jobStatus.asset?.downloadUri || "";
      break;
    } else if (jobStatus.status === "failed") {
      throw new Error(`Adobe createpdf job failed: ${JSON.stringify(jobStatus.error)}`);
    }
  }

  if (!downloadUri) {
    throw new Error("Adobe createpdf job timed out or returned no download URI.");
  }

  // 6. Download the PDF file
  const downloadRes = await fetch(downloadUri);
  if (!downloadRes.ok) {
    throw new Error(`Failed to download converted PDF from Adobe: ${downloadRes.statusText}`);
  }

  const outArrayBuffer = await downloadRes.arrayBuffer();
  return Buffer.from(outArrayBuffer);
}

export async function pdfToWord(buffer: Buffer, options?: Record<string, unknown>): Promise<Buffer> {
  const dir = (await mkdtemp(join(tmpdir(), "pdf-word-"))).replace(/\\/g, "/");
  const input = join(dir, "input.pdf").replace(/\\/g, "/");
  const outputDocx = join(dir, "output.docx").replace(/\\/g, "/");
  const outputTxt = join(dir, "text.txt").replace(/\\/g, "/");
  try {
    await writeFile(input, buffer);

    const selectedEngine = options?.engine ? String(options.engine) : "auto";
    let pdfType = "scanned";
    if (selectedEngine === "auto") {
      pdfType = await detectPdfType(input);
      console.log(`Detected PDF type: ${pdfType}`);
    } else if (selectedEngine === "local") {
      pdfType = "text_heavy";
      console.log("Forced Local Converter via option.");
    } else {
      pdfType = "scanned";
      console.log("Forced Adobe Premium Converter via option.");
    }

    let adobeConverted = false;
    let outDocx: Buffer | null = null;

    if (pdfType !== "text_heavy") {
      const clientId = process.env.ADOBE_CLIENT_ID;
      const clientSecret = process.env.ADOBE_CLIENT_SECRET;
      console.log(`[Adobe Creds Check] Client ID present: ${!!clientId} (${clientId ? clientId.substring(0, 5) + "..." : "N/A"}), Client Secret present: ${!!clientSecret} (length: ${clientSecret ? clientSecret.length : 0})`);
      if (clientId && clientSecret) {
        try {
          console.log("Attempting PDF to Word conversion via Adobe PDF Services API...");
          outDocx = await convertPdfToWordViaAdobe(buffer);
          adobeConverted = true;
          console.log("Adobe PDF Services API conversion successful!");
        } catch (err) {
          console.error("Adobe PDF Services API conversion failed, falling back to local:", err);
        }
      } else {
        console.log("Adobe credentials not set. Using local conversion fallback.");
      }
    } else {
      console.log("PDF is text-heavy. Using fast local conversion.");
    }

    if (adobeConverted && outDocx) {
      return outDocx;
    }

    // ── Strategy 1: Python PyMuPDF & pdf2docx (Primary) ───────────────────
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
import zipfile
import subprocess
import concurrent.futures

input_path = r"${input}"
output_path = r"${outputDocx}"
temp_dir = r"${dir}"

def analyzePdf(doc):
    total_chars = 0
    total_images = 0
    total_drawings = 0
    total_links = 0
    total_tables = 0
    unique_fonts = set()
    total_blocks = 0
    
    pages_count = len(doc)
    is_scanned = True
    has_large_image_or_ocr = False
    
    for page in doc:
        # 1. Text & Paragraph Blocks
        text = page.get_text("text").strip()
        total_chars += len(text)
        if len(text) > 50:
            is_scanned = False
            
        blocks = page.get_text("blocks")
        total_blocks += len(blocks)
        
        # 2. Fonts
        try:
            fonts = page.get_fonts()
            for f in fonts:
                if len(f) > 3 and f[3]:
                    unique_fonts.add(f[3])
        except Exception:
            pass
            
        # 3. Images & Large Image Check
        page_area = page.rect.width * page.rect.height
        imgs = page.get_images(full=True)
        total_images += len(imgs)
        for img_info in imgs:
            xref = img_info[0]
            try:
                rects = page.get_image_rects(xref)
                for r in rects:
                    img_area = r.width * r.height
                    if img_area > 0.85 * page_area:
                        has_large_image_or_ocr = True
            except Exception:
                pass
                
        # 4. Vector Graphics
        drawings = page.get_drawings()
        total_drawings += len(drawings)
        
        # 5. Hyperlinks
        links = page.get_links()
        total_links += len(links)
        
        # 6. Tables
        try:
            tables = page.find_tables()
            total_tables += len(tables.tables)
        except Exception:
            pass
            
    avg_chars = total_chars / pages_count if pages_count > 0 else 0
    
    # Classify PDF type
    if pages_count == 0:
        pdf_type = "scanned"
    elif is_scanned or has_large_image_or_ocr or (total_chars < 100 and total_images > 0):
        pdf_type = "scanned"
    elif total_images == 0 and total_drawings < pages_count * 15 and avg_chars > 300:
        pdf_type = "text_heavy"
    elif total_images > pages_count * 2 or total_drawings > pages_count * 40 or total_tables > 0:
        pdf_type = "graphic_heavy"
    else:
        pdf_type = "mixed"
        
    print("--- Layout & Structure Analysis ---")
    print(f"Total Pages: {pages_count}")
    print(f"Selectable Characters: {total_chars}")
    print(f"Blocks/Paragraphs Detected: {total_blocks}")
    print(f"Images Detected: {total_images}")
    print(f"Vector Graphics (Drawings): {total_drawings}")
    print(f"Tables Detected: {total_tables}")
    print(f"Hyperlinks Detected: {total_links}")
    print(f"Fonts Detected: {list(unique_fonts)}")
    print(f"Classification Strategy: {pdf_type}")
    print("----------------------------------")
    sys.stdout.flush()
    
    return {
        "pdf_type": pdf_type,
        "text_count": total_chars,
        "image_count": total_images,
        "drawing_count": total_drawings,
        "avg_chars": avg_chars
    }

def validateOutput(docx_path):
    if not os.path.exists(docx_path) or os.path.getsize(docx_path) < 1000:
        return False
    try:
        with zipfile.ZipFile(docx_path) as zf:
            if "word/document.xml" not in zf.namelist():
                return False
        return True
    except Exception:
        return False

def convertTextPdf(input_path, output_path):
    from pdf2docx import Converter
    cv = Converter(input_path)
    cv.convert(
        output_path,
        shape_min_dimension=0.1,
        min_svg_w=0.1,
        min_svg_h=0.1,
        float_image_ignorable_gap=0.1
    )
    cv.close()

def generateSearchablePdf(doc, temp_dir, input_path):
    ocr_doc = fitz.open()
    ocr_pdf_path = os.path.join(temp_dir, "ocr_temp.pdf")
    
    for i in range(len(doc)):
        page = doc[i]
        pix = page.get_pixmap(dpi=150)
        if pix.alpha:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        img_path = os.path.join(temp_dir, f"ocr_page_{i}.png")
        pix.save(img_path, "png")
        
        pdf_page_base = os.path.join(temp_dir, f"ocr_page_{i}_pdf")
        pdf_page_file = pdf_page_base + ".pdf"
        
        try:
            subprocess.run(["tesseract", img_path, pdf_page_base, "-l", "eng", "pdf"], check=True)
            if os.path.exists(pdf_page_file):
                with fitz.open(pdf_page_file) as page_doc:
                    ocr_doc.insert_pdf(page_doc)
            else:
                img_doc = fitz.open()
                img_page = img_doc.new_page(width=page.rect.width, height=page.rect.height)
                img_page.insert_image(page.rect, filename=img_path)
                ocr_doc.insert_pdf(img_doc)
                img_doc.close()
        except Exception as e:
            print(f"OCR failed for page {i}: {e}")
            img_doc = fitz.open()
            img_page = img_doc.new_page(width=page.rect.width, height=page.rect.height)
            img_page.insert_image(page.rect, filename=img_path)
            ocr_doc.insert_pdf(img_doc)
            img_doc.close()
            
    ocr_doc.save(ocr_pdf_path)
    ocr_doc.close()
    return ocr_pdf_path

def convertGraphicPdf(doc, output_path, temp_dir, input_path):
    from docx import Document
    from docx.shared import Pt
    from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

    word_doc = Document()
    for i in range(len(doc)):
        page = doc[i]
        w = page.rect.width
        h = page.rect.height
        
        if i > 0:
            section = word_doc.add_section()
        else:
            section = word_doc.sections[0]
            
        section.top_margin = Pt(0)
        section.bottom_margin = Pt(0)
        section.left_margin = Pt(0)
        section.right_margin = Pt(0)
        section.page_width = Pt(w)
        section.page_height = Pt(h)
        
        # Optimized 150 DPI render for smaller file size and faster processing
        pix = page.get_pixmap(dpi=150)
        
        # JPEG doesn't support alpha channel. Convert if present.
        if pix.alpha:
            pix = fitz.Pixmap(fitz.csRGB, pix)
            
        img_path = os.path.join(temp_dir, f"page_{i}.jpg")
        pix.save(img_path, "jpg", jpg_quality=75)
        
        p = word_doc.add_paragraph()
        p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = Pt(0)
        r = p.add_run()
        r.font.size = Pt(1)
        r.add_picture(img_path, width=Pt(w * 0.92))
        
        # Extract page text
        text = page.get_text("text").strip()
        if text:
            p_text = word_doc.add_paragraph()
            p_text.paragraph_format.space_before = Pt(4)
            p_text.paragraph_format.space_after = Pt(4)
            p_text.paragraph_format.line_spacing = Pt(0)
            for line in text.split("\\n"):
                if line.strip():
                    r_text = p_text.add_run(line + "\\n")
                    r_text.font.name = "Arial"
                    r_text.font.size = Pt(10)
        
    word_doc.save(output_path)

def convertScannedPdf(doc, output_path, temp_dir, input_path):
    convertGraphicPdf(doc, output_path, temp_dir, input_path)

try:
    doc = fitz.open(input_path)
    analysis = analyzePdf(doc)
    print(f"PDF Type Detected: {analysis['pdf_type']}")
    print(f"Text Count: {analysis['text_count']}")
    print(f"Image Count: {analysis['image_count']}")
    print(f"Drawing Count: {analysis['drawing_count']}")
    
    strategy = analysis["pdf_type"]
    converted = False
    
    if strategy == "scanned":
        try:
            print("Generating searchable PDF via OCR...")
            ocr_pdf_path = generateSearchablePdf(doc, temp_dir, input_path)
            print("Converting OCR-ed PDF to DOCX...")
            convertTextPdf(ocr_pdf_path, output_path)
            if validateOutput(output_path):
                converted = True
                print("OCR conversion successful.")
        except Exception as e:
            print(f"OCR + pdf2docx failed: {e}. Falling back to default conversion.")
            
    if not converted:
        try:
            print(f"Selected conversion strategy: pdf2docx ({strategy})")
            convertTextPdf(input_path, output_path)
            if validateOutput(output_path):
                converted = True
                print("Validation successful.")
        except Exception as e:
            print(f"pdf2docx failed: {e}. Falling back to graphic mode.")
            
    if not converted:
        print("Falling back to graphic mode.")
        convertScannedPdf(doc, output_path, temp_dir, input_path)
            
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
          await optimizeDocxWithPython(pythonBin, outputDocx);
          return await readFile(outputDocx);
        } catch (err) {
          console.error("Python DOCX conversion error, falling back:", err);
        }
      }
    }

    // ── Strategy 2: LibreOffice PDF to DOCX (Fallback) ───────────────────
    if (await exists("soffice")) {
      try {
        console.log("Attempting LibreOffice PDF to DOCX conversion...");
        await run(
          "soffice",
          [
            "--headless",
            "--norestore",
            "--nofirststartwizard",
            `-env:UserInstallation=file://${join(dir, "profile").replace(/\\/g, "/")}`,
            "--infilter=writer_pdf_import",
            "--convert-to",
            "docx",
            "--outdir",
            dir,
            input,
          ],
          dir
        );
        const files = await readdir(dir);
        const libreOfficeOut = files.find((f) => f.endsWith(".docx"));
        if (libreOfficeOut) {
          const outPath = join(dir, libreOfficeOut);
          const hasPython = (await exists("python3")) || (await exists("python"));
          if (hasPython) {
            const pythonBin = (await exists("python3")) ? "python3" : "python";
            await optimizeDocxWithPython(pythonBin, outPath);
          }
          const docxBuffer = await readFile(outPath);
          if (docxBuffer.length > 2000) {
            console.log("LibreOffice PDF to DOCX conversion successful.");
            return docxBuffer;
          }
        }
      } catch (err) {
        console.error("LibreOffice PDF to DOCX conversion error:", err);
      }
    }

    // ── Strategy 3: Original Text/OCR fallback ──────────────────────────
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
          "--nofirststartwizard",
          `-env:UserInstallation=file://${join(dir, "profile").replace(/\\/g, "/")}`,
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

function getBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return fileName;
  return fileName.slice(0, dotIndex);
}

export async function convertOffice(
  buffer: Buffer,
  targetFormat: string,
  toolSlug: string,
  originalFileName?: string,
  options?: Record<string, unknown>
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const inputExt = guessInputExt(toolSlug, buffer, originalFileName);
  const baseName = originalFileName ? getBaseName(originalFileName) : "converted";
  const outFileName = `${baseName}.${targetFormat}`;

  if (inputExt === ".pdf") {
    if (targetFormat === "docx") {
      const out = await pdfToWord(buffer, options);
      return { buffer: out, mimeType: mimeFor("docx"), fileName: outFileName };
    }
    if (targetFormat === "pptx") {
      const out = await pdfToPowerPoint(buffer);
      return { buffer: out, mimeType: mimeFor("pptx"), fileName: outFileName };
    }
    if (targetFormat === "xlsx") {
      const out = await pdfToExcel(buffer);
      return { buffer: out, mimeType: mimeFor("xlsx"), fileName: outFileName };
    }
  }

  if (targetFormat === "pdf" && (inputExt === ".docx" || inputExt === ".doc" || inputExt === ".pptx" || inputExt === ".ppt" || inputExt === ".xlsx" || inputExt === ".xls")) {
    const selectedEngine = options?.engine ? String(options.engine) : "auto";
    let useAdobe = false;
    if (selectedEngine === "adobe") {
      useAdobe = true;
      console.log("Forced Adobe Premium for Office to PDF conversion.");
    } else if (selectedEngine === "local") {
      useAdobe = false;
      console.log("Forced Local LibreOffice for Office to PDF conversion.");
    } else {
      const officeType = await detectOfficeType(buffer, inputExt);
      useAdobe = (officeType === "graphic_heavy");
      console.log(`Auto-detected Office type: ${officeType}. Routing to Adobe: ${useAdobe}`);
    }

    if (useAdobe) {
      const clientId = process.env.ADOBE_CLIENT_ID;
      const clientSecret = process.env.ADOBE_CLIENT_SECRET;
      console.log(`[Adobe Creds Check] Client ID present: ${!!clientId} (${clientId ? clientId.substring(0, 5) + "..." : "N/A"}), Client Secret present: ${!!clientSecret} (length: ${clientSecret ? clientSecret.length : 0})`);
      if (clientId && clientSecret) {
        try {
          console.log("Attempting Office to PDF conversion via Adobe PDF Services API...");
          const out = await convertOfficeToPdfViaAdobe(buffer, inputExt);
          console.log("Adobe PDF Services API Office to PDF conversion successful!");
          return { buffer: out, mimeType: mimeFor("pdf"), fileName: outFileName };
        } catch (err) {
          console.error("Adobe Office to PDF conversion failed, falling back to local LibreOffice:", err);
        }
      } else {
        console.log("Adobe credentials not set. Using local conversion fallback.");
      }
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
        "--nofirststartwizard",
        `-env:UserInstallation=file://${join(dir, "profile").replace(/\\/g, "/")}`,
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

    let out = await readFile(join(dir, chosen));
    const mime = mimeFor(targetFormat);

    // If we converted to PDF, check if it's scanned (no selectable text but has images)
    // and run OCR if so.
    if (targetFormat === "pdf") {
      const hasPython = (await exists("python3")) || (await exists("python"));
      if (hasPython) {
        const pythonBin = (await exists("python3")) ? "python3" : "python";
        const pdfPath = join(dir, chosen);
        const pyCheckScript = `
import fitz
import sys
try:
    doc = fitz.open(r"${pdfPath.replace(/\\/g, "/")}")
    total_chars = sum(len(page.get_text().strip()) for page in doc)
    has_images = any(len(page.get_images()) > 0 for page in doc)
    print("true" if (total_chars < 150 and has_images) else "false")
except Exception:
    print("false")
`;
        try {
          const stdout = await runWithOutput(pythonBin, ["-c", pyCheckScript]);
          if (stdout.trim() === "true") {
            console.log("Converted PDF contains scanned images/photos with no selectable text. Running OCR to make it searchable...");
            out = await ocrPdf(out as any, "eng") as any;
          }
        } catch (err) {
          console.error("Error checking/OCR-ing converted PDF:", err);
        }
      }
    }

    return { buffer: out, mimeType: mime, fileName: outFileName };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function guessInputExt(toolSlug: string, buffer: Buffer, originalFileName?: string): string {
  if (originalFileName) {
    const ext = originalFileName.slice(originalFileName.lastIndexOf(".")).toLowerCase();
    if (ext && ext.startsWith(".") && ext.length > 1) {
      return ext;
    }
  }
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

