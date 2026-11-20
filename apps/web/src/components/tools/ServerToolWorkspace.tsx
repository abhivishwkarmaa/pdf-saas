"use client";

import { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import { useFilePreviewUrls } from "@/hooks/use-file-preview-urls";
import { useTextFilePreview } from "@/hooks/use-text-file-preview";
import { ToolWorkspaceLayout } from "./ToolWorkspaceLayout";
import { FileDropZone } from "./FileDropZone";
import { PrimaryButton } from "./PrimaryButton";
import { ToolOptionsForm } from "./ToolOptionsForm";
import { SubmissionPreview } from "./SubmissionPreview";
import { ProcessingSuccessView } from "./ProcessingSuccessView";
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
  const [resultData, setResultData] = useState<{
    blob: Blob;
    fileName: string;
    originalSize: number;
    originalFileName: string;
  } | null>(null);
  const fileUrls = useFilePreviewUrls(files);
  const textSnippet = useTextFilePreview(files);

  // Live Text Editor State for Text Category Tools ONLY
  const isTextTool = tool.category === "text";
  const [editedText, setEditedText] = useState<string>("");
  const [originalFileText, setOriginalFileText] = useState<string>("");

  useEffect(() => {
    if (isTextTool && files.length > 0) {
      files[0]
        .text()
        .then((text) => {
          setEditedText(text);
          setOriginalFileText(text);
        })
        .catch(() => {});
    } else if (isTextTool && files.length === 0) {
      setEditedText("");
      setOriginalFileText("");
    }
  }, [files, isTextTool]);

  const process = async () => {
    let filesToSend = files;

    if (isTextTool && editedText.trim().length > 0) {
      const fileName = files[0]?.name || (tool.slug.includes("markdown") ? "document.md" : "document.txt");
      const fileType = files[0]?.type || "text/plain";
      const updatedFile = new File([editedText], fileName, { type: fileType });
      filesToSend = [updatedFile];
    }

    if (filesToSend.length === 0) {
      toast.error("Please select or enter file text");
      return;
    }
    if (filesToSend.length > tool.maxFiles) {
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
      filesToSend.forEach((f) => formData.append("files", f));
      formData.append("options", JSON.stringify(options));

      const xhr = new XMLHttpRequest();
      
      const responsePromise = new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            if (percent < 100) {
              setStatusMessage(`Uploading... ${percent}%`);
            } else {
              setStatusMessage("Upload complete. Processing on server...");
            }
          }
        });

        xhr.upload.addEventListener("load", () => {
          setStatusMessage("Converting document on server... Please wait");
        });

        xhr.addEventListener("load", async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            const disposition = xhr.getResponseHeader("Content-Disposition");
            const match = disposition?.match(/filename="([^\"]+)"/);
            const fileName = match?.[1] ?? "result";
            resolve({ blob, fileName });
          } else {
            try {
              const blob = xhr.response as Blob;
              const responseText = blob ? await blob.text() : "";
              const err = JSON.parse(responseText);
              reject(new Error(err.error ?? "Processing failed"));
            } catch (parseErr: any) {
              reject(new Error(parseErr?.message || "Processing failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error occurred during processing"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Processing aborted"));
        });

        xhr.responseType = "blob";
        xhr.open("POST", `/api/process/${tool.slug}`);
        xhr.send(formData);
      });

      const { blob, fileName } = await responsePromise;
      const originalTotalSize = filesToSend.reduce((acc, f) => acc + f.size, 0);
      const originalFirstName = filesToSend[0]?.name || "document";
      const decodedFileName = decodeURIComponent(fileName);

      // Trigger browser download immediately
      setStatusMessage("Starting download...");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mount the success view
      setResultData({
        blob,
        fileName: decodedFileName,
        originalSize: originalTotalSize,
        originalFileName: originalFirstName,
      });

      toast.success("Done! Your file has been processed successfully.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setProcessing(false);
      setStatusMessage("");
    }
  };

  if (resultData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Toaster position="top-center" richColors />
        <ProcessingSuccessView
          tool={tool}
          resultBlob={resultData.blob}
          resultFileName={resultData.fileName}
          originalFileName={resultData.originalFileName}
          originalSize={resultData.originalSize}
          itemCount={files.length}
          onReset={() => {
            setResultData(null);
            setFiles([]);
            setEditedText("");
            setOriginalFileText("");
          }}
        />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <ToolWorkspaceLayout
        tool={tool}
        mobileAction={
          (files.length > 0 || editedText.trim().length > 0) ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                  {tool.name}
                </p>
                <p className="text-[10px] text-muted truncate">
                  {files.length > 0 ? `${files.length} file(s) selected` : "Text content ready"}
                </p>
              </div>
              <PrimaryButton
                className={`!w-auto !py-2 !px-4 text-xs font-bold ${theme.button}`}
                label="Process Now"
                loading={processing}
                loadingLabel={statusMessage || "Processing..."}
                disabled={files.length === 0 && editedText.trim().length === 0}
                onClick={() => void process()}
              />
            </div>
          ) : null
        }
        preview={
          <SubmissionPreview
            tool={tool}
            files={files}
            fileUrls={fileUrls}
            textSnippet={textSnippet}
            options={options}
            editedText={editedText}
            onEditedTextChange={setEditedText}
            originalFileText={originalFileText}
            onResetFileText={() => setEditedText(originalFileText)}
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
          disabled={files.length === 0 && editedText.trim().length === 0}
          onClick={() => void process()}
        />
      </ToolWorkspaceLayout>
    </>
  );
}
