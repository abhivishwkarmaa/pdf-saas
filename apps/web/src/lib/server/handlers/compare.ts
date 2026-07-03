import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { mkdtemp, writeFile, readFile, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../exec";
import * as Diff from "diff";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

function adjustPngSize(png: PNG, targetWidth: number, targetHeight: number): PNG {
  if (png.width === targetWidth && png.height === targetHeight) {
    return png;
  }
  const newPng = new PNG({ width: targetWidth, height: targetHeight });
  // Fill with white
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const idx = (targetWidth * y + x) << 2;
      newPng.data[idx] = 255;
      newPng.data[idx+1] = 255;
      newPng.data[idx+2] = 255;
      newPng.data[idx+3] = 255;
    }
  }
  // Copy original
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const srcIdx = (png.width * y + x) << 2;
      const destIdx = (targetWidth * y + x) << 2;
      newPng.data[destIdx] = png.data[srcIdx];
      newPng.data[destIdx+1] = png.data[srcIdx+1];
      newPng.data[destIdx+2] = png.data[srcIdx+2];
      newPng.data[destIdx+3] = png.data[srcIdx+3];
    }
  }
  return newPng;
}

interface WrapTextChunk {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface WrapOptions {
  report: PDFDocument;
  pageWidth: number;
  pageHeight: number;
  margin: number;
}

function wrapAndDrawText(
  page: any,
  font: any,
  fontSize: number,
  startX: number,
  startY: number,
  maxWidth: number,
  chunks: WrapTextChunk[],
  options: WrapOptions
) {
  let currentPage = page;
  let currentX = startX;
  let currentY = startY;
  const lineHeight = fontSize * 1.4;

  const checkPageOverflow = (neededHeight: number) => {
    if (currentY - neededHeight < options.margin) {
      currentPage = options.report.addPage([options.pageWidth, options.pageHeight]);
      currentX = options.margin;
      currentY = options.pageHeight - options.margin;
      return true;
    }
    return false;
  };

  for (const chunk of chunks) {
    const text = chunk.value;
    const isAdded = chunk.added;
    const isRemoved = chunk.removed;

    // Split text by spaces and other whitespace, keeping delimiters
    const tokens = text.split(/(\s+)/);

    for (const token of tokens) {
      if (token === "\n" || token === "\r\n") {
        currentX = startX;
        currentY -= lineHeight;
        checkPageOverflow(lineHeight);
        continue;
      }
      if (token === "") continue;

      if (token.includes("\n")) {
        const parts = token.split("\n");
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            currentX = startX;
            currentY -= lineHeight;
            checkPageOverflow(lineHeight);
          }
          if (parts[i]) {
            drawToken(parts[i]);
          }
        }
        continue;
      }

      drawToken(token);
    }

    function drawToken(t: string) {
      let widthOfText = font.widthOfTextAtSize(t, fontSize);
      
      // If token is too long for the rest of the line, wrap it
      if (currentX + widthOfText > startX + maxWidth) {
        currentX = startX;
        currentY -= lineHeight;
        checkPageOverflow(lineHeight);
      }

      // If a single word is extremely long and exceeds maxWidth, split/wrap it character by character
      if (widthOfText > maxWidth) {
        for (let i = 0; i < t.length; i++) {
          const char = t[i];
          const charW = font.widthOfTextAtSize(char, fontSize);
          if (currentX + charW > startX + maxWidth) {
            currentX = startX;
            currentY -= lineHeight;
            checkPageOverflow(lineHeight);
          }
          drawSingleChar(char, charW);
        }
        return;
      }

      drawSingleChar(t, widthOfText);
    }

    function drawSingleChar(t: string, widthOfText: number) {
      let textColor = rgb(0.1, 0.1, 0.1);
      let bgColor = null;

      if (isAdded) {
        textColor = rgb(0.05, 0.4, 0.05); // Dark Green
        bgColor = rgb(0.85, 0.95, 0.85); // Light Green
      } else if (isRemoved) {
        textColor = rgb(0.7, 0.05, 0.05); // Dark Red
        bgColor = rgb(0.98, 0.85, 0.85); // Light Red
      }

      if (bgColor) {
        currentPage.drawRectangle({
          x: currentX,
          y: currentY - 2,
          width: widthOfText,
          height: fontSize + 4,
          color: bgColor,
        });
      }

      currentPage.drawText(t, {
        x: currentX,
        y: currentY,
        size: fontSize,
        font: font,
        color: textColor,
      });

      currentX += widthOfText;
    }
  }

  return { lastPage: currentPage, lastX: currentX, lastY: currentY };
}

