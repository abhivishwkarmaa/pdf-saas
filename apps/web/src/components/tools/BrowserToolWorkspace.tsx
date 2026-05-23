"use client";

import { useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import * as pdf from "@/lib/client/pdf-tools";
import * as img from "@/lib/client/image-tools";
import { downloadBlob } from "@/lib/client/pdf-tools";
import { imageDownloadName } from "@/lib/client/image-filename";
import { useFilePreviewUrls } from "@/hooks/use-file-preview-urls";
import { useTextFilePreview } from "@/hooks/use-text-file-preview";
import { ToolWorkspaceLayout } from "./ToolWorkspaceLayout";
import { FileDropZone } from "./FileDropZone";
import { PrimaryButton } from "./PrimaryButton";
import { ToolOptionsForm } from "./ToolOptionsForm";
import { SubmissionPreview } from "./SubmissionPreview";
import { CATEGORY_THEME } from "@/lib/category-theme";

interface BrowserToolWorkspaceProps {
  tool: ToolDefinition;
}

export function BrowserToolWorkspace({ tool }: BrowserToolWorkspaceProps) {
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
    setProcessing(true);
    try {
      let blob: Blob;
      const slug = tool.slug;

      switch (slug) {
        case "merge-pdf":
          blob = await pdf.mergePdfs(files);
          downloadBlob(blob, "merged.pdf");
          break;
        case "split-pdf": {
          const parts = await pdf.splitPdf(files[0], options.ranges ?? "1");
          parts.forEach((b, i) => downloadBlob(b, `part-${i + 1}.pdf`));
          toast.success(`Downloaded ${parts.length} file(s)`);
          return;
        }
        case "remove-pages":
          blob = await pdf.removePages(files[0], options.pages ?? "1");
          downloadBlob(blob, "removed.pdf");
          break;
        case "extract-pages":
          blob = await pdf.extractPages(files[0], options.pages ?? "1");
          downloadBlob(blob, "extracted.pdf");
          break;
        case "organize-pdf":
          blob = await pdf.organizePdf(files[0], options.order ?? "1");
          downloadBlob(blob, "organized.pdf");
          break;
        case "rotate-pdf":
          blob = await pdf.rotatePdf(
            files[0],
            (Number(options.angle) || 90) as 90 | 180 | 270
          );
          downloadBlob(blob, "rotated.pdf");
          break;
        case "jpg-to-pdf":
        case "png-to-pdf":
        case "scan-to-pdf":
        case "image-to-pdf":
          blob = await pdf.imagesToPdf(files);
          downloadBlob(blob, "document.pdf");
          break;
        case "watermark-pdf":
          blob = await pdf.watermarkPdf(files[0], options.text ?? "CONFIDENTIAL");
          downloadBlob(blob, "watermarked.pdf");
          break;
        case "page-numbers":
          blob = await pdf.addPageNumbers(files[0]);
          downloadBlob(blob, "numbered.pdf");
          break;
        case "txt-to-pdf":
          blob = await pdf.txtToPdf(files[0]);
          downloadBlob(blob, "document.pdf");
          break;
        case "crop-pdf":
          blob = await pdf.cropPdf(files[0]);
          downloadBlob(blob, "cropped.pdf");
          break;
        case "redact-pdf":
          blob = await pdf.redactPdf(files[0]);
          downloadBlob(blob, "redacted.pdf");
          break;
        case "sign-pdf":
          blob = await pdf.signPdf(files);
          downloadBlob(blob, "signed.pdf");
          break;
        case "jpg-to-png":
          blob = await img.convertImageFormat(files[0], "image/png");
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "png-to-jpg":
        case "bmp-to-jpg":
          blob = await img.convertImageFormat(files[0], "image/jpeg");
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "webp-to-jpg":
          blob = await img.convertImageFormat(files[0], "image/jpeg");
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "jpg-to-webp":
          blob = await img.convertImageFormat(files[0], "image/webp");
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "compress-image":
          blob = await img.compressImage(files[0], Number(options.quality) || 80);
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "resize-image":
          blob = await img.resizeImage(
            files[0],
            Number(options.width) || 800,
            Number(options.height) || 600
          );
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "crop-image":
          blob = await img.cropImage(files[0]);
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "rotate-image":
          blob = await img.rotateImage(files[0], Number(options.angle) || 90);
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "gif-to-png":
          blob = await img.convertImageFormat(files[0], "image/png");
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        default:
          toast.error("This tool is not available yet.");
          return;
      }
      toast.success("Done! Your file is ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Processing failed");
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
