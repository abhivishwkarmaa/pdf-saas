import type { ToolCategory } from "@pdf-saas/shared";

export interface CategoryPreviewMeta {
  featuredSlug: string;
  featuredLabel: string;
  highlights: string[];
}

export const CATEGORY_PREVIEW: Record<ToolCategory, CategoryPreviewMeta> = {
  pdf: {
    featuredSlug: "merge-pdf",
    featuredLabel: "Merge PDF",
    highlights: ["Merge & split", "Rotate & watermark", "Compress & protect"],
  },
  image: {
    featuredSlug: "compress-image",
    featuredLabel: "Compress Image",
    highlights: ["Resize & crop", "JPG, PNG, WebP", "Instant download"],
  },
  video: {
    featuredSlug: "video-converter",
    featuredLabel: "Video Converter",
    highlights: ["MP4, MOV, AVI", "Compress & convert", "Extract audio MP3"],
  },
  text: {
    featuredSlug: "markdown-to-pdf",
    featuredLabel: "Markdown to PDF",
    highlights: ["Markdown & RTF", "EPUB convert", "Clean PDF output"],
  },
  developer: {
    featuredSlug: "json-formatter",
    featuredLabel: "JSON Formatter",
    highlights: ["JSON prettify", "Base64 & URL", "SHA-256 hash"],
  },
  calculator: {
    featuredSlug: "bmi-calculator",
    featuredLabel: "BMI Calculator",
    highlights: ["BMI & age", "Percentages", "Unit converter"],
  },
};
