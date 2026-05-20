import sharp from "sharp";
import { imagesToPdf } from "../pdf/images";

export async function compressImage(
  buffer: Buffer,
  quality: number
): Promise<Buffer> {
  return sharp(buffer).jpeg({ quality, mozjpeg: true }).toBuffer();
}

export async function resizeImage(
  buffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .toBuffer();
}

export async function cropImage(
  buffer: Buffer,
  left: number,
  top: number,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(buffer).extract({ left, top, width, height }).toBuffer();
}

export async function rotateImage(
  buffer: Buffer,
  angle: number
): Promise<Buffer> {
  return sharp(buffer).rotate(angle).toBuffer();
}

export async function convertImageFormat(
  buffer: Buffer,
  format: "jpeg" | "png" | "webp"
): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  let out: Buffer;
  if (format === "jpeg") {
    out = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    return { buffer: out, mimeType: "image/jpeg", ext: "jpg" };
  }
  if (format === "png") {
    out = await sharp(buffer).png().toBuffer();
    return { buffer: out, mimeType: "image/png", ext: "png" };
  }
  out = await sharp(buffer).webp({ quality: 90 }).toBuffer();
  return { buffer: out, mimeType: "image/webp", ext: "webp" };
}

export async function heicToJpg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).jpeg({ quality: 90 }).toBuffer();
}

export async function gifToPng(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false }).png().toBuffer();
}

export { imagesToPdf };
