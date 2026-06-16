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
        { value: "90", label: "90° clockwise" },
        { value: "180", label: "180°" },
        { value: "270", label: "270° clockwise" },
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
  "protect-pdf": [{ key: "password", label: "Password", type: "password" }],
  "unlock-pdf": [{ key: "password", label: "Password", type: "password" }],
  "ocr-pdf": [
    { key: "language", label: "Language code", placeholder: "eng" },
  ],
  "compress-image": [
    { key: "quality", label: "Quality (1–100)", type: "number", placeholder: "80" },
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
