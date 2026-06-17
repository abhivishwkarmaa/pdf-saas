"use client";

import type { ToolDefinition } from "@pdf-saas/shared";
import {
  Eye,
  FileText,
  Image as ImageIcon,
  Type,
  Code,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { getToolOptionFields } from "@/lib/tool-options";
import { cn } from "@/lib/utils";

export type PreviewSummaryItem = { label: string; value: string };

interface SubmissionPreviewProps {
  tool: ToolDefinition;
  files?: File[];
  fileUrls?: string[];
  textSnippet?: string | null;
  options?: Record<string, string>;
  textInput?: string;
  textOutput?: string;
  summaryItems?: PreviewSummaryItem[];
  resultPreview?: { title: string; value: string; hint?: string };
  onFilesChange?: (files: File[]) => void;
  rotations?: number[];
  onRotationsChange?: (rotations: number[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmissionPreview({
  tool,
  files = [],
  fileUrls = [],
  textSnippet,
  options = {},
  textInput,
  textOutput,
  summaryItems = [],
  resultPreview,
  onFilesChange,
  rotations = [],
  onRotationsChange,
}: SubmissionPreviewProps) {
  const isImageToPdf = ["jpg-to-pdf", "png-to-pdf", "scan-to-pdf", "image-to-pdf"].includes(tool.slug);
  const theme = CATEGORY_THEME[tool.category];
  const optionFields = getToolOptionFields(tool.slug);
  const filledOptions = optionFields.filter((f) => (options[f.key] ?? "").trim() !== "");

  const hasFiles = files.length > 0;
  const hasTextInput = Boolean(textInput?.trim());
  const hasSummary = summaryItems.length > 0;
  const hasContent =
    hasFiles ||
    hasTextInput ||
    hasSummary ||
    Boolean(textOutput?.trim()) ||
    Boolean(resultPreview);

  return (
    <div
      className={cn(
        "flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border shadow-sm",
        theme.accentBorder,
        "bg-white dark:bg-zinc-900"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-3",
          theme.accentBorder,
          theme.accentBg
        )}
      >
        <Eye className={cn("h-4 w-4", theme.accent)} />
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Preview
        </span>
        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          What you&apos;re submitting
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden p-4">
        {!hasContent ? (
          <EmptyPreview category={tool.category} />
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {hasSummary && <SummarySection items={summaryItems} theme={theme} />}

            {hasFiles && (
              isImageToPdf ? (
                <ImageToPdfPreview
                  files={files}
                  fileUrls={fileUrls}
                  options={options}
                  onFilesChange={onFilesChange}
                  rotations={rotations}
                  onRotationsChange={onRotationsChange}
                />
              ) : (
                <FilePreviewSection
                  tool={tool}
                  files={files}
                  fileUrls={fileUrls}
                  textSnippet={textSnippet}
                />
              )
            )}

            {hasTextInput && (
              <TextEditorPreview
                input={textInput!}
                output={textOutput}
                category={tool.category}
              />
            )}

            {filledOptions.length > 0 && (
              <OptionsSummary options={options} fields={filledOptions} />
            )}

            {resultPreview && (
              <ResultPreviewBlock {...resultPreview} theme={theme} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyPreview({ category }: { category: ToolDefinition["category"] }) {
  const theme = CATEGORY_THEME[category];
  const Icon = theme.icon;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl border",
          theme.accentBorder,
          theme.accentBg
        )}
      >
        <Icon className={cn("h-7 w-7", theme.accent)} />
      </span>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Nothing to preview yet
      </p>
      <p className="max-w-[220px] text-xs text-zinc-500 dark:text-zinc-400">
        Upload files or fill in the form — your submission will appear here live.
      </p>
    </div>
  );
}

function SummarySection({
  items,
  theme,
}: {
  items: PreviewSummaryItem[];
  theme: (typeof CATEGORY_THEME)[keyof typeof CATEGORY_THEME];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Your input
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "rounded-lg border px-3 py-2",
              theme.accentBorder,
              "bg-zinc-50 dark:bg-zinc-800/50"
            )}
          >
            <p className="text-[10px] text-zinc-500">{item.label}</p>
            <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {item.value || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilePreviewSection({
  tool,
  files,
  fileUrls,
  textSnippet,
}: {
  tool: ToolDefinition;
  files: File[];
  fileUrls: string[];
  textSnippet?: string | null;
}) {
  const isImage = tool.category === "image";
  const isPdf = tool.category === "pdf";
  const primaryUrl = fileUrls[0];

  return (
    <div className="space-y-3">
      {isPdf && primaryUrl && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
          {files.length > 1 && (
            <p className="border-b border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-700">
              Showing first of {files.length} PDFs — {files[0].name}
            </p>
          )}
          <iframe
            title="PDF preview"
            src={`${primaryUrl}#toolbar=0&navpanes=0`}
            className="h-[280px] w-full"
          />
        </div>
      )}

      {isImage && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700"
            >
              {fileUrls[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrls[i]}
                  alt={file.name}
                  className="aspect-square w-full object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>
      )}

      {!isPdf && !isImage && textSnippet && (
        <div className="max-h-48 overflow-auto rounded-lg border border-violet-200 bg-violet-50/50 p-3 font-mono text-xs leading-relaxed text-zinc-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-zinc-300">
          <pre className="whitespace-pre-wrap break-words">{textSnippet}</pre>
        </div>
      )}

      <FileList files={files} category={tool.category} />
    </div>
  );
}

function FileList({
  files,
  category,
}: {
  files: File[];
  category: ToolDefinition["category"];
}) {
  const FileIcon =
    category === "image" ? ImageIcon : category === "text" ? Type : FileText;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {files.length} file{files.length !== 1 ? "s" : ""} selected
      </p>
      <ul className="space-y-1">
        {files.map((f, i) => (
          <li
            key={`${f.name}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800"
          >
            <FileIcon className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="min-w-0 flex-1 truncate font-medium text-zinc-700 dark:text-zinc-300">
              {f.name}
            </span>
            <span className="shrink-0 text-zinc-500">{formatBytes(f.size)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TextEditorPreview({
  input,
  output,
  category,
}: {
  input: string;
  output?: string;
  category: ToolDefinition["category"];
}) {
  const theme = CATEGORY_THEME[category];
  const Icon = category === "developer" ? Code : Type;

  return (
    <div className="grid flex-1 gap-3 sm:grid-cols-2">
      <div className="flex min-h-[140px] flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div
          className={cn(
            "flex items-center gap-2 border-b px-3 py-2 text-xs font-semibold uppercase",
            theme.accentBorder,
            theme.accentBg,
            theme.accent
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          Input
        </div>
        <pre className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
          {input}
        </pre>
      </div>
      <div className="flex min-h-[140px] flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-700">
          Output
        </div>
        <pre className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {output?.trim() ? output : "Run the tool to see output here"}
        </pre>
      </div>
    </div>
  );
}

function OptionsSummary({
  options,
  fields,
}: {
  options: Record<string, string>;
  fields: ReturnType<typeof getToolOptionFields>;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Settings
      </p>
      <dl className="space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
        {fields.map((f) => (
          <div key={f.key} className="flex justify-between gap-4">
            <dt className="text-zinc-500">{f.label}</dt>
            <dd className="font-medium text-zinc-800 dark:text-zinc-200">
              {f.type === "password" ? "••••••••" : options[f.key]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ResultPreviewBlock({
  title,
  value,
  hint,
  theme,
}: {
  title: string;
  value: string;
  hint?: string;
  theme: (typeof CATEGORY_THEME)[keyof typeof CATEGORY_THEME];
}) {
  return (
    <div
      className={cn("rounded-xl border p-4", theme.accentBorder, theme.accentBg)}
    >
      <p className={cn("text-xs font-semibold uppercase", theme.accent)}>{title}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      {hint && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

async function rotateImageFile(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.height;
        canvas.height = img.width;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          const rotatedFile = new File([blob], file.name, {
            type: file.type || "image/jpeg",
            lastModified: Date.now()
          });
          resolve(rotatedFile);
        }, file.type || "image/jpeg");
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function ImageToPdfPreview({
  files,
  fileUrls,
  options,
  onFilesChange,
  rotations = [],
  onRotationsChange,
}: {
  files: File[];
  fileUrls: string[];
  options: Record<string, string>;
  onFilesChange?: (files: File[]) => void;
  rotations?: number[];
  onRotationsChange?: (rotations: number[]) => void;
}) {
  const orientation = options.orientation || "portrait";
  const pageSize = options.pageSize || "a4";
  const margin = options.margin || "none";

  let pageAspect = "aspect-[1/1.414]";
  if (pageSize === "a4") {
    pageAspect = orientation === "landscape" ? "aspect-[1.414/1]" : "aspect-[1/1.414]";
  } else if (pageSize === "letter") {
    pageAspect = orientation === "landscape" ? "aspect-[1.294/1]" : "aspect-[1/1.294]";
  } else if (pageSize === "fit") {
    pageAspect = ""; // dynamic
  }

  let marginPadding = "p-0";
  if (margin === "small") {
    marginPadding = "p-2.5 sm:p-4";
  } else if (margin === "big") {
    marginPadding = "p-5 sm:p-8";
  }

  const handleDelete = (index: number) => {
    if (onFilesChange) {
      const updated = files.filter((_, i) => i !== index);
      onFilesChange(updated);
    }
  };

  const handleRotate = (index: number) => {
    if (onRotationsChange) {
      const next = [...rotations];
      next[index] = ((next[index] || 0) + 90) % 360;
      onRotationsChange(next);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Live Page Layout Preview
      </p>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {files.map((file, i) => {
          const url = fileUrls[i];
          const rotation = rotations[i] || 0;
          return (
            <div key={`${file.name}-${i}`} className="flex flex-col items-center group/page">
              <span className="mb-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Page {i + 1}
              </span>
              
              <div
                className={cn(
                  "relative w-full overflow-hidden border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 shadow-sm rounded-xl flex items-center justify-center transition-all duration-300",
                  pageAspect,
                  marginPadding
                )}
                style={
                  pageSize === "fit"
                    ? { minHeight: "220px" }
                    : {}
                }
              >
                {url ? (
                  <img
                    src={url}
                    alt={file.name}
                    className={cn(
                      "max-w-full max-h-full object-contain shadow-xs border border-zinc-100/50 dark:border-zinc-800/50 rounded-sm"
                    )}
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease-in-out",
                    }}
                  />
                ) : null}

                {onFilesChange && (
                  <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover/page:opacity-100 focus-within:opacity-100 transition-opacity bg-white/95 dark:bg-zinc-900/95 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleRotate(i)}
                      className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(i)}
                      className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 transition"
                      title="Delete Image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
