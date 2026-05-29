import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { run, exists } from "../lib/exec.js";
import * as docx from "docx";

const { Document, Packer, Paragraph, TextRun } = docx as any;

export async function imageToWord(buffer: Buffer): Promise<Buffer> {
  let text = "";

  if (await exists("tesseract")) {
    const dir = await mkdtemp(join(tmpdir(), "img-ocr-"));
    const input = join(dir, "image.png");
    const out = join(dir, "out");
    try {
      await writeFile(input, buffer);
      await run("tesseract", [input, out, "-l", "eng"]);
      text = await readFile(`${out}.txt`, "utf-8");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } else {
    text = "[OCR unavailable - install tesseract in worker container]";
  }

  const doc = new Document({
    sections: [
      {
        children: text
          .split("\n")
          .filter(Boolean)
          .map(
            (line) =>
              new Paragraph({ children: [new TextRun(line)] })
          ),
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
