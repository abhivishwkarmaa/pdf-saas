import { PDFDocument, degrees, rgb, StandardFonts, PDFName, PDFArray } from "pdf-lib";

export async function mergePdfs(files: File[], onProgress?: (percent: number) => void): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
    if (onProgress) onProgress(Math.round(((i + 1) / files.length) * 100));
  }
  return blobFromPdf(merged);
}

export async function splitPdf(
  file: File,
  ranges: string,
  onProgress?: (percent: number) => void
): Promise<Blob[]> {
  const buf = await file.arrayBuffer();
  const source = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = source.getPageCount();
  const normalized = ranges.replace(/\s*-\s*/g, "-");
  const parts = normalized.split(/[\s,;]+/).filter(Boolean);
  const outputs: Blob[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const doc = await PDFDocument.create();
    let indices: number[] = [];
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      if (isNaN(a) || isNaN(b)) continue;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let j = start; j <= end; j++) indices.push(j - 1);
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p)) indices = [p - 1];
    }
    indices = indices.filter((idx) => idx >= 0 && idx < total);
    if (indices.length === 0) continue;
    const copied = await doc.copyPages(source, indices);
    copied.forEach((p) => doc.addPage(p));
    outputs.push(await blobFromPdf(doc));
    if (onProgress) onProgress(Math.round(((i + 1) / parts.length) * 100));
  }
  return outputs;
}

export async function removePages(file: File, pages: string): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const source = await PDFDocument.load(buf, { ignoreEncryption: true });
  const remove = parsePages(pages, source.getPageCount());
  const keep = Array.from({ length: source.getPageCount() }, (_, i) => i).filter(
    (i) => !remove.has(i)
  );
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, keep);
  copied.forEach((p) => doc.addPage(p));
  return blobFromPdf(doc);
}

export async function extractPages(file: File, pages: string): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const source = await PDFDocument.load(buf, { ignoreEncryption: true });
  const indices = [...parsePages(pages, source.getPageCount())].sort((a, b) => a - b);
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, indices);
  copied.forEach((p) => doc.addPage(p));
  return blobFromPdf(doc);
}

export async function organizePdf(file: File, order: string): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const source = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = source.getPageCount();
  const doc = await PDFDocument.create();

  const normalized = order.replace(/\s*-\s*/g, "-");
  const parts = normalized.split(/[\s,;]+/).filter(Boolean);

  for (const part of parts) {
    const clean = part.toLowerCase().trim();
    if (clean === "b" || clean === "blank") {
      if (total > 0) {
        const firstPage = source.getPages()[0];
        const { width, height } = firstPage.getSize();
        doc.addPage([width, height]);
      } else {
        doc.addPage([612, 792]);
      }
    } else {
      const idx = parseInt(clean, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < total) {
        const [copied] = await doc.copyPages(source, [idx]);
        doc.addPage(copied);
      }
    }
  }

  return blobFromPdf(doc);
}

export async function rotatePdf(
  file: File,
  angle: 90 | 180 | 270,
  pages?: string
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const defaultRot = degrees(angle);

  const total = doc.getPageCount();

  if (pages && pages.trim()) {
    const normalized = pages.replace(/\s*-\s*/g, "-").replace(/\s*:\s*/g, ":");
    const parts = normalized.split(/[\s,;]+/).filter(Boolean);

    for (const part of parts) {
      if (part.includes(":")) {
        const [pagePart, anglePart] = part.split(":");
        const pageAngle = parseInt(anglePart, 10);
        if (pageAngle !== 90 && pageAngle !== 180 && pageAngle !== 270) continue;
        const pageRot = degrees(pageAngle);

        const targetPages = parsePages(pagePart, total);
        doc.getPages().forEach((page, i) => {
          if (targetPages.has(i)) {
            page.setRotation(pageRot);
          }
        });
      } else {
        const targetPages = parsePages(part, total);
        doc.getPages().forEach((page, i) => {
          if (targetPages.has(i)) {
            page.setRotation(defaultRot);
          }
        });
      }
    }
  } else {
    doc.getPages().forEach((page) => page.setRotation(defaultRot));
  }

  return blobFromPdf(doc);
}

