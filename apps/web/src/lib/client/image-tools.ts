export async function convertImageFormat(
  file: File,
  mime: "image/jpeg" | "image/png" | "image/webp",
  options?: { maxDimension?: number }
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (options?.maxDimension && options.maxDimension > 0) {
    if (width > options.maxDimension || height > options.maxDimension) {
      if (width > height) {
        height = Math.round((height * options.maxDimension) / width);
        width = options.maxDimension;
      } else {
        width = Math.round((width * options.maxDimension) / height);
        height = options.maxDimension;
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Conversion failed"))),
      mime,
      mime === "image/jpeg" ? 0.9 : undefined
    );
  });
}


export async function compressImage(file: File, quality: number): Promise<Blob> {
  return convertImageFormat(file, "image/jpeg").then(async (blob) => {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    bitmap.close();
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Compress failed"))),
        "image/jpeg",
        quality / 100
      );
    });
  });
}

export async function resizeImage(
  file: File,
  width: number,
  height: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Resize failed"))),
      file.type || "image/png"
    );
  });
}

export async function rotateImage(file: File, angle: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const rad = (angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const w = bitmap.width * cos + bitmap.height * sin;
  const h = bitmap.width * sin + bitmap.height * cos;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Rotate failed"))),
      file.type || "image/png"
    );
  });
}

export async function cropImage(
  file: File,
  options?: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    rotation?: number;
  }
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  
  let sourceWidth = bitmap.width;
  let sourceHeight = bitmap.height;
  const rotation = options?.rotation || 0;
  
  const rotatedCanvas = document.createElement("canvas");
  const rCtx = rotatedCanvas.getContext("2d")!;
  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const rw = bitmap.width * cos + bitmap.height * sin;
    const rh = bitmap.width * sin + bitmap.height * cos;
    rotatedCanvas.width = rw;
    rotatedCanvas.height = rh;
    rCtx.translate(rw / 2, rh / 2);
    rCtx.rotate(rad);
    rCtx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    sourceWidth = rw;
    sourceHeight = rh;
  } else {
    rotatedCanvas.width = bitmap.width;
    rotatedCanvas.height = bitmap.height;
    rCtx.drawImage(bitmap, 0, 0);
  }
  bitmap.close();

  const x = options ? (options.xPercent / 100) * sourceWidth : sourceWidth * 0.1;
  const y = options ? (options.yPercent / 100) * sourceHeight : sourceHeight * 0.1;
  const w = options ? (options.widthPercent / 100) * sourceWidth : sourceWidth * 0.8;
  const h = options ? (options.heightPercent / 100) * sourceHeight : sourceHeight * 0.8;

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(rotatedCanvas, x, y, w, h, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Crop failed"))),
      file.type || "image/png"
    );
  });
}

/**
 * Encodes a Canvas element into an authentic 24-bit uncompressed Windows BMP file
 * (with standard 54-byte BITMAPFILEHEADER + BITMAPINFOHEADER and 4-byte row padding).
 * Eliminates the fake PNG-renamed-to-BMP fallback in standard browsers.
 */
export function encodeBmpFromCanvas(canvas: HTMLCanvasElement): Blob {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is not available");

  const imgData = ctx.getImageData(0, 0, width, height);
  const rgba = imgData.data;

  // In BMP, each scanline is padded to a multiple of 4 bytes
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true); // Total file size
  view.setUint16(6, 0, true); // Reserved 1
  view.setUint16(8, 0, true); // Reserved 2
  view.setUint32(10, 54, true); // Offset to pixel data

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true); // Header size (40)
  view.setInt32(18, width, true); // Width
  view.setInt32(22, height, true); // Height (positive for bottom-up DIB)
  view.setUint16(26, 1, true); // Color planes (1)
  view.setUint16(28, 24, true); // Bits per pixel (24-bit BGR)
  view.setUint32(30, 0, true); // Compression: 0 = BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true); // Image data size
  view.setInt32(38, 2835, true); // Horizontal resolution (~72 DPI)
  view.setInt32(42, 2835, true); // Vertical resolution (~72 DPI)
  view.setUint32(46, 0, true); // Colors in color palette (0)
  view.setUint32(50, 0, true); // Important colors (0)

  const bytes = new Uint8Array(buffer);
  let offset = 54;

  // BMP stores pixel rows bottom-to-top in BGR format
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowStart + x * 4;
      bytes[offset++] = rgba[idx + 2]; // Blue
      bytes[offset++] = rgba[idx + 1]; // Green
      bytes[offset++] = rgba[idx]; // Red
    }
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      bytes[offset++] = 0;
    }
  }

  return new Blob([buffer], { type: "image/bmp" });
}

