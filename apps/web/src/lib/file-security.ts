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
 * Known MIME types mapped to their allowed file extensions.
 */
export const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "text/markdown": [".md", ".markdown", ".mdown", ".mkd", ".txt"],
  "text/x-markdown": [".md", ".markdown", ".mdown", ".mkd", ".txt"],
  "text/plain": [".txt", ".text", ".log", ".md", ".markdown"],
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/bmp": [".bmp"],
  "image/webp": [".webp"],
  "image/heic": [".heic", ".heif"],
  "image/heif": [".heic", ".heif"],
  "image/svg+xml": [".svg"],
  "image/avif": [".avif"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/epub+zip": [".epub"],
  "application/x-epub+zip": [".epub"],
  "application/rtf": [".rtf"],
  "text/rtf": [".rtf"],
  "application/x-tex": [".tex"],
  "text/x-tex": [".tex"],
  "application/x-iwork-pages-sffpages": [".pages"],
  "application/vnd.apple.pages": [".pages"],
  "text/html": [".html", ".htm"],
};

/**
 * Checks if a file name is accepted given an accept pattern list (MIME types or extensions).
 */
export function isFileAccepted(fileName: string, acceptList: string[]): boolean {
  if (!acceptList || acceptList.length === 0) return true;
  if (!fileName) return false;
  
  const ext = "." + fileName.split(".").pop()?.toLowerCase().trim();

  return acceptList.some((pattern) => {
    const p = pattern.trim().toLowerCase();
    
    // 1. Direct extension match (e.g., ".md", ".markdown", ".pdf")
    if (p.startsWith(".")) {
      return p === ext;
    }

    // 2. Lookup in MIME_TO_EXTENSIONS dictionary
    const allowedExts = MIME_TO_EXTENSIONS[p];
    if (allowedExts && allowedExts.includes(ext)) {
      return true;
    }

    // 3. Fallback MIME pattern matching
    if (p.includes("/")) {
      const [mainType, subType] = p.split("/");
      if (subType === "*") return true;
      const cleanSub = subType.replace(/^x-/, "");
      const cleanExt = ext.slice(1);
      if (cleanSub === cleanExt || cleanSub.includes(cleanExt) || cleanExt.includes(cleanSub)) {
        return true;
      }
    }

    return false;
  });
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
    if (!isFileAccepted(fileName, acceptList)) {
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