export async function imagesToPdf(
  files: File[],
  options: Record<string, string> = {},
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const pageSize = options.pageSize || "a4";
  const orientation = options.orientation || "portrait";
  const marginStr = options.margin || "none";

  let margin = 0;
  if (marginStr === "small") margin = 20;
  else if (marginStr === "big") margin = 50;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buf = new Uint8Array(await file.arrayBuffer());
    const image =
      file.type === "image/png"
        ? await doc.embedPng(buf)
        : await doc.embedJpg(buf);

    const imgWidth = image.width;
    const imgHeight = image.height;

    let pageWidth = imgWidth;
    let pageHeight = imgHeight;

    if (pageSize === "a4") {
      pageWidth = orientation === "landscape" ? 841.89 : 595.28;
      pageHeight = orientation === "landscape" ? 595.28 : 841.89;
    } else if (pageSize === "letter") {
      pageWidth = orientation === "landscape" ? 792 : 612;
      pageHeight = orientation === "landscape" ? 612 : 792;
    } else if (pageSize === "fit") {
      pageWidth = imgWidth + 2 * margin;
      pageHeight = imgHeight + 2 * margin;
    }

    const page = doc.addPage([pageWidth, pageHeight]);

    const printableWidth = pageWidth - 2 * margin;
    const printableHeight = pageHeight - 2 * margin;

    const scale = Math.min(printableWidth / imgWidth, printableHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    const x = margin + (printableWidth - drawWidth) / 2;
    const y = margin + (printableHeight - drawHeight) / 2;

    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
    if (onProgress) onProgress(Math.round(((i + 1) / files.length) * 100));
  }
  return blobFromPdf(doc);
}

export interface WatermarkOptions {
  watermarkType: "text" | "image";
  text: string;
  fontFamily: "Helvetica" | "HelveticaBold" | "TimesRoman" | "TimesRomanBold" | "Courier" | "CourierBold";
  fontSize: number;
  opacity: number;
  rotation: number;
  color: string;
  position:
    | "top-left"
    | "top-center"
    | "top-right"
    | "middle-left"
    | "middle-center"
    | "middle-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  layer: "over" | "under";
  pageRangeType: "all" | "odd" | "even" | "custom";
  customRange?: string;
  imageFile?: File;
  imageScale?: number;
}

