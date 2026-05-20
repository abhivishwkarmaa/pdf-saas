import { PDFDocument } from "pdf-lib";

export async function splitPdf(
  buffer: Buffer,
  ranges: string
): Promise<Buffer[]> {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = source.getPageCount();
  const parts = ranges.split(",").map((r) => r.trim());
  const outputs: Buffer[] = [];

  for (const part of parts) {
    const doc = await PDFDocument.create();
    let indices: number[] = [];

    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Math.max(1, parseInt(startStr, 10)) - 1;
      const end = Math.min(total, parseInt(endStr, 10)) - 1;
      indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    } else {
      const page = parseInt(part, 10) - 1;
      if (page >= 0 && page < total) indices = [page];
    }

    const copied = await doc.copyPages(source, indices);
    copied.forEach((p) => doc.addPage(p));
    outputs.push(Buffer.from(await doc.save()));
  }

  return outputs;
}
