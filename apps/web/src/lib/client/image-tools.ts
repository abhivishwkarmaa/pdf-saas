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