export async function watermarkPdf(
  file: File,
  text: string,
  options?: Partial<WatermarkOptions>
): Promise<Blob> {
  const opt: WatermarkOptions = {
    watermarkType: options?.watermarkType || "text",
    text: text || "CONFIDENTIAL",
    fontFamily: (options?.fontFamily || "HelveticaBold") as any,
    fontSize: options?.fontSize !== undefined ? options.fontSize : 36,
    opacity: options?.opacity !== undefined ? options.opacity : 0.35,
    rotation: options?.rotation !== undefined ? options.rotation : -45,
    color: options?.color || "#cccccc",
    position: options?.position || "middle-center",
    layer: options?.layer || "over",
    pageRangeType: options?.pageRangeType || "all",
    customRange: options?.customRange || "",
    imageFile: options?.imageFile,
    imageScale: options?.imageScale !== undefined ? options.imageScale : 100,
  };

  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });

  let embeddedImage: any = null;
  if (opt.watermarkType === "image" && opt.imageFile) {
    const imgBuf = await opt.imageFile.arrayBuffer();
    embeddedImage =
      opt.imageFile.type === "image/png"
        ? await doc.embedPng(imgBuf)
        : await doc.embedJpg(imgBuf);
  }

  let fontRef = StandardFonts.HelveticaBold;
  if (opt.fontFamily === "Helvetica") fontRef = StandardFonts.Helvetica;
  else if (opt.fontFamily === "TimesRoman") fontRef = StandardFonts.TimesRoman;
  else if (opt.fontFamily === "TimesRomanBold") fontRef = StandardFonts.TimesRomanBold;
  else if (opt.fontFamily === "Courier") fontRef = StandardFonts.Courier;
  else if (opt.fontFamily === "CourierBold") fontRef = StandardFonts.CourierBold;

  const font = await doc.embedFont(fontRef);

  const hex = opt.color.replace("#", "");
  const r = (parseInt(hex.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(hex.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(hex.substring(4, 6), 16) || 0) / 255;
  const color = rgb(r, g, b);

  const total = doc.getPageCount();
  let targetPages = new Set<number>();
  if (opt.pageRangeType === "all") {
    for (let i = 0; i < total; i++) targetPages.add(i);
  } else if (opt.pageRangeType === "odd") {
    for (let i = 0; i < total; i++) {
      if ((i + 1) % 2 !== 0) targetPages.add(i);
    }
  } else if (opt.pageRangeType === "even") {
    for (let i = 0; i < total; i++) {
      if ((i + 1) % 2 === 0) targetPages.add(i);
    }
  } else if (opt.pageRangeType === "custom" && opt.customRange) {
    targetPages = parsePages(opt.customRange, total);
  }

  doc.getPages().forEach((page, i) => {
    if (!targetPages.has(i)) return;

    const { width, height } = page.getSize();

    let cx = width / 2;
    let cy = height / 2;
    const margin = 40;

    if (opt.position.startsWith("top")) {
      cy = height - margin;
    } else if (opt.position.startsWith("middle")) {
      cy = height / 2;
    } else if (opt.position.startsWith("bottom")) {
      cy = margin;
    }

    if (opt.position.endsWith("left")) {
      cx = margin;
    } else if (opt.position.endsWith("center")) {
      cx = width / 2;
    } else if (opt.position.endsWith("right")) {
      cx = width - margin;
    }

    const pdfRotation = -opt.rotation;
    const rad = (pdfRotation * Math.PI) / 180;

    if (opt.watermarkType === "image" && embeddedImage) {
      const basePdfWidth = width * 0.28;
      const imgWidth = basePdfWidth * (opt.imageScale! / 100);
      const aspect = embeddedImage.height / embeddedImage.width;
      const imgHeight = imgWidth * aspect;

      const x = cx - (imgWidth / 2) * Math.cos(rad) + (imgHeight / 2) * Math.sin(rad);
      const y = cy - (imgWidth / 2) * Math.sin(rad) - (imgHeight / 2) * Math.cos(rad);

      const drawOptions = {
        x,
        y,
        width: imgWidth,
        height: imgHeight,
        opacity: opt.opacity,
        rotate: degrees(pdfRotation),
      };

      if (opt.layer === "under") {
        (page as any).getContentStream(false);
        page.drawImage(embeddedImage, drawOptions);
        const contents = page.node.get(PDFName.of("Contents"));
        if (contents instanceof PDFArray) {
          const lastIndex = contents.size() - 1;
          const lastStreamRef = contents.get(lastIndex);
          contents.remove(lastIndex);
          if (lastStreamRef) {
            contents.insert(0, lastStreamRef);
          }
        }
      } else {
        page.drawImage(embeddedImage, drawOptions);
      }
    } else {
      const textWidth = font.widthOfTextAtSize(opt.text, opt.fontSize);
      const textHeight = opt.fontSize * 0.8;

      const x = cx - (textWidth / 2) * Math.cos(rad) + (textHeight / 2) * Math.sin(rad);
      const y = cy - (textWidth / 2) * Math.sin(rad) - (textHeight / 2) * Math.cos(rad);

      const drawOptions = {
        x,
        y,
        size: opt.fontSize,
        font,
        color,
        opacity: opt.opacity,
        rotate: degrees(pdfRotation),
      };

      if (opt.layer === "under") {
        (page as any).getContentStream(false);
        page.drawText(opt.text, drawOptions);
        const contents = page.node.get(PDFName.of("Contents"));
        if (contents instanceof PDFArray) {
          const lastIndex = contents.size() - 1;
          const lastStreamRef = contents.get(lastIndex);
          contents.remove(lastIndex);
          if (lastStreamRef) {
            contents.insert(0, lastStreamRef);
          }
        }
      } else {
        page.drawText(opt.text, drawOptions);
      }
    }
  });

  return blobFromPdf(doc);
}

export interface PageNumberOptions {
  position?: "top-left" | "top-center" | "top-right" | "middle-left" | "middle-center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";
  margin?: number;
  style?: "1,2,3" | "i,ii,iii" | "I,II,III" | "a,b,c" | "A,B,C";
  startNumber?: number;
  prefix?: string;
  suffix?: string;
  fontFamily?: "Helvetica" | "TimesRoman" | "Courier";
  fontSize?: number;
  color?: string;
  pageRangeType?: "all" | "odd" | "even" | "custom";
  customRange?: string;
}

export async function addPageNumbers(file: File, options: PageNumberOptions = {}): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  
  const fontRef = 
    options.fontFamily === "TimesRoman" ? StandardFonts.TimesRoman :
    options.fontFamily === "Courier" ? StandardFonts.Courier :
    StandardFonts.Helvetica;
  const font = await doc.embedFont(fontRef);

  // Parse color (default black)
  let textColor = rgb(0.1, 0.1, 0.1);
  if (options.color && options.color.startsWith("#") && options.color.length === 7) {
    const r = parseInt(options.color.slice(1, 3), 16) / 255;
    const g = parseInt(options.color.slice(3, 5), 16) / 255;
    const b = parseInt(options.color.slice(5, 7), 16) / 255;
    textColor = rgb(r, g, b);
  }

  const allPages = doc.getPages();
  const totalCount = allPages.length;

  allPages.forEach((page, i) => {
    const pageNum = i + 1;

    // Check page filter
    if (options.pageRangeType === "odd" && pageNum % 2 === 0) return;
    if (options.pageRangeType === "even" && pageNum % 2 !== 0) return;
    if (options.pageRangeType === "custom" && options.customRange) {
      const allowed = parsePageRange(options.customRange, totalCount);
      if (!allowed.includes(pageNum)) return;
    }

    const { width, height } = page.getSize();
    const rawPrefix = (options.prefix || "").replace(/\{total\}/gi, String(totalCount));
    const rawSuffix = (options.suffix || "").replace(/\{total\}/gi, String(totalCount));

    const text = formatPageNumber(
      i,
      options.startNumber || 1,
      options.style || "1,2,3",
      rawPrefix,
      rawSuffix
    );
    const textWidth = font.widthOfTextAtSize(text, options.fontSize || 12);
    const textHeight = (options.fontSize || 12) * 0.8; // approximate cap height

    const m = options.margin !== undefined ? options.margin : 30;
    let x = width / 2 - textWidth / 2;
    let y = m;

    const pos = options.position || "bottom-center";
    
    // Y-coordinate calculation (PDF-lib origin is bottom-left)
    if (pos.startsWith("top")) {
      y = height - m - textHeight;
    } else if (pos.startsWith("middle")) {
      y = height / 2 - textHeight / 2;
    } else { // bottom
      y = m;
    }

    // X-coordinate calculation
    if (pos.endsWith("left")) {
      x = m;
    } else if (pos.endsWith("center")) {
      x = width / 2 - textWidth / 2;
    } else { // right
      x = width - m - textWidth;
    }

    page.drawText(text, {
      x,
      y,
      size: options.fontSize || 12,
      font,
      color: textColor,
    });
  });

  return blobFromPdf(doc);
}

