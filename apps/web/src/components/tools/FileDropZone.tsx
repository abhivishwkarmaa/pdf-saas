"use client";

import { Upload, X } from "lucide-react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  tool: ToolDefinition;
  files: File[];
  onFiles: (files: File[]) => void;
}

function isFileTypeAccepted(file: File, acceptList: string[]): boolean {
  if (!acceptList || acceptList.length === 0) return true;
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  return acceptList.some((pattern) => {
    const cleanPattern = pattern.trim().toLowerCase();
    if (cleanPattern.startsWith(".")) {
      return fileName.endsWith(cleanPattern);
    } else if (cleanPattern.endsWith("/*")) {
      const group = cleanPattern.slice(0, -2);
      return fileType.startsWith(group);
    } else {
      if (fileType === cleanPattern) return true;
      
      const parts = cleanPattern.split("/");
      if (parts.length === 2) {
        const ext = parts[1];
        if (fileName.endsWith("." + ext)) return true;
        if (ext === "jpeg" && fileName.endsWith(".jpg")) return true;
        if (ext === "jpg" && fileName.endsWith(".jpeg")) return true;
        if (ext === "heic" && fileName.endsWith(".heif")) return true;
        if (ext === "heif" && fileName.endsWith(".heic")) return true;
      }
      return false;
    }
  });
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

  return (
    <label className={cn("upload-dropzone w-full", `upload-dropzone-${tool.category}`)}>
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
          const invalidFiles = picked.filter(f => !isFileTypeAccepted(f, tool.accept));
          
          if (invalidFiles.length > 0) {
            const acceptedDisplay = tool.accept
              .map(a => a.startsWith(".") ? a.toUpperCase() : a.replace("image/", "").replace("application/", "").toUpperCase())
              .join(", ");
            toast.error(`Invalid file format. This tool only accepts: ${acceptedDisplay}`);
            
            const validPicked = picked.filter(f => isFileTypeAccepted(f, tool.accept));
            if (validPicked.length === 0) {
              e.target.value = "";
              return;
            }
            
            if (tool.maxFiles > 1 && files.length > 0) {
              onFiles([...files, ...validPicked].slice(0, tool.maxFiles));
            } else {
              onFiles(validPicked.slice(0, tool.maxFiles));
            }
          } else {
            if (tool.maxFiles > 1 && files.length > 0) {
              onFiles([...files, ...picked].slice(0, tool.maxFiles));
            } else {
              onFiles(picked.slice(0, tool.maxFiles));
            }
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
              <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300">
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
