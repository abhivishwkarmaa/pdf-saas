"use client";

import { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import { useFilePreviewUrls } from "@/hooks/use-file-preview-urls";
import { useTextFilePreview } from "@/hooks/use-text-file-preview";
import { ToolWorkspaceLayout } from "./ToolWorkspaceLayout";
import { FileDropZone } from "./FileDropZone";
import { PrimaryButton } from "./PrimaryButton";
import { ToolOptionsForm } from "./ToolOptionsForm";
import { SubmissionPreview } from "./SubmissionPreview";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { getToolOptionDefaults } from "@/lib/tool-options";

interface ServerToolWorkspaceProps {
  tool: ToolDefinition;
}

export function ServerToolWorkspace({ tool }: ServerToolWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>(
    getToolOptionDefaults(tool.slug)
  );
  const [statusMessage, setStatusMessage] = useState("");
  const fileUrls = useFilePreviewUrls(files);
  const textSnippet = useTextFilePreview(files);

  const process = async () => {
    if (files.length === 0) {
      toast.error("Please select file(s)");
      return;
    }
    if (files.length > tool.maxFiles) {
      toast.error(`Maximum ${tool.maxFiles} file(s)`);
      return;
    }

    if (tool.slug === "protect-pdf") {
      if (!options.password) {
        toast.error("Please enter a password");
        return;
      }
      if (options.password !== options.repeatPassword) {
        toast.error("Passwords do not match!");
        return;
      }
    }

    setProcessing(true);
    setStatusMessage("Uploading... 0%");

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("options", JSON.stringify(options));

      const xhr = new XMLHttpRequest();
      
      let progressInterval: NodeJS.Timeout | null = null;
      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatusMessage(`Uploading... ${percent}%`);
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Analyzing document... 0%");
          let percent = 0;
          progressInterval = setInterval(() => {
            if (percent < 95) {
              percent += Math.floor(Math.random() * 3) + 1; // Increment by 1-3%
              if (percent > 95) percent = 95;
              
              if (percent < 25) {
                setStatusMessage(`Analyzing document... ${percent}%`);
              } else if (percent < 80) {
                setStatusMessage(`Converting layout & assets... ${percent}%`);
              } else {
                setStatusMessage(`Finalizing output... ${percent}%`);
              }
            }
          }, 350);
        });

        const cleanup = () => {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
        };

        xhr.addEventListener("load", () => {
          cleanup();
          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            const disposition = xhr.getResponseHeader("Content-Disposition");
            const match = disposition?.match(/filename="([^\"]+)"/);
            const fileName = match?.[1] ?? "result";
            resolve({ blob, fileName });
          } else {
            const responseText = xhr.responseText;
            try {
              const err = JSON.parse(responseText);
              reject(new Error(err.error ?? "Processing failed"));
            } catch {
              reject(new Error("Processing failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          cleanup();
          reject(new Error("Network error occurred"));
        });

        xhr.addEventListener("abort", () => {
          cleanup();
          reject(new Error("Processing aborted"));
        });

        xhr.responseType = "blob";
        xhr.open("POST", `/api/process/${tool.slug}`);
        xhr.send(formData);
      });

      const { blob, fileName } = await responsePromise;
      
      setStatusMessage("Downloading...");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(fileName);
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Done! Your file is ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <ToolWorkspaceLayout
        tool={tool}
        preview={
          <SubmissionPreview
            tool={tool}
            files={files}
            fileUrls={fileUrls}
            textSnippet={textSnippet}
            options={options}
          />
        }
      >
        <FileDropZone tool={tool} files={files} onFiles={setFiles} />
        <ToolOptionsForm slug={tool.slug} options={options} onChange={setOptions} />
        <PrimaryButton
          className={theme.button}
          label={`Process ${tool.name}`}
          loading={processing}
          loadingLabel={statusMessage || "Processing..."}
          disabled={files.length === 0}
          onClick={() => void process()}
        />
      </ToolWorkspaceLayout>
    </>
  );
}