function parsePageRange(rangeStr: string, totalPages: number): number[] {
  const pages: Set<number> = new Set();
  const parts = rangeStr.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(totalPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          pages.add(i);
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pages.add(pageNum);
      }
    }
  }
  return Array.from(pages);
}

function formatPageNumber(pageIndex: number, startNumber: number, style: string, prefix: string, suffix: string): string {
  const num = pageIndex + startNumber;
  let formatted = "";

  if (style === "1,2,3") {
    formatted = String(num);
  } else if (style === "i,ii,iii") {
    formatted = toRoman(num).toLowerCase();
  } else if (style === "I,II,III") {
    formatted = toRoman(num);
  } else if (style === "a,b,c") {
    formatted = toAlpha(num).toLowerCase();
  } else if (style === "A,B,C") {
    formatted = toAlpha(num);
  } else {
    formatted = String(num);
  }

  return `${prefix}${formatted}${suffix}`;
}

function toRoman(num: number): string {
  const lookup: Record<string, number> = {
    M: 1000, CM: 900, D: 500, CD: 400,
    C: 100, XC: 90, L: 50, XL: 40,
    X: 10, IX: 9, V: 5, IV: 4, I: 1
  };
  let roman = "";
  let n = num;
  for (const i in lookup) {
    while (n >= lookup[i]) {
      roman += i;
      n -= lookup[i];
    }
  }
  return roman || "0";
}

