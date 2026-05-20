import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function comparePdfs(
  a: Buffer,
  b: Buffer
): Promise<{ report: Buffer; matchPercent: number }> {
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

  const report = await PDFDocument.create();
  const font = await report.embedFont(StandardFonts.Helvetica);
  const page = report.addPage([612, 792]);
  page.drawText("PDF Comparison Report", { x: 50, y: 720, size: 18, font });
  page.drawText(`Document A pages: ${pagesA}`, { x: 50, y: 680, size: 12, font });
  page.drawText(`Document B pages: ${pagesB}`, { x: 50, y: 660, size: 12, font });
  page.drawText(`Similarity estimate: ${matchPercent}%`, {
    x: 50,
    y: 630,
    size: 14,
    font,
    color: matchPercent > 80 ? rgb(0, 0.5, 0) : rgb(0.8, 0.4, 0),
  });
  page.drawText(
    "Note: This is a structural comparison (page count). For pixel-level diff, use dedicated tools.",
    { x: 50, y: 580, size: 10, font, maxWidth: 500 }
  );

  return { report: Buffer.from(await report.save()), matchPercent };
}
