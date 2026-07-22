/**
 * Developer Tools Core Logic Module
 * Provides pure, robust, crash-proof functions for developer utility operations.
 */

// ─────────────────────────────────────────────────────────────
// 1. JSON Formatter & Minifier
// ─────────────────────────────────────────────────────────────

export interface JsonFormatterOptions {
  mode?: "format-2" | "format-4" | "format-tab" | "minify";
}

export interface JsonFormatterResult {
  success: boolean;
  output: string;
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
  stats?: {
    inputBytes: number;
    outputBytes: number;
    lineCount: number;
  };
}

export function formatJson(
  input: string,
  options: JsonFormatterOptions = {}
): JsonFormatterResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { success: true, output: "" };
  }

  const mode = options.mode ?? "format-2";

  try {
    const parsed = JSON.parse(trimmed);

    let space: string | number = 2;
    if (mode === "format-4") space = 4;
    else if (mode === "format-tab") space = "\t";
    else if (mode === "minify") space = 0;

    const output = JSON.stringify(parsed, null, space);
    const lineCount = output.split("\n").length;

    return {
      success: true,
      output,
      stats: {
        inputBytes: new TextEncoder().encode(trimmed).length,
        outputBytes: new TextEncoder().encode(output).length,
        lineCount,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const posMatch = msg.match(/at position (\d+)/i) || msg.match(/line (\d+) column (\d+)/i);

    let line: number | undefined;
    let column: number | undefined;

    if (posMatch && posMatch[1] && !posMatch[2]) {
      const pos = parseInt(posMatch[1], 10);
      const lines = trimmed.slice(0, pos).split("\n");
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    } else if (posMatch && posMatch[1] && posMatch[2]) {
      line = parseInt(posMatch[1], 10);
      column = parseInt(posMatch[2], 10);
    }

    return {
      success: false,
      output: "",
      error: {
        message: msg,
        line,
        column,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 2. Base64 Encode
// ─────────────────────────────────────────────────────────────

export interface Base64EncodeOptions {
  urlSafe?: boolean;
  lineWrap?: boolean;
}

export function encodeBase64(
  input: string,
  options: Base64EncodeOptions = {}
): string {
  if (!input) return "";

  // UTF-8 bytes to binary string
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }

  let b64 = btoa(bin);

  if (options.urlSafe) {
    b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  if (options.lineWrap) {
    b64 = b64.match(/.{1,76}/g)?.join("\n") ?? b64;
  }

  return b64;
}

// ─────────────────────────────────────────────────────────────
// 3. Base64 Decode
// ─────────────────────────────────────────────────────────────

export interface Base64DecodeResult {
  success: boolean;
  output: string;
  isBinary?: boolean;
  error?: string;
}

export function decodeBase64(input: string): Base64DecodeResult {
  const trimmed = input.trim();
  if (!trimmed) return { success: true, output: "" };

  // Remove whitespaces and newlines
  let clean = trimmed.replace(/\s+/g, "");

  // Convert URL-safe base64 back to standard
  clean = clean.replace(/-/g, "+").replace(/_/g, "/");

  // Fix padding if missing
  const pad = clean.length % 4;
  if (pad === 2) clean += "==";
  else if (pad === 3) clean += "=";
  else if (pad === 1) {
    return {
      success: false,
      output: "",
      error: "Invalid Base64 string length",
    };
  }

  try {
    const binStr = atob(clean);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }

    // Try decoding as UTF-8 string
    try {
      const decodedText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { success: true, output: decodedText, isBinary: false };
    } catch {
      // If not valid UTF-8 text, represent binary data as clean Hex preview
      const hexParts: string[] = [];
      for (let i = 0; i < Math.min(bytes.length, 512); i++) {
        hexParts.push(bytes[i].toString(16).padStart(2, "0"));
      }
      const hexStr = hexParts.join(" ");
      const label = bytes.length > 512 ? ` (first 512 of ${bytes.length} bytes)` : "";
      return {
        success: true,
        output: `[Binary Data ${bytes.length} bytes${label}]\nHEX: ${hexStr}`,
        isBinary: true,
      };
    }
  } catch (err) {
    return {
      success: false,
      output: "",
      error: err instanceof Error ? err.message : "Invalid Base64 input",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 4. URL Encode
// ─────────────────────────────────────────────────────────────

export interface UrlEncodeOptions {
  mode?: "component" | "uri" | "rfc3986";
  spaceAsPlus?: boolean;
}

export function encodeUrl(
  input: string,
  options: UrlEncodeOptions = {}
): string {
  if (!input) return "";

  const mode = options.mode ?? "component";
  let encoded = "";

  if (mode === "uri") {
    encoded = encodeURI(input);
  } else {
    encoded = encodeURIComponent(input);
    if (mode === "rfc3986") {
      encoded = encoded.replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    }
  }

  if (options.spaceAsPlus) {
    encoded = encoded.replace(/%20/g, "+");
  }

  return encoded;
}

// ─────────────────────────────────────────────────────────────
// 5. URL Decode
// ─────────────────────────────────────────────────────────────

export interface UrlDecodeOptions {
  plusAsSpace?: boolean;
}

export interface UrlDecodeResult {
  success: boolean;
  output: string;
  error?: string;
}

export function decodeUrl(
  input: string,
  options: UrlDecodeOptions = {}
): UrlDecodeResult {
  if (!input) return { success: true, output: "" };

  let processed = input;
  if (options.plusAsSpace) {
    processed = processed.replace(/\+/g, " ");
  }

  try {
    const decoded = decodeURIComponent(processed);
    return { success: true, output: decoded };
  } catch {
    // Resilient fallback parser for malformed percent sequences (e.g. "50% off", "%2", etc.)
    const safeDecoded = processed.replace(/%[0-9a-fA-F]{2}|%/g, (match) => {
      if (match.length === 3) {
        try {
          return decodeURIComponent(match);
        } catch {
          return match;
        }
      }
      return match;
    });

    return {
      success: true,
      output: safeDecoded,
      error: "Input contained malformed percent-encoding sequences that were safely preserved.",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 6. Hash Generator (MD5, SHA-1, SHA-256, SHA-384, SHA-512)
// ─────────────────────────────────────────────────────────────

export interface HashResult {
  md5: string;
  sha1: string;
  sha256: string;
  sha384: string;
  sha512: string;
}

export interface HashOptions {
  uppercase?: boolean;
}

export async function generateHashes(
  input: string,
  options: HashOptions = {}
): Promise<HashResult> {
  const data = new TextEncoder().encode(input);

  const md5Hex = md5(data);

  const [sha1Buf, sha256Buf, sha384Buf, sha512Buf] = await Promise.all([
    crypto.subtle.digest("SHA-1", data),
    crypto.subtle.digest("SHA-256", data),
    crypto.subtle.digest("SHA-384", data),
    crypto.subtle.digest("SHA-512", data),
  ]);

  const bufToHex = (buf: ArrayBuffer) =>
    [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  let res: HashResult = {
    md5: md5Hex,
    sha1: bufToHex(sha1Buf),
    sha256: bufToHex(sha256Buf),
    sha384: bufToHex(sha384Buf),
    sha512: bufToHex(sha512Buf),
  };

  if (options.uppercase) {
    res = {
      md5: res.md5.toUpperCase(),
      sha1: res.sha1.toUpperCase(),
      sha256: res.sha256.toUpperCase(),
      sha384: res.sha384.toUpperCase(),
      sha512: res.sha512.toUpperCase(),
    };
  }

  return res;
}

/**
 * Pure JavaScript MD5 implementation (RFC 1321) for Uint8Array inputs.
 */
function md5(data: Uint8Array): string {
  const k = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
    0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
    0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];

  const r = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ];

  const bitLength = data.length * 8;
  const paddingLength =
    data.length % 64 < 56 ? 56 - (data.length % 64) : 120 - (data.length % 64);
  const padded = new Uint8Array(data.length + paddingLength + 8);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLength & 0xffffffff, true);
  view.setUint32(padded.length - 4, Math.floor(bitLength / 0x100000000), true);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Uint32Array(16);
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, true);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;

    for (let i = 0; i < 64; i++) {
      let f = 0;
      let g = 0;

      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      const sum = (a + f + k[i] + w[g]) | 0;
      const rotated = (sum << r[i]) | (sum >>> (32 - r[i]));
      b = (b + rotated) | 0;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
  }

  const toHex = (n: number) => {
    let hex = "";
    for (let i = 0; i < 4; i++) {
      const byte = (n >> (i * 8)) & 0xff;
      hex += byte.toString(16).padStart(2, "0");
    }
    return hex;
  };

  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3);
}
