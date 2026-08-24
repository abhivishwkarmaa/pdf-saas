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
      newPng.data[idx + 1] = 255;
      newPng.data[idx + 2] = 255;
      newPng.data[idx + 3] = 255;
    }
  }
  // Copy original
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const srcIdx = (png.width * y + x) << 2;
      const destIdx = (targetWidth * y + x) << 2;
      newPng.data[destIdx] = png.data[srcIdx];
      newPng.data[destIdx + 1] = png.data[srcIdx + 1];
      newPng.data[destIdx + 2] = png.data[srcIdx + 2];
      newPng.data[destIdx + 3] = png.data[srcIdx + 3];
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
  const lineHeight = fontSize * 1.5;

  const checkPageOverflow = (neededHeight: number) => {
    if (currentY - neededHeight < options.margin + 30) {
      currentPage = options.report.addPage([options.pageWidth, options.pageHeight]);
      // Draw continuation header
      currentPage.drawRectangle({
        x: options.margin,
        y: options.pageHeight - 45,
        width: options.pageWidth - options.margin * 2,
        height: 20,
        color: rgb(0.96, 0.96, 0.98),
      });
      currentPage.drawText("Comparison Report — Continued", {
        x: options.margin + 10,
        y: options.pageHeight - 39,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.5),
      });

      currentX = options.margin;
      currentY = options.pageHeight - options.margin - 40;
      return true;
    }
    return false;
  };

  for (const chunk of chunks) {
    const text = chunk.value;
    const isAdded = chunk.added;
    const isRemoved = chunk.removed;

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
      const widthOfText = font.widthOfTextAtSize(t, fontSize);

      if (currentX + widthOfText > startX + maxWidth) {
        currentX = startX;
        currentY -= lineHeight;
        checkPageOverflow(lineHeight);
      }

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
      let textColor = rgb(0.15, 0.15, 0.18);
      let bgColor = null;

      if (isAdded) {
        textColor = rgb(0.08, 0.45, 0.15); // Crisp Forest Green
        bgColor = rgb(0.88, 0.97, 0.90); // Soft Mint Background
      } else if (isRemoved) {
        textColor = rgb(0.75, 0.10, 0.10); // Crisp Red
        bgColor = rgb(0.99, 0.88, 0.88); // Soft Rose Background
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

      // Strikethrough line for deleted text
      if (isRemoved && t.trim().length > 0) {
        currentPage.drawLine({
          start: { x: currentX, y: currentY + fontSize * 0.35 },
          end: { x: currentX + widthOfText, y: currentY + fontSize * 0.35 },
          thickness: 0.8,
          color: rgb(0.75, 0.10, 0.10),
        });
      }

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

  // ----------------------------------------------------
  // COVER & EXECUTIVE SUMMARY PAGE
  // ----------------------------------------------------
  const coverPage = report.addPage([612, 792]);

  // Top Modern Header Banner (Red & Dark Gradient appearance)
  coverPage.drawRectangle({
    x: 0,
    y: 700,
    width: 612,
    height: 92,
    color: rgb(0.85, 0.15, 0.15), // Crimson Red
  });

  coverPage.drawText("PDF COMPARISON & AUDIT REPORT", {
    x: 45,
    y: 750,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText(`Generated on: ${new Date().toLocaleString()} • Automated Document Intelligence`, {
    x: 45,
    y: 728,
    size: 9.5,
    font,
    color: rgb(1, 0.9, 0.9),
  });

  // Executive Summary Card Box
  coverPage.drawRectangle({
    x: 45,
    y: 530,
    width: 522,
    height: 145,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.88, 0.88, 0.92),
    borderWidth: 1,
  });

  coverPage.drawText("EXECUTIVE AUDIT SUMMARY", {
    x: 65,
    y: 650,
    size: 13,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.25),
  });

  // Doc A vs Doc B stats
  coverPage.drawText("Original Document (A):", { x: 65, y: 622, size: 10, font: fontBold, color: rgb(0.7, 0.15, 0.15) });
  coverPage.drawText(`${pagesA} Page(s)`, { x: 210, y: 622, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

  coverPage.drawText("Modified Document (B):", { x: 65, y: 602, size: 10, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
  coverPage.drawText(`${pagesB} Page(s)`, { x: 210, y: 602, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

  coverPage.drawText("Comparison Mode:", { x: 65, y: 582, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.35) });
  coverPage.drawText(mode === "visual" ? "Pixel-Level Visual Overlay" : "Semantic Line & Word Diff", {
    x: 210,
    y: 582,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  coverPage.drawText("Overall Similarity Score:", { x: 65, y: 552, size: 11, font: fontBold, color: rgb(0.15, 0.15, 0.25) });

  const scoreColor = matchPercent >= 90 ? rgb(0.08, 0.55, 0.18) : matchPercent >= 70 ? rgb(0.85, 0.5, 0.05) : rgb(0.8, 0.15, 0.15);
  const scoreLabel = matchPercent >= 90 ? "Highly Similar / Minor Changes" : matchPercent >= 70 ? "Moderate Changes Detected" : "Significant Differences Found";

  coverPage.drawRectangle({
    x: 210,
    y: 546,
    width: 65,
    height: 20,
    color: scoreColor,
  });

  coverPage.drawText(`${matchPercent}%`, {
    x: 225,
    y: 552,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText(`(${scoreLabel})`, {
    x: 285,
    y: 552,
    size: 9.5,
    font,
    color: scoreColor,
  });

  // How to Read This Report (Legend & Guide Box)
  coverPage.drawRectangle({
    x: 45,
    y: 380,
    width: 522,
    height: 130,
    color: rgb(0.96, 0.98, 1.0),
    borderColor: rgb(0.8, 0.88, 0.98),
    borderWidth: 1,
  });

  coverPage.drawText("HOW TO READ THIS REPORT (COLOR LEGEND)", {
    x: 65,
    y: 485,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.25, 0.5),
  });

  // Green Legend Item
  coverPage.drawRectangle({ x: 65, y: 450, width: 14, height: 14, color: rgb(0.88, 0.97, 0.90), borderColor: rgb(0.4, 0.8, 0.5), borderWidth: 1 });
  coverPage.drawText("Green Highlight (+)", { x: 88, y: 453, size: 10, font: fontBold, color: rgb(0.08, 0.45, 0.15) });
  coverPage.drawText("— New text or content added in Modified Document (B)", { x: 205, y: 453, size: 9.5, font, color: rgb(0.3, 0.3, 0.35) });

  // Red Legend Item
  coverPage.drawRectangle({ x: 65, y: 425, width: 14, height: 14, color: rgb(0.99, 0.88, 0.88), borderColor: rgb(0.9, 0.4, 0.4), borderWidth: 1 });
  coverPage.drawText("Red Highlight (-)", { x: 88, y: 428, size: 10, font: fontBold, color: rgb(0.75, 0.10, 0.10) });
  coverPage.drawText("— Content deleted or removed from Original Document (A)", { x: 205, y: 428, size: 9.5, font, color: rgb(0.3, 0.3, 0.35) });

  // Normal Legend Item
  coverPage.drawRectangle({ x: 65, y: 400, width: 14, height: 14, color: rgb(1, 1, 1), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
  coverPage.drawText("Regular Text", { x: 88, y: 403, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.35) });
  coverPage.drawText("— Unchanged content verified across both documents", { x: 205, y: 403, size: 9.5, font, color: rgb(0.3, 0.3, 0.35) });

  // Security & Audit note
  coverPage.drawText("Confidential Document Audit • Detailed per-page breakdown follows below.", {
    x: 45,
    y: 350,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.55),
  });

  // Footer on cover
  coverPage.drawText("Generated by PDF SaaS Intelligence Suite • Page 1", {
    x: 45,
    y: 30,
    size: 8.5,
    font,
    color: rgb(0.6, 0.6, 0.65),
  });

  // ----------------------------------------------------
  // VISUAL DIFF PAGES (When mode === "visual")
  // ----------------------------------------------------
  if (mode === "visual" && visualDiffs) {
    let pageNum = 2;
    for (const diff of visualDiffs) {
      const pageDiff = report.addPage([612, 792]);

      // Header Banner
      pageDiff.drawRectangle({ x: 45, y: 735, width: 522, height: 32, color: rgb(0.96, 0.96, 0.98), borderColor: rgb(0.88, 0.88, 0.92), borderWidth: 1 });
      pageDiff.drawText(`VISUAL PIXEL DIFFERENCE OVERLAY — PAGE ${diff.pageIndex + 1}`, {
        x: 60,
        y: 748,
        size: 11,
        font: fontBold,
        color: rgb(0.75, 0.15, 0.15),
      });

      const embedded = await report.embedPng(diff.diffBuf);
      const maxWidth = 512;
      const maxHeight = 620;
      const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height);
      const drawWidth = embedded.width * scale;
      const drawHeight = embedded.height * scale;

      pageDiff.drawImage(embedded, {
        x: 50 + (maxWidth - drawWidth) / 2,
        y: 75 + (maxHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });

      // Footer
      pageDiff.drawText(`Generated by PDF SaaS Intelligence Suite • Page ${pageNum}`, {
        x: 45,
        y: 30,
        size: 8.5,
        font,
        color: rgb(0.6, 0.6, 0.65),
      });
      pageNum++;
    }
  }

  // ----------------------------------------------------
  // SEMANTIC TEXT DIFF PAGES (When mode === "semantic")
  // ----------------------------------------------------
  else if (mode === "semantic" && semanticDiffs) {
    let currentPage = report.addPage([612, 792]);
    let currentY = 740;
    let reportPageCount = 2;

    for (const pageDiff of semanticDiffs) {
      if (currentY < 160) {
        // Add footer to finished page
        currentPage.drawText(`Generated by PDF SaaS Intelligence Suite • Page ${reportPageCount}`, {
          x: 45,
          y: 30,
          size: 8.5,
          font,
          color: rgb(0.6, 0.6, 0.65),
        });
        reportPageCount++;

        currentPage = report.addPage([612, 792]);
        currentY = 740;
      }

      // Page Header Strip
      currentPage.drawRectangle({
        x: 45,
        y: currentY - 6,
        width: 522,
        height: 26,
        color: rgb(0.95, 0.95, 0.98),
        borderColor: rgb(0.85, 0.85, 0.92),
        borderWidth: 1,
      });

      currentPage.drawText(`COMPARISON: PAGE ${pageDiff.pageIndex + 1}`, {
        x: 60,
        y: currentY + 3,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.25),
      });

      currentY -= 32;

      const result = wrapAndDrawText(
        currentPage,
        fontMono,
        8.5,
        45,
        currentY,
        522,
        pageDiff.diffs,
        {
          report,
          pageWidth: 612,
          pageHeight: 792,
          margin: 45,
        }
      );

      currentPage = result.lastPage;
      currentY = result.lastY - 40;
    }

    // Add footer to the last page
    currentPage.drawText(`Generated by PDF SaaS Intelligence Suite • Page ${reportPageCount}`, {
      x: 45,
      y: 30,
      size: 8.5,
      font,
      color: rgb(0.6, 0.6, 0.65),
    });
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
      const filesA = files
        .filter((f) => f.startsWith("pageA-") && f.endsWith(".png"))
        .sort((x, y) => {
          const numX = parseInt(x.match(/\d+/)?.[0] || "0", 10);
          const numY = parseInt(y.match(/\d+/)?.[0] || "0", 10);
          return numX - numY;
        });
      const filesB = files
        .filter((f) => f.startsWith("pageB-") && f.endsWith(".png"))
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
          diffBuf,
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
      const outA = join(dir, "textA.txt");
      const outB = join(dir, "textB.txt");

      let fullTextA = "";
      let fullTextB = "";

      if (await exists("pdftotext")) {
        await run("pdftotext", [inputA, outA], dir);
        await run("pdftotext", [inputB, outB], dir);
        fullTextA = await readFile(outA, "utf-8");
        fullTextB = await readFile(outB, "utf-8");
      }

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
