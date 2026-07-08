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
import { getToolOptionDefaults } from "@/lib/tool-options";

interface BrowserToolWorkspaceProps {
  tool: ToolDefinition;
}

export function BrowserToolWorkspace({ tool }: BrowserToolWorkspaceProps) {
  const theme = CATEGORY_THEME[tool.category];
  const [files, setFiles] = useState<File[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>(
    getToolOptionDefaults(tool.slug)
  );
  const fileUrls = useFilePreviewUrls(files);
  const textSnippet = useTextFilePreview(files);

  const handleFilesChange = (newFiles: File[]) => {
    if (newFiles.length < files.length) {
      const deletedIndex = files.findIndex((f) => !newFiles.includes(f));
      if (deletedIndex !== -1) {
        setRotations((prev) => prev.filter((_, idx) => idx !== deletedIndex));
      } else {
        setRotations((prev) => prev.slice(0, newFiles.length));
      }
    } else if (newFiles.length > files.length) {
      const diffCount = newFiles.length - files.length;
      setRotations((prev) => [...prev, ...new Array(diffCount).fill(0)]);
    }
    setFiles(newFiles);
  };

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
          const parts = await pdf.splitPdf(files[0], options.ranges || "1");
          if (parts.length > 10) {
            throw new Error("You can split into a maximum of 10 PDF files at a time to prevent browser download blocks.");
          }
          parts.forEach((b, i) => downloadBlob(b, `part-${i + 1}.pdf`));
          toast.success(`Downloaded ${parts.length} file(s)`);
          return;
        }
        case "remove-pages":
          blob = await pdf.removePages(files[0], options.pages || "1");
          downloadBlob(blob, "removed.pdf");
          break;
        case "extract-pages":
          blob = await pdf.extractPages(files[0], options.pages || "1");
          downloadBlob(blob, "extracted.pdf");
          break;
        case "organize-pdf":
          blob = await pdf.organizePdf(files[0], options.order || "1");
          downloadBlob(blob, "organized.pdf");
          break;
        case "rotate-pdf":
          blob = await pdf.rotatePdf(
            files[0],
            (Number(options.angle) || 90) as 90 | 180 | 270,
            options.pages
          );
          downloadBlob(blob, "rotated.pdf");
          break;
        case "jpg-to-pdf":
        case "png-to-pdf":
        case "scan-to-pdf":
        case "image-to-pdf": {
          const processedFiles = [...files];
          for (let i = 0; i < processedFiles.length; i++) {
            const rot = rotations[i] || 0;
            if (rot > 0) {
              processedFiles[i] = await rotateImageFileByAngle(processedFiles[i], rot);
            }
          }
          blob = await pdf.imagesToPdf(processedFiles, options);
          downloadBlob(blob, "document.pdf");
          break;
        }
        case "watermark-pdf":
          blob = await pdf.watermarkPdf(files[0], options.text || "CONFIDENTIAL");
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
          blob = await pdf.redactPdf(files[0], []);
          downloadBlob(blob, "redacted.pdf");
          break;
        case "sign-pdf":
          blob = await pdf.signPdf(files);
          downloadBlob(blob, "signed.pdf");
          break;
        case "jpg-to-png":
          blob = await img.convertImageFormat(files[0], "image/png");
          downloadBlob(blob, changeExtension(files[0].name, "png"));
          break;
        case "png-to-jpg":
        case "bmp-to-jpg":
          blob = await img.convertImageFormat(files[0], "image/jpeg");
          downloadBlob(blob, changeExtension(files[0].name, "jpg"));
          break;
        case "webp-to-jpg":
          blob = await img.convertImageFormat(files[0], "image/jpeg");
          downloadBlob(blob, changeExtension(files[0].name, "jpg"));
          break;
        case "jpg-to-webp":
          blob = await img.convertImageFormat(files[0], "image/webp");
          downloadBlob(blob, changeExtension(files[0].name, "webp"));
          break;
        case "compress-image": {
          let qualityVal = 75;
          if (options.quality === "extreme") {
            qualityVal = 40;
          } else if (options.quality === "high") {
            qualityVal = 92;
          } else if (options.quality === "recommended") {
            qualityVal = 75;
          } else {
            qualityVal = Number(options.quality) || 75;
          }
          blob = await img.compressImage(files[0], qualityVal);
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        }
        case "resize-image":
          blob = await img.resizeImage(
            files[0],
            Number(options.width) || 800,
            Number(options.height) || 600
          );
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "rotate-image":
          blob = await img.rotateImage(files[0], Number(options.angle) || 90);
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "gif-to-png":
          blob = await img.convertImageFormat(files[0], "image/png");
          downloadBlob(blob, changeExtension(files[0].name, "png"));
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
            onFilesChange={handleFilesChange}
            rotations={rotations}
            onRotationsChange={setRotations}
          />
        }
      >
        <FileDropZone tool={tool} files={files} onFiles={handleFilesChange} />
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

async function rotateImageFileByAngle(file: File, angle: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const rad = (angle * Math.PI) / 180;
        const isSwapped = (angle / 90) % 2 !== 0;
        canvas.width = isSwapped ? img.height : img.width;
        canvas.height = isSwapped ? img.width : img.height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
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

function changeExtension(fileName: string, newExt: string): string {
  return fileName.replace(/\.[^/.]+$/, "") + "." + newExt;
}