async function buildPdfReport(
  mode: "semantic" | "visual",
  pagesA: number,
  pagesB: number,
  matchPercent: number,
  semanticDiffs?: any[],
  visualDiffs?: { pageIndex: number; diffBuf: Buffer }[]
): Promise<Buffer> {
  const report = await PDFDocument.create();
  const font = await report.embedFont(StandardFonts.Helvetica);
  const fontBold = await report.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await report.embedFont(StandardFonts.Courier);

  // Cover page / Summary page
  const page = report.addPage([612, 792]);

  // Title block
  page.drawRectangle({
    x: 0,
    y: 710,
    width: 612,
    height: 82,
    color: rgb(0.95, 0.95, 0.97)
  });

  page.drawText("PDF COMPARISON REPORT", { x: 50, y: 745, size: 22, font: fontBold, color: rgb(0.7, 0.1, 0.1) });
  page.drawText(`Generated on: ${new Date().toLocaleString()}`, { x: 50, y: 725, size: 9, font, color: rgb(0.4, 0.4, 0.4) });

  page.drawText("Document Summary", { x: 50, y: 640, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
  page.drawText(`Document A (Original) Page Count: ${pagesA}`, { x: 50, y: 610, size: 11, font });
  page.drawText(`Document B (Modified) Page Count: ${pagesB}`, { x: 50, y: 590, size: 11, font });
  page.drawText(`Similarity Estimate: ${matchPercent}%`, {
    x: 50,
    y: 560,
    size: 13,
    font: fontBold,
    color: matchPercent > 80 ? rgb(0.1, 0.5, 0.1) : rgb(0.8, 0.3, 0.1),
  });

  page.drawText("Comparison Setup", { x: 50, y: 510, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
  const modeDesc = mode === "visual" ? "Visual Content Pixel Overlay" : "Semantic Text Compare";
  page.drawText(`Comparison Mode: ${modeDesc}`, { x: 50, y: 485, size: 11, font });

  let detailsY = 450;
  if (pagesA !== pagesB) {
    page.drawText(`Warning: Page counts do not match. Difference of ${Math.abs(pagesA - pagesB)} page(s) detected.`, {
      x: 50,
      y: detailsY,
      size: 11,
      font,
      color: rgb(0.9, 0.1, 0.1),
    });
    detailsY -= 25;
  }

  page.drawText("Note: Detailed comparison pages follow this summary.", {
    x: 50,
    y: detailsY,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
    maxWidth: 500,
  });

  if (mode === "visual" && visualDiffs) {
    for (const diff of visualDiffs) {
      const pageDiff = report.addPage([612, 792]);
      pageDiff.drawText(`Visual Diff Overlay — Page ${diff.pageIndex + 1}`, { x: 50, y: 750, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
      
      const embedded = await report.embedPng(diff.diffBuf);
      const maxWidth = 512;
      const maxHeight = 620;
      const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height);
      const drawWidth = embedded.width * scale;
      const drawHeight = embedded.height * scale;

      pageDiff.drawImage(embedded, {
        x: 50 + (maxWidth - drawWidth) / 2,
        y: 80 + (maxHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    }
  } else if (mode === "semantic" && semanticDiffs) {
    let currentPage = report.addPage([612, 792]);
    let currentY = 740;

    for (const pageDiff of semanticDiffs) {
      if (currentY < 150) {
        currentPage = report.addPage([612, 792]);
        currentY = 740;
      }
      currentPage.drawText(`Semantic Differences — Page ${pageDiff.pageIndex + 1}`, { x: 50, y: currentY, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
      currentY -= 20;

      const result = wrapAndDrawText(
        currentPage,
        fontMono,
        8,
        50,
        currentY,
        512,
        pageDiff.diffs,
        {
          report,
          pageWidth: 612,
          pageHeight: 792,
          margin: 50
        }
      );
      currentPage = result.lastPage;
      currentY = result.lastY - 35;
    }
  }

  return Buffer.from(await report.save());
}

export async function comparePdfs(
  a: Buffer,
  b: Buffer,
  options: Record<string, unknown> = {}
): Promise<{ report: Buffer; matchPercent: number; mimeType?: string }> {
  const docA = await PDFDocument.load(a, { ignoreEncryption: true });
  const docB = await PDFDocument.load(b, { ignoreEncryption: true });
  const pagesA = docA.getPageCount();
  const pagesB = docB.getPageCount();

  const matchPercent =
    pagesA === pagesB
      ? 100
      : Math.round(
          (Math.min(pagesA, pagesB) / Math.max(pagesA, pagesB)) * 100
        );

  const downloadReport = options.downloadReport === "true" || options.downloadReport === true;

  const dir = await mkdtemp(join(tmpdir(), "pdf-compare-"));
  const inputA = join(dir, "a.pdf");
  const inputB = join(dir, "b.pdf");

  try {
    await writeFile(inputA, a);
    await writeFile(inputB, b);

    if (options.mode === "visual") {
      if (!(await exists("pdftoppm"))) {
        throw new Error("pdftoppm is not available on this server.");
      }

      await run("pdftoppm", ["-png", "-r", "72", inputA, join(dir, "pageA")], dir);
      await run("pdftoppm", ["-png", "-r", "72", inputB, join(dir, "pageB")], dir);

      const files = await readdir(dir);
      const filesA = files.filter(f => f.startsWith("pageA-") && f.endsWith(".png"))
        .sort((x, y) => {
          const numX = parseInt(x.match(/\d+/)?.[0] || "0", 10);
          const numY = parseInt(y.match(/\d+/)?.[0] || "0", 10);
          return numX - numY;
        });
      const filesB = files.filter(f => f.startsWith("pageB-") && f.endsWith(".png"))
        .sort((x, y) => {
          const numX = parseInt(x.match(/\d+/)?.[0] || "0", 10);
          const numY = parseInt(y.match(/\d+/)?.[0] || "0", 10);
          return numX - numY;
        });

      const maxPages = Math.max(filesA.length, filesB.length);
      const visualDiffs = [];
      const visualDiffBuffers: { pageIndex: number; diffBuf: Buffer }[] = [];

      for (let i = 0; i < maxPages; i++) {
        const fileA = filesA[i] ? join(dir, filesA[i]) : null;
        const fileB = filesB[i] ? join(dir, filesB[i]) : null;

        let imgBase64A = "";
        let imgBase64B = "";
        let imgBase64Diff = "";

        let pngA: PNG | null = null;
        let pngB: PNG | null = null;

        if (fileA) {
          const bufA = await readFile(fileA);
          imgBase64A = `data:image/png;base64,${bufA.toString("base64")}`;
          pngA = PNG.sync.read(bufA);
        }
        if (fileB) {
          const bufB = await readFile(fileB);
          imgBase64B = `data:image/png;base64,${bufB.toString("base64")}`;
          pngB = PNG.sync.read(bufB);
        }

        const targetW = Math.max(pngA?.width || 360, pngB?.width || 360);
        const targetH = Math.max(pngA?.height || 480, pngB?.height || 480);

        const canvasA = pngA ? adjustPngSize(pngA, targetW, targetH) : new PNG({ width: targetW, height: targetH });
        const canvasB = pngB ? adjustPngSize(pngB, targetW, targetH) : new PNG({ width: targetW, height: targetH });

        const diffPng = new PNG({ width: targetW, height: targetH });
        pixelmatch(canvasA.data, canvasB.data, diffPng.data, targetW, targetH, { threshold: 0.1 });

        const diffBuf = PNG.sync.write(diffPng);
        imgBase64Diff = `data:image/png;base64,${diffBuf.toString("base64")}`;

        visualDiffs.push({
          pageIndex: i,
          imageA: imgBase64A,
          imageB: imgBase64B,
          imageDiff: imgBase64Diff,
        });

        visualDiffBuffers.push({
          pageIndex: i,
          diffBuf
        });
      }

      if (downloadReport) {
        const reportBuf = await buildPdfReport("visual", pagesA, pagesB, matchPercent, undefined, visualDiffBuffers);
        return { report: reportBuf, matchPercent };
      }

      const jsonResponse = {
        mode: "visual",
        matchPercent,
        pagesA,
        pagesB,
        visualDiffs,
      };

      return {
        report: Buffer.from(JSON.stringify(jsonResponse)),
        matchPercent,
        mimeType: "application/json",
      };
    } else {
      // Default: Semantic Text Compare
      if (!(await exists("pdftotext"))) {
        throw new Error("pdftotext is not available on this server.");
      }

      const outA = join(dir, "textA.txt");
      const outB = join(dir, "textB.txt");

      await run("pdftotext", [inputA, outA], dir);
      await run("pdftotext", [inputB, outB], dir);

      const fullTextA = await readFile(outA, "utf-8");
      const fullTextB = await readFile(outB, "utf-8");

      const pagesTextA = fullTextA.split(/\f|\x0c/);
      const pagesTextB = fullTextB.split(/\f|\x0c/);

      const maxPages = Math.max(pagesA, pagesB);
      const semanticDiffs = [];

      for (let i = 0; i < maxPages; i++) {
        const textPageA = (pagesTextA[i] || "").trim();
        const textPageB = (pagesTextB[i] || "").trim();

        const changes = Diff.diffWords(textPageA, textPageB);

        semanticDiffs.push({
          pageIndex: i,
          textA: textPageA,
          textB: textPageB,
          diffs: changes.map((c) => ({
            value: c.value,
            added: !!c.added,
            removed: !!c.removed,
          })),
        });
      }

      if (downloadReport) {
        const reportBuf = await buildPdfReport("semantic", pagesA, pagesB, matchPercent, semanticDiffs);
        return { report: reportBuf, matchPercent };
      }

      const jsonResponse = {
        mode: "semantic",
        matchPercent,
        pagesA,
        pagesB,
        semanticDiffs,
      };

      return {
        report: Buffer.from(JSON.stringify(jsonResponse)),
        matchPercent,
        mimeType: "application/json",
      };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

