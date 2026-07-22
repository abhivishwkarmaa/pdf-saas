/**
 * File Security & Input Validation Module
 * Enforces magic-byte verification, executable/script rejection,
 * size checks, and corrupt file detection across Client & Server.
 */

export const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "js", "vbs", "ps1", "scr", "pif", "application",
  "gadget", "msi", "msp", "hta", "cpl", "msc", "jar", "com", "dll", "sys",
  "php", "py", "pl", "cgi", "asp", "aspx", "bash", "vb", "wsf", "wsh", "drv",
  "ocx", "vbe", "jse", "reg", "rgs", "ws", "sct", "docm", "xlsm", "pptm",
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Checks file extension against dangerous/executable blacklists.
 */
export function isDangerousExtension(fileName: string): boolean {
  if (!fileName) return true;
  const parts = fileName.split(".");
  if (parts.length < 2) return false;
  const ext = parts[parts.length - 1].toLowerCase().trim();
  return DANGEROUS_EXTENSIONS.has(ext);
}

/**
 * Reads header bytes and checks file magic signature.
 */
export function verifyMagicBytes(header: Uint8Array, fileName: string): FileValidationResult {
  if (header.length === 0) {
    return { valid: false, error: "File is empty (0 bytes) or corrupted." };
  }

  // Windows Executable (MZ)
  if (header[0] === 0x4d && header[1] === 0x5a) {
    return { valid: false, error: "Executable files (.exe / .dll) are strictly forbidden." };
  }

  // Linux Executable (ELF)
  if (header[0] === 0x7f && header[1] === 0x45 && header[2] === 0x4c && header[3] === 0x46) {
    return { valid: false, error: "Executable binary files are strictly forbidden." };
  }

  // Mach-O (macOS Executable)
  if (
    (header[0] === 0xfe && header[1] === 0xed && header[2] === 0xfa && (header[3] === 0xce || header[3] === 0xcf)) ||
    (header[0] === 0xcf && header[1] === 0xfa && header[2] === 0xed && header[3] === 0xfe) ||
    (header[0] === 0xca && header[1] === 0xfe && header[2] === 0xba && header[3] === 0xbe)
  ) {
    return { valid: false, error: "Executable binary files are strictly forbidden." };
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  // PDF verification (%PDF-)
  if (ext === "pdf") {
    const isPdfMagic =
      header[0] === 0x25 && // %
      header[1] === 0x50 && // P
      header[2] === 0x44 && // D
      header[3] === 0x46;   // F
    if (!isPdfMagic) {
      return { valid: false, error: "The file header does not match a valid PDF document or is corrupted." };
    }
  }

  // PNG verification
  if (ext === "png") {
    const isPngMagic =
      header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
    if (!isPngMagic) {
      return { valid: false, error: "The file header does not match a valid PNG image or is corrupted." };
    }
  }

  // JPEG verification (FF D8 FF)
  if (ext === "jpg" || ext === "jpeg") {
    const isJpgMagic = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (!isJpgMagic) {
      return { valid: false, error: "The file header does not match a valid JPEG image or is corrupted." };
    }
  }

  // GIF verification (GIF8)
  if (ext === "gif") {
    const isGifMagic =
      header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38;
    if (!isGifMagic) {
      return { valid: false, error: "The file header does not match a valid GIF image or is corrupted." };
    }
  }

  // BMP verification (BM)
  if (ext === "bmp") {
    const isBmpMagic = header[0] === 0x42 && header[1] === 0x4d;
    if (!isBmpMagic) {
      return { valid: false, error: "The file header does not match a valid BMP image or is corrupted." };
    }
  }

  // ZIP / Office document verification (PK..)
  if (["docx", "xlsx", "pptx", "epub", "zip"].includes(ext)) {
    const isZipMagic = header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
    if (!isZipMagic) {
      return { valid: false, error: `The file header does not match a valid ${ext.toUpperCase()} document or is corrupted.` };
    }
  }

  return { valid: true };
}

/**
 * Validates file security (size, extension, and header bytes).
 */
export async function validateFileSecurity(
  fileOrBuffer: File | Buffer | ArrayBuffer,
  fileName: string,
  acceptList: string[] = [],
  maxMb = 50
): Promise<FileValidationResult> {
  // 1. Rejection of dangerous/executable extensions
  if (isDangerousExtension(fileName)) {
    return {
      valid: false,
      error: `Security Error: Executable or script files (${fileName}) are strictly prohibited.`,
    };
  }

  // 2. Accept list check
  if (acceptList && acceptList.length > 0) {
    const ext = "." + fileName.split(".").pop()?.toLowerCase();
    const isAccepted = acceptList.some((pattern) => {
      const p = pattern.trim().toLowerCase();
      if (p.startsWith(".")) return p === ext;
      if (p.includes("/")) return ext === "." + p.split("/")[1];
      return false;
    });

    if (!isAccepted) {
      return {
        valid: false,
        error: `Unsupported file type for this tool (${fileName}).`,
      };
    }
  }

  // 3. Get header bytes
  let header: Uint8Array;
  let byteLength = 0;

  if (typeof window !== "undefined" && fileOrBuffer instanceof File) {
    if (fileOrBuffer.size === 0) {
      return { valid: false, error: `File "${fileName}" is empty (0 bytes).` };
    }
    byteLength = fileOrBuffer.size;
    const slice = fileOrBuffer.slice(0, 32);
    const buf = await slice.arrayBuffer();
    header = new Uint8Array(buf);
  } else if (fileOrBuffer instanceof Buffer) {
    if (fileOrBuffer.length === 0) {
      return { valid: false, error: `File "${fileName}" is empty (0 bytes).` };
    }
    byteLength = fileOrBuffer.length;
    header = new Uint8Array(fileOrBuffer.subarray(0, 32));
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    if (fileOrBuffer.byteLength === 0) {
      return { valid: false, error: `File "${fileName}" is empty (0 bytes).` };
    }
    byteLength = fileOrBuffer.byteLength;
    header = new Uint8Array(fileOrBuffer.slice(0, 32));
  } else {
    return { valid: false, error: "Invalid file payload." };
  }

  // 4. Check file size
  if (maxMb > 0 && byteLength > maxMb * 1024 * 1024) {
    return {
      valid: false,
      error: `File "${fileName}" exceeds max allowed size of ${maxMb} MB.`,
    };
  }

  // 5. Magic Byte Verification
  return verifyMagicBytes(header, fileName);
}
