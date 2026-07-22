"use client";

import { Upload, X, ShieldAlert } from "lucide-react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { validateFileSecurity } from "@/lib/file-security";

interface FileDropZoneProps {
  tool: ToolDefinition;
  files: File[];
  onFiles: (files: File[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropZone({ tool, files, onFiles }: FileDropZoneProps) {
  const removeFile = (index: number) => {
    onFiles(files.filter((_, i) => i !== index));
  };

  const handleFileSelection = async (pickedFiles: File[]) => {
    const validPicked: File[] = [];

    for (const f of pickedFiles) {
      const secResult = await validateFileSecurity(f, f.name, tool.accept, tool.maxMb);
      if (!secResult.valid) {
        toast.error(secResult.error || `File "${f.name}" was rejected for security or format reasons.`, {
          icon: <ShieldAlert className="h-5 w-5 text-red-500" />,
          duration: 5000,
        });
      } else {
        validPicked.push(f);
      }
    }

    if (validPicked.length === 0) return;

    if (tool.maxFiles > 1 && files.length > 0) {
      onFiles([...files, ...validPicked].slice(0, tool.maxFiles));
    } else {
      onFiles(validPicked.slice(0, tool.maxFiles));
    }
  };

  return (
    <label
      className={cn("upload-dropzone w-full cursor-pointer", `upload-dropzone-${tool.category}`)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropped = Array.from(e.dataTransfer.files ?? []);
        if (dropped.length > 0) {
          void handleFileSelection(dropped);
        }
      }}
    >
      <span className="upload-icon-container">
        <Upload />
      </span>
      <span className="text-center">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Click to upload or drag files here
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {tool.maxFiles > 1 ? `Up to ${tool.maxFiles} files` : "Single file"} · max{" "}
          {tool.maxMb} MB
        </p>
      </span>
      <input
        type="file"
        className="hidden"
        accept={tool.accept.join(",")}
        multiple={tool.maxFiles > 1}
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          if (picked.length > 0) {
            void handleFileSelection(picked);
          }
          e.target.value = "";
        }}
      />
      {files.length > 0 && (
        <ul className="w-full space-y-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-left text-sm dark:border-zinc-700 dark:bg-zinc-900">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300 font-medium">
                {f.name}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
