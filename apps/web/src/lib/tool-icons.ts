import type { ToolCategory } from "@pdf-saas/shared";
import {
  FileText,
  Image as ImageIcon,
  Type,
  Code2,
  Calculator,
  Layers,
  Scissors,
  Minimize2,
  Scaling,
  Crop,
  Table,
  FileImage,
  Lock,
  Unlock,
  Stamp,
  RotateCw,
  Hash,
  ScanText,
  Trash2,
  Copy,
  Braces,
  Binary,
  Link2,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  AlignLeft,
  FileDiff,
  FileCode,
  CaseSensitive,
  Percent,
  Calendar,
  Activity,
  Scale,
  type LucideIcon,
} from "lucide-react";

/**
 * Intelligent Lucide icon mapping based on tool slug and category.
 * Prevents visual monotony by giving each tool a specific, recognizable vector icon.
 */
export function getToolIcon(slug: string, category: ToolCategory): LucideIcon {
  const s = slug.toLowerCase();

  // Document & PDF Operations
  if (s.includes("merge")) return Layers;
  if (s.includes("split")) return Scissors;
  if (s.includes("compress")) return Minimize2;
  if (s.includes("resize")) return Scaling;
  if (s.includes("crop")) return Crop;
  if (s.includes("excel") || s.includes("spreadsheet")) return Table;
  if (s.includes("protect") || s.includes("encrypt")) return Lock;
  if (s.includes("unlock") || s.includes("decrypt")) return Unlock;
  if (s.includes("watermark") || s.includes("stamp")) return Stamp;
  if (s.includes("rotate")) return RotateCw;
  if (s.includes("page-number") || s.includes("number-page")) return Hash;
  if (s.includes("ocr") || s.includes("scan")) return ScanText;
  if (s.includes("delete") || s.includes("remove-pages")) return Trash2;
  if (s.includes("organize")) return Copy;

  // Developer & Data Tools
  if (s.includes("json")) return Braces;
  if (s.includes("base64")) return Binary;
  if (s.includes("url")) return Link2;
  if (s.includes("hash") || s.includes("md5") || s.includes("sha")) return Fingerprint;
  if (s.includes("uuid")) return KeyRound;
  if (s.includes("jwt")) return ShieldCheck;

  // Text & Formatting
  if (s.includes("lorem")) return AlignLeft;
  if (s.includes("diff")) return FileDiff;
  if (s.includes("markdown")) return FileCode;
  if (s.includes("counter")) return CaseSensitive;
  if (s.includes("case")) return Type;

  // Calculators & Math
  if (s.includes("percentage") || s.includes("percent")) return Percent;
  if (s.includes("age")) return Calendar;
  if (s.includes("bmi")) return Activity;
  if (s.includes("unit")) return Scale;

  // Images
  if (
    s.includes("image") ||
    s.includes("jpg") ||
    s.includes("png") ||
    s.includes("webp") ||
    s.includes("svg")
  ) {
    return FileImage;
  }

  // Fallbacks by category
  switch (category) {
    case "pdf":
      return FileText;
    case "image":
      return ImageIcon;
    case "text":
      return Type;
    case "developer":
      return Code2;
    case "calculator":
      return Calculator;
    default:
      return FileText;
  }
}
