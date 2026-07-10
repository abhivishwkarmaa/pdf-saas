export type ToolOptionField = {
  key: string;
  label: string;
  type?: "text" | "password" | "number" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export const TOOL_OPTION_FIELDS: Record<string, ToolOptionField[]> = {
  "split-pdf": [
    { key: "ranges", label: "Page ranges", placeholder: "1-3, 5, 7-9" },
  ],
  "remove-pages": [
    { key: "pages", label: "Pages to remove", placeholder: "2, 4-6" },
  ],
  "extract-pages": [
    { key: "pages", label: "Pages to extract", placeholder: "1, 3-5" },
  ],
  "organize-pdf": [
    { key: "order", label: "Page order & Blank pages", placeholder: "e.g. 1, b, 2, b, 3 (use 'b' or 'blank' for blank pages)" },
  ],
  "rotate-pdf": [
    {
      key: "angle",
      label: "Rotation",
      type: "select",
      options: [
        { value: "90", label: "Rotate Right (90°)" },
        { value: "180", label: "Rotate 180°" },
        { value: "270", label: "Rotate Left (90°)" },
      ],
    },
    {
      key: "pages",
      label: "Pages to rotate (Optional)",
      placeholder: "e.g. 1:90, 4:180, 2-3 (default is select angle)",
    },
  ],
  "watermark-pdf": [
    { key: "text", label: "Watermark text", placeholder: "CONFIDENTIAL" },
  ],
  "pdf-to-word": [
    {
      key: "engine",
      label: "Conversion Strategy",
      type: "select",
      options: [
        { value: "auto", label: "Auto Detect (Recommended)" },
        { value: "local", label: "Local Converter (Fast/Text Only)" },
        { value: "adobe", label: "Adobe Premium (Best for Images/Tables)" },
      ],
    },
  ],
  "pdf-to-jpg": [
    {
      key: "mode",
      label: "Conversion Mode",
      type: "select",
      options: [
        { value: "pages", label: "Convert PDF pages to JPG" },
        { value: "extract", label: "Extract embedded images" },
      ],
    },
    {
      key: "quality",
      label: "Quality",
      type: "select",
      options: [
        { value: "high", label: "High Quality (300 DPI)" },
        { value: "low", label: "Standard Quality (150 DPI)" },
      ],
    },
  ],
  "pdf-to-png": [
    {
      key: "mode",
      label: "Conversion Mode",
      type: "select",
      options: [
        { value: "pages", label: "Convert PDF pages to PNG" },
        { value: "extract", label: "Extract embedded images" },
      ],
    },
    {
      key: "quality",
      label: "Quality",
      type: "select",
      options: [
        { value: "high", label: "High Quality (300 DPI)" },
        { value: "low", label: "Standard Quality (150 DPI)" },
      ],
    },
  ],
  "compress-pdf": [
    {
      key: "quality",
      label: "Quality",
      type: "select",
      options: [
        { value: "ebook", label: "Recommended (Good quality - 150 dpi)" },
        { value: "screen", label: "Maximum Compression (Less quality - 72 dpi)" },
        { value: "print", label: "High Quality (High quality - 300 dpi)" },
      ],
    },
  ],
  "protect-pdf": [
    { key: "password", label: "Password", type: "password", placeholder: "Enter password" },
    { key: "repeatPassword", label: "Repeat Password", type: "password", placeholder: "Repeat password" }
  ],
  "unlock-pdf": [{ key: "password", label: "Password", type: "password" }],
  "ocr-pdf": [
    { key: "language", label: "Language code", placeholder: "eng" },
  ],
  "jpg-to-pdf": [
    {
      key: "pageSize",
      label: "Page Size",
      type: "select",
      options: [
        { value: "a4", label: "A4 (210 x 297 mm)" },
        { value: "letter", label: "US Letter (8.5 x 11 in)" },
        { value: "fit", label: "Fit (same page size as image)" },
      ],
    },
    {
      key: "orientation",
      label: "Orientation",
      type: "select",
      options: [
        { value: "portrait", label: "Portrait" },
        { value: "landscape", label: "Landscape" },
      ],
    },
    {
      key: "margin",
      label: "Margin",
      type: "select",
      options: [
        { value: "none", label: "No Margin" },
        { value: "small", label: "Small Margin (20 pt)" },
        { value: "big", label: "Big Margin (50 pt)" },
      ],
    },
  ],
  "png-to-pdf": [
    {
      key: "pageSize",
      label: "Page Size",
      type: "select",
      options: [
        { value: "a4", label: "A4 (210 x 297 mm)" },
        { value: "letter", label: "US Letter (8.5 x 11 in)" },
        { value: "fit", label: "Fit (same page size as image)" },
      ],
    },
    {
      key: "orientation",
      label: "Orientation",
      type: "select",
      options: [
        { value: "portrait", label: "Portrait" },
        { value: "landscape", label: "Landscape" },
      ],
    },
    {
      key: "margin",
      label: "Margin",
      type: "select",
      options: [
        { value: "none", label: "No Margin" },
        { value: "small", label: "Small Margin (20 pt)" },
        { value: "big", label: "Big Margin (50 pt)" },
      ],
    },
  ],
  "scan-to-pdf": [
    {
      key: "pageSize",
      label: "Page Size",
      type: "select",
      options: [
        { value: "a4", label: "A4 (210 x 297 mm)" },
        { value: "letter", label: "US Letter (8.5 x 11 in)" },
        { value: "fit", label: "Fit (same page size as image)" },
      ],
    },
    {
      key: "orientation",
      label: "Orientation",
      type: "select",
      options: [
        { value: "portrait", label: "Portrait" },
        { value: "landscape", label: "Landscape" },
      ],
    },
    {
      key: "margin",
      label: "Margin",
      type: "select",
      options: [
        { value: "none", label: "No Margin" },
        { value: "small", label: "Small Margin (20 pt)" },
        { value: "big", label: "Big Margin (50 pt)" },
      ],
    },
  ],
  "image-to-pdf": [
    {
      key: "pageSize",
      label: "Page Size",
      type: "select",
      options: [
        { value: "a4", label: "A4 (210 x 297 mm)" },
        { value: "letter", label: "US Letter (8.5 x 11 in)" },
        { value: "fit", label: "Fit (same page size as image)" },
      ],
    },
    {
      key: "orientation",
      label: "Orientation",
      type: "select",
      options: [
        { value: "portrait", label: "Portrait" },
        { value: "landscape", label: "Landscape" },
      ],
    },
    {
      key: "margin",
      label: "Margin",
      type: "select",
      options: [
        { value: "none", label: "No Margin" },
        { value: "small", label: "Small Margin (20 pt)" },
        { value: "big", label: "Big Margin (50 pt)" },
      ],
    },
  ],
  "compress-image": [
    {
      key: "quality",
      label: "Quality",
      type: "select",
      options: [
        { value: "recommended", label: "Recommended (Good quality)" },
        { value: "extreme", label: "Maximum Compression (Less quality)" },
        { value: "high", label: "High Quality (Best quality)" },
      ],
    },
  ],
  "resize-image": [
    { key: "width", label: "Width (px)", type: "number", placeholder: "800" },
    { key: "height", label: "Height (px)", type: "number", placeholder: "600" },
  ],
  "rotate-image": [
    {
      key: "angle",
      label: "Rotation (degrees)",
      type: "number",
      placeholder: "90",
    },
  ],
  "image-to-word": [
    {
      key: "mode",
      label: "OCR Output Mode",
      type: "select",
      options: [
        { value: "merge", label: "Merge all into one Docx" },
        { value: "separate", label: "Separate Docx files (ZIP)" },
      ],
    },
  ],
};

export function getToolOptionFields(slug: string): ToolOptionField[] {
  return TOOL_OPTION_FIELDS[slug] ?? [];
}

export function getToolOptionDefaults(slug: string): Record<string, string> {
  return Object.fromEntries(
    getToolOptionFields(slug).map((field) => [
      field.key,
      field.options?.[0]?.value ?? "",
    ])
  );
}