function toAlpha(num: number): string {
  let temp = num;
  let alpha = "";
  while (temp > 0) {
    const m = (temp - 1) % 26;
    alpha = String.fromCharCode(65 + m) + alpha;
    temp = Math.floor((temp - m) / 26);
  }
  return alpha || "A";
}

export interface TextToPdfOptions {
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  fontFamily?: "Helvetica" | "TimesRoman" | "Courier";
  fontSize?: number;
  lineSpacing?: number;
  margin?: number;
}

export async function txtToPdf(
  input: File | string,
  options: TextToPdfOptions = {}
): Promise<Blob> {
  const text = typeof input === "string" ? input : await input.text();
  const doc = await PDFDocument.create();

  let fontRef = StandardFonts.Helvetica;
  let fontBoldRef = StandardFonts.HelveticaBold;
  let fontObliqueRef = StandardFonts.HelveticaOblique;

  if (options.fontFamily === "TimesRoman") {
    fontRef = StandardFonts.TimesRoman;
    fontBoldRef = StandardFonts.TimesRomanBold;
    fontObliqueRef = StandardFonts.TimesRomanItalic;
  } else if (options.fontFamily === "Courier") {
    fontRef = StandardFonts.Courier;
    fontBoldRef = StandardFonts.CourierBold;
    fontObliqueRef = StandardFonts.CourierOblique;
  }

  const font = await doc.embedFont(fontRef);
  const fontBold = await doc.embedFont(fontBoldRef);
  const fontOblique = await doc.embedFont(fontObliqueRef);

  let [baseWidth, baseHeight] = [612, 792]; // Letter default
  if (options.pageSize === "A4") {
    [baseWidth, baseHeight] = [595.28, 841.89];
  } else if (options.pageSize === "Legal") {
    [baseWidth, baseHeight] = [612, 1008];
  }

  const isLandscape = options.orientation === "landscape";
  const pageWidth = isLandscape ? baseHeight : baseWidth;
  const pageHeight = isLandscape ? baseWidth : baseHeight;

  const margin = options.margin !== undefined ? options.margin : 50;
  const baseFontSize = options.fontSize || 11;
  const spacingMultiplier = options.lineSpacing || 1.3;
  const baseLineHeight = baseFontSize * spacingMultiplier;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const rawLines = text.split("\n");

  for (let rawLine of rawLines) {
    const cleanLine = rawLine.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");

    if (!cleanLine.trim()) {
      if (y < margin + baseLineHeight) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      y -= baseLineHeight;
      continue;
    }

    let lineText = cleanLine;
    let currentFont = font;
    let currentFontSize = baseFontSize;
    let isQuote = false;
    let isHeading = false;
    let indentX = margin;

    // Headings
    if (lineText.startsWith("# ")) {
      lineText = lineText.slice(2).trim();
      currentFont = fontBold;
      currentFontSize = baseFontSize * 1.45;
      isHeading = true;
    } else if (lineText.startsWith("## ")) {
      lineText = lineText.slice(3).trim();
      currentFont = fontBold;
      currentFontSize = baseFontSize * 1.25;
      isHeading = true;
    } else if (lineText.startsWith("### ")) {
      lineText = lineText.slice(4).trim();
      currentFont = fontBold;
      currentFontSize = baseFontSize * 1.1;
      isHeading = true;
    } else if (lineText.startsWith("> ")) {
      lineText = lineText.slice(2).trim();
      currentFont = fontOblique;
      isQuote = true;
      indentX = margin + 14;
    } else if (lineText.startsWith("- ") || lineText.startsWith("* ")) {
      lineText = "•  " + lineText.slice(2).trim();
      indentX = margin + 10;
    }

    // Strip inline bold/italic markers (** or *) for clean pdf rendering
    const hasBoldInline = lineText.includes("**");
    const hasItalicInline = lineText.includes("*");

    let activeFont = currentFont;
    if (!isHeading && !isQuote) {
      if (hasBoldInline) {
        activeFont = fontBold;
        lineText = lineText.replace(/\*\*/g, "");
      } else if (hasItalicInline) {
        activeFont = fontOblique;
        lineText = lineText.replace(/\*/g, "");
      }
    } else {
      lineText = lineText.replace(/\*\*/g, "").replace(/\*/g, "");
    }

    // Strip backticks or quotes
    lineText = lineText.replace(/`/g, "");

    const currentLineHeight = currentFontSize * spacingMultiplier;
    const currentMaxWidth = pageWidth - indentX - margin;

    // Extra spacing before heading
    if (isHeading && y < pageHeight - margin - 20) {
      y -= 6;
    }

    // Draw Quote bar if quote
    if (isQuote) {
      page.drawLine({
        start: { x: margin + 4, y: y + 2 },
        end: { x: margin + 4, y: y - currentLineHeight + 4 },
        thickness: 2.5,
        color: rgb(0.55, 0.35, 0.95), // Violet accent line
      });
    }

    // Word wrapping logic
    const words = lineText.split(" ");
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = activeFont.widthOfTextAtSize(testLine, currentFontSize);

      if (testWidth <= currentMaxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          if (y < margin + currentLineHeight) {
            page = doc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(currentLine, {
            x: indentX,
            y,
            size: currentFontSize,
            font: activeFont,
            color: isQuote ? rgb(0.3, 0.3, 0.35) : rgb(0.1, 0.1, 0.1),
          });
          y -= currentLineHeight;
        }

        if (activeFont.widthOfTextAtSize(word, currentFontSize) > currentMaxWidth) {
          let charLine = "";
          for (const char of word) {
            if (activeFont.widthOfTextAtSize(charLine + char, currentFontSize) <= currentMaxWidth) {
              charLine += char;
            } else {
              if (y < margin + currentLineHeight) {
                page = doc.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
              }
              page.drawText(charLine, {
                x: indentX,
                y,
                size: currentFontSize,
                font: activeFont,
                color: isQuote ? rgb(0.3, 0.3, 0.35) : rgb(0.1, 0.1, 0.1),
              });
              y -= currentLineHeight;
              charLine = char;
            }
          }
          currentLine = charLine;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      if (y < margin + currentLineHeight) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(currentLine, {
        x: indentX,
        y,
        size: currentFontSize,
        font: activeFont,
        color: isQuote ? rgb(0.3, 0.3, 0.35) : rgb(0.1, 0.1, 0.1),
      });
      y -= currentLineHeight;
    }
  }

  return blobFromPdf(doc);
}

export async function cropPdf(
  file: File,
  options?: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    pages?: Set<number>;
    rotations?: Record<number, number>; // page index -> rotation angle (0, 90, 180, 270)
  }
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();

  const opt = options || {
    xPercent: 10,
    yPercent: 10,
    widthPercent: 80,
    heightPercent: 80,
  };

  doc.getPages().forEach((page, i) => {
    if (!opt.pages || opt.pages.has(i)) {
      const { width, height } = page.getSize();
      const x = (opt.xPercent / 100) * width;
      const w = (opt.widthPercent / 100) * width;
      const h = (opt.heightPercent / 100) * height;
      const y = (1 - (opt.yPercent + opt.heightPercent) / 100) * height;
      page.setCropBox(x, y, w, h);
    }
    if (opt.rotations && opt.rotations[i] !== undefined) {
      page.setRotation(degrees(opt.rotations[i]));
    }
  });

  return blobFromPdf(doc);
}

export interface RedactRegion {
  pageIndex: number; // 0-based
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export async function redactPdf(
  file: File,
  regions: RedactRegion[]
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();

  for (const region of regions) {
    if (region.pageIndex < 0 || region.pageIndex >= total) continue;
    const page = doc.getPage(region.pageIndex);
    const { width, height } = page.getSize();

    const x = (region.xPercent / 100) * width;
    const w = (region.widthPercent / 100) * width;
    const h = (region.heightPercent / 100) * height;
    const y = (1 - (region.yPercent + region.heightPercent) / 100) * height;

    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: rgb(0, 0, 0),
    });
  }

  return blobFromPdf(doc);
}


export async function signPdf(files: File[]): Promise<Blob> {
  if (files.length < 2) {
    throw new Error("Please upload both a PDF and a signature image.");
  }
  const pdfFile = files.find((f) => f.type === "application/pdf");
  const imgFile = files.find((f) => f.type.startsWith("image/"));
  if (!pdfFile || !imgFile) {
    throw new Error("Please upload one PDF file and one image file.");
  }
  const pdfBuf = await pdfFile.arrayBuffer();
  const imgBuf = await imgFile.arrayBuffer();
  const doc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
  const image =
    imgFile.type === "image/png"
      ? await doc.embedPng(imgBuf)
      : await doc.embedJpg(imgBuf);
  const pages = doc.getPages();
  if (pages.length > 0) {
    const firstPage = pages[0];
    const { width } = firstPage.getSize();
    firstPage.drawImage(image, {
      x: width - 200,
      y: 50,
      width: 150,
      height: 75,
    });
  }
  return blobFromPdf(doc);
}

export interface PlacedSignature {
  pageIndex: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  signatureDataUrl: string;
}

export async function signPdfAdvanced(
  file: File,
  signatures: PlacedSignature[]
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();

  for (const sig of signatures) {
    if (sig.pageIndex < 0 || sig.pageIndex >= total) continue;

    const isJpg = sig.signatureDataUrl.startsWith("data:image/jpeg") || sig.signatureDataUrl.startsWith("data:image/jpg");
    const base64Data = sig.signatureDataUrl.split(",")[1];
    const binary = window.atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const embeddedImg = isJpg
      ? await doc.embedJpg(bytes)
      : await doc.embedPng(bytes);
    const page = doc.getPage(sig.pageIndex);
    const { width, height } = page.getSize();

    const x = (sig.xPercent / 100) * width;
    const w = (sig.widthPercent / 100) * width;
    const h = (sig.heightPercent / 100) * height;
    const y = (1 - (sig.yPercent + sig.heightPercent) / 100) * height;

    page.drawImage(embeddedImg, {
      x,
      y,
      width: w,
      height: h,
    });
  }

  return blobFromPdf(doc);
}

function parsePages(pages: string, total: number): Set<number> {
  const set = new Set<number>();
  const normalized = pages.replace(/\s*-\s*/g, "-");
  const parts = normalized.split(/[\s,;]+/).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      if (isNaN(a) || isNaN(b)) continue;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= total) set.add(i - 1);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= total) {
        set.add(p - 1);
      }
    }
  }
  return set;
}

async function blobFromPdf(doc: PDFDocument): Promise<Blob> {
  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
