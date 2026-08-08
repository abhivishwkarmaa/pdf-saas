"use client";

import { useState, useEffect } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import JSZip from "jszip";
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
  const [statusMessage, setStatusMessage] = useState("");
  const [options, setOptions] = useState<Record<string, string>>(
    getToolOptionDefaults(tool.slug)
  );
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
    let filesToSend = files;

    if (isTextTool && editedText.trim().length > 0) {
      const fileName = files[0]?.name || "document.txt";
      const fileType = files[0]?.type || "text/plain";
      const updatedFile = new File([editedText], fileName, { type: fileType });
      filesToSend = [updatedFile];
    }

    if (filesToSend.length === 0) {
      toast.error("Please select or enter file text");
      return;
    }
    setProcessing(true);
    setStatusMessage("Reading file... 10%");
    try {
      let blob: Blob;
      const slug = tool.slug;

      switch (slug) {
        case "merge-pdf":
          blob = await pdf.mergePdfs(filesToSend, (pct) => setStatusMessage(`Merging PDFs... ${pct}%`));
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "merged.pdf");
          break;
        case "split-pdf": {
          const parts = await pdf.splitPdf(filesToSend[0], options.ranges || "1", (pct) => setStatusMessage(`Splitting PDF... ${pct}%`));
          if (parts.length > 10) {
            throw new Error("You can split into a maximum of 10 PDF files at a time to prevent browser download blocks.");
          }
          setStatusMessage("Downloading... 100%");
          parts.forEach((b, i) => downloadBlob(b, `part-${i + 1}.pdf`));
          toast.success(`Downloaded ${parts.length} file(s)`);
          return;
        }
        case "remove-pages":
          setStatusMessage("Processing layout... 40%");
          blob = await pdf.removePages(filesToSend[0], options.pages || "1");
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "removed.pdf");
          break;
        case "extract-pages":
          setStatusMessage("Processing layout... 40%");
          blob = await pdf.extractPages(filesToSend[0], options.pages || "1");
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "extracted.pdf");
          break;
        case "organize-pdf":
          setStatusMessage("Re-ordering pages... 40%");
          blob = await pdf.organizePdf(filesToSend[0], options.order || "1");
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "organized.pdf");
          break;
        case "rotate-pdf":
          setStatusMessage("Rotating document... 40%");
          blob = await pdf.rotatePdf(
            filesToSend[0],
            (Number(options.angle) || 90) as 90 | 180 | 270,
            options.pages
          );
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "rotated.pdf");
          break;
        case "jpg-to-pdf":
        case "png-to-pdf":
        case "scan-to-pdf":
        case "image-to-pdf": {
          const processedFiles = [...filesToSend];
          for (let i = 0; i < processedFiles.length; i++) {
            setStatusMessage(`Rotating images... ${Math.round((i / processedFiles.length) * 100)}%`);
            const rot = rotations[i] || 0;
            if (rot > 0) {
              processedFiles[i] = await rotateImageFileByAngle(processedFiles[i], rot);
            }
          }
          setStatusMessage("Assembling PDF... 0%");
          blob = await pdf.imagesToPdf(processedFiles, options, (pct) => setStatusMessage(`Assembling PDF... ${pct}%`));
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "document.pdf");
          break;
        }
        case "watermark-pdf":
          setStatusMessage("Applying watermark... 50%");
          blob = await pdf.watermarkPdf(filesToSend[0], options.text || "CONFIDENTIAL");
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "watermarked.pdf");
          break;
        case "page-numbers":
          setStatusMessage("Adding page numbers... 50%");
          blob = await pdf.addPageNumbers(filesToSend[0]);
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "numbered.pdf");
          break;
        case "txt-to-pdf":
          setStatusMessage("Generating layout... 50%");
          blob = await pdf.txtToPdf(filesToSend[0] || editedText);
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "document.pdf");
          break;
        case "crop-pdf":
          setStatusMessage("Cropping pages... 50%");
          blob = await pdf.cropPdf(files[0]);
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "cropped.pdf");
          break;
        case "redact-pdf":
          setStatusMessage("Redacting text... 50%");
          blob = await pdf.redactPdf(files[0], []);
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "redacted.pdf");
          break;
        case "sign-pdf":
          setStatusMessage("Signing document... 50%");
          blob = await pdf.signPdf(files);
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, "signed.pdf");
          break;
        case "jpg-to-png": {
          setStatusMessage("Converting format... 50%");
          const maxDimension = 800;
          if (files.length === 1) {
            blob = await img.convertImageFormat(files[0], "image/png", { maxDimension });
            setStatusMessage("Downloading... 100%");
            downloadBlob(blob, changeExtension(files[0].name, "png"));
          } else {
            const zip = new JSZip();
            for (let i = 0; i < files.length; i++) {
              setStatusMessage(`Converting image ${i + 1} of ${files.length}...`);
              const convertedBlob = await img.convertImageFormat(files[i], "image/png", { maxDimension });
              const name = changeExtension(files[i].name, "png");
              zip.file(name, convertedBlob);
            }
            setStatusMessage("Creating ZIP archive...");
            const zipBlob = await zip.generateAsync({ type: "blob" });
            setStatusMessage("Downloading ZIP... 100%");
            downloadBlob(zipBlob, "converted-images.zip");
          }
          break;
        }
        case "png-to-jpg":
        case "bmp-to-jpg":
          setStatusMessage("Converting format... 50%");
          blob = await img.convertImageFormat(files[0], "image/jpeg");
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, changeExtension(files[0].name, "jpg"));
          break;
        case "webp-to-jpg":
          setStatusMessage("Converting format... 50%");
          blob = await img.convertImageFormat(files[0], "image/jpeg");
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, changeExtension(files[0].name, "jpg"));
          break;
        case "jpg-to-webp":
          setStatusMessage("Converting format... 50%");
          blob = await img.convertImageFormat(files[0], "image/webp");
          setStatusMessage("Downloading... 100%");
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
          setStatusMessage("Compressing image... 50%");
          blob = await img.compressImage(files[0], qualityVal);
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        }
        case "resize-image":
          setStatusMessage("Resizing image... 50%");
          blob = await img.resizeImage(
            files[0],
            Number(options.width) || 800,
            Number(options.height) || 600
          );
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "rotate-image":
          setStatusMessage("Rotating image... 50%");
          blob = await img.rotateImage(files[0], Number(options.angle) || 90);
          setStatusMessage("Downloading... 100%");
          downloadBlob(blob, imageDownloadName(files[0]));
          break;
        case "gif-to-png":
          setStatusMessage("Converting format... 50%");
          blob = await img.convertImageFormat(files[0], "image/png");
          setStatusMessage("Downloading... 100%");
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
            onFilesChange={handleFilesChange}
            rotations={rotations}
            onRotationsChange={setRotations}
            editedText={editedText}
            onEditedTextChange={setEditedText}
            originalFileText={originalFileText}
            onResetFileText={() => setEditedText(originalFileText)}
          />
        }
      >
        <FileDropZone tool={tool} files={files} onFiles={handleFilesChange} />
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
