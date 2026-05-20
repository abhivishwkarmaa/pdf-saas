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

interface ServerToolWorkspaceProps {
  tool: ToolDefinition;
}

export function ServerToolWorkspace({ tool }: ServerToolWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>({});
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
    setProcessing(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("options", JSON.stringify(options));

      const res = await fetch(`/api/process/${tool.slug}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Processing failed"
        );
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const fileName = match?.[1] ?? "result";

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
          loadingLabel="Processing..."
          disabled={files.length === 0}
          onClick={() => void process()}
        />
      </ToolWorkspaceLayout>
    </>
  );
}
