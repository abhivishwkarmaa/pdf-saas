import { runCommand, commandExists } from "../exec";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export async function protectPdf(
  buffer: Buffer,
  password: string
): Promise<Buffer> {
  if (!(await commandExists("qpdf"))) {
    throw new Error("qpdf is required for password protection. Run via Docker worker.");
  }
  const dir = await mkdtemp(join(tmpdir(), "pdf-protect-"));
  const input = join(dir, "in.pdf");
  const output = join(dir, "out.pdf");
  try {
    await writeFile(input, buffer);
    await runCommand("qpdf", [
      "--encrypt",
      password,
      password,
      "256",
      "--",
      input,
      output,
    ]);
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function unlockPdf(
  buffer: Buffer,
  password: string
): Promise<Buffer> {
  if (!(await commandExists("qpdf"))) {
    throw new Error("qpdf is required to unlock PDFs. Run via Docker worker.");
  }
  const dir = await mkdtemp(join(tmpdir(), "pdf-unlock-"));
  const input = join(dir, "in.pdf");
  const output = join(dir, "out.pdf");
  try {
    await writeFile(input, buffer);
    await runCommand("qpdf", [
      `--password=${password}`,
      "--decrypt",
      input,
      output,
    ]);
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
