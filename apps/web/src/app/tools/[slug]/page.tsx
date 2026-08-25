import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolBySlug, resolveRuntime, TOOL_CATEGORIES } from "@pdf-saas/shared";
import { BrowserToolWorkspace } from "@/components/tools/BrowserToolWorkspace";
import { ServerToolWorkspace } from "@/components/tools/ServerToolWorkspace";
import { UtilityWorkspace } from "@/components/tools/UtilityWorkspace";
import { ImageEditorWorkspace } from "@/components/tools/ImageEditorWorkspace";
import { CropPdfWorkspace } from "@/components/tools/CropPdfWorkspace";
import { CropImageWorkspace } from "@/components/tools/CropImageWorkspace";
import { RedactPdfWorkspace } from "@/components/tools/RedactPdfWorkspace";
import { HtmlToPdfWorkspace } from "@/components/tools/HtmlToPdfWorkspace";
import { TextToPdfWorkspace } from "@/components/tools/TextToPdfWorkspace";
import { MarkdownToPdfWorkspace } from "@/components/tools/MarkdownToPdfWorkspace";
import { MarkdownToWordWorkspace } from "@/components/tools/MarkdownToWordWorkspace";
import { RtfToPdfWorkspace } from "@/components/tools/RtfToPdfWorkspace";
import { TexToWordWorkspace } from "@/components/tools/TexToWordWorkspace";
import { PagesToWordWorkspace } from "@/components/tools/PagesToWordWorkspace";
import { EpubToPdfWorkspace } from "@/components/tools/EpubToPdfWorkspace";
import { PageNumbersWorkspace } from "@/components/tools/PageNumbersWorkspace";
import { WatermarkPdfWorkspace } from "@/components/tools/WatermarkPdfWorkspace";
import { SignPdfWorkspace } from "@/components/tools/SignPdfWorkspace";
import { ComparePdfWorkspace } from "@/components/tools/ComparePdfWorkspace";
import { MergePdfWorkspace } from "@/components/tools/MergePdfWorkspace";
import { SplitPdfWorkspace } from "@/components/tools/SplitPdfWorkspace";
import { RemovePagesWorkspace } from "@/components/tools/RemovePagesWorkspace";
import { ExtractPagesWorkspace } from "@/components/tools/ExtractPagesWorkspace";
import { OrganizePdfWorkspace } from "@/components/tools/OrganizePdfWorkspace";
import { RotatePdfWorkspace } from "@/components/tools/RotatePdfWorkspace";
import { PdfToImageWorkspace } from "@/components/tools/PdfToImageWorkspace";
import { ImageToPdfWorkspace } from "@/components/tools/ImageToPdfWorkspace";
import { CompressPdfWorkspace } from "@/components/tools/CompressPdfWorkspace";
import { PdfToPdfaWorkspace } from "@/components/tools/PdfToPdfaWorkspace";
import { RepairPdfWorkspace } from "@/components/tools/RepairPdfWorkspace";
import { PdfToWordWorkspace } from "@/components/tools/PdfToWordWorkspace";
import { PdfToPowerPointWorkspace } from "@/components/tools/PdfToPowerPointWorkspace";
import { PdfToExcelWorkspace } from "@/components/tools/PdfToExcelWorkspace";
import { WordToPdfWorkspace } from "@/components/tools/WordToPdfWorkspace";
import { PowerPointToPdfWorkspace } from "@/components/tools/PowerPointToPdfWorkspace";
import { ExcelToPdfWorkspace } from "@/components/tools/ExcelToPdfWorkspace";
import { PdfToTextWorkspace } from "@/components/tools/PdfToTextWorkspace";
import { JsonFormatterWorkspace } from "@/components/tools/JsonFormatterWorkspace";
import { ProtectPdfWorkspace } from "@/components/tools/ProtectPdfWorkspace";
import { UnlockPdfWorkspace } from "@/components/tools/UnlockPdfWorkspace";
import { OcrPdfWorkspace } from "@/components/tools/OcrPdfWorkspace";
import { ImageToWordWorkspace } from "@/components/tools/ImageToWordWorkspace";
import { ScanToPdfWorkspace } from "@/components/tools/ScanToPdfWorkspace";
import { CompressImageWorkspace } from "@/components/tools/CompressImageWorkspace";
import { ResizeImageWorkspace } from "@/components/tools/ResizeImageWorkspace";
import { RotateImageWorkspace } from "@/components/tools/RotateImageWorkspace";
import { ImageToJpgWorkspace } from "@/components/tools/ImageToJpgWorkspace";
import { JpgToImageWorkspace } from "@/components/tools/JpgToImageWorkspace";
import { JpgToPngWorkspace } from "@/components/tools/JpgToPngWorkspace";
import { PngToJpgWorkspace } from "@/components/tools/PngToJpgWorkspace";
import { JpgToWebpWorkspace } from "@/components/tools/JpgToWebpWorkspace";
import { WebpToJpgWorkspace } from "@/components/tools/WebpToJpgWorkspace";
import { HeicToJpgWorkspace } from "@/components/tools/HeicToJpgWorkspace";
import { GifToPngWorkspace } from "@/components/tools/GifToPngWorkspace";
import { BmpToJpgWorkspace } from "@/components/tools/BmpToJpgWorkspace";
import { AvifToJpgWorkspace } from "@/components/tools/AvifToJpgWorkspace";
import { SvgToJpgWorkspace } from "@/components/tools/SvgToJpgWorkspace";
import { CATEGORY_THEME } from "@/lib/category-theme";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { TOOLS } = await import("@pdf-saas/shared");
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return { title: "Tool not found" };
  return {
    title: tool.name,
    description: tool.description,
    openGraph: {
      title: `${tool.name} — Free Online`,
      description: tool.description,
    },
  };
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool || !tool.enabled) notFound();

  // Full-screen editors bypass the standard tool page layout
  if (slug === "image-editor") {
    return <ImageEditorWorkspace tool={tool} />;
  }

  if (slug === "crop-pdf") {
    return <CropPdfWorkspace tool={tool} />;
  }

  if (slug === "crop-image") {
    return <CropImageWorkspace tool={tool} />;
  }

  if (slug === "redact-pdf") {
    return <RedactPdfWorkspace tool={tool} />;
  }


  if (slug === "html-to-pdf") {
    return <HtmlToPdfWorkspace tool={tool} />;
  }

  if (slug === "txt-to-pdf") {
    return <TextToPdfWorkspace tool={tool} />;
  }

  if (slug === "markdown-to-pdf") {
    return <MarkdownToPdfWorkspace tool={tool} />;
  }

  if (slug === "markdown-to-word") {
    return <MarkdownToWordWorkspace tool={tool} />;
  }

  if (slug === "rtf-to-pdf") {
    return <RtfToPdfWorkspace tool={tool} />;
  }

  if (slug === "tex-to-word") {
    return <TexToWordWorkspace tool={tool} />;
  }

  if (slug === "pages-to-word") {
    return <PagesToWordWorkspace tool={tool} />;
  }

  if (slug === "epub-to-pdf") {
    return <EpubToPdfWorkspace tool={tool} />;
  }

  if (slug === "page-numbers") {
    return <PageNumbersWorkspace tool={tool} />;
  }

  if (slug === "sign-pdf") {
    return <SignPdfWorkspace tool={tool} />;
  }

  if (slug === "compare-pdf") {
    return <ComparePdfWorkspace tool={tool} />;
  }

  if (slug === "merge-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <MergePdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "split-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <SplitPdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "remove-pages") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <RemovePagesWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "extract-pages") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <ExtractPagesWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "organize-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <OrganizePdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "rotate-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <RotatePdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "pdf-to-jpg" || slug === "pdf-to-png" || slug === "pdf-to-image") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <PdfToImageWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "scan-to-pdf") {
    return <ScanToPdfWorkspace tool={tool} />;
  }

  if (slug === "jpg-to-pdf" || slug === "png-to-pdf" || slug === "image-to-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <ImageToPdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "compress-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <CompressPdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "pdf-to-pdfa") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <PdfToPdfaWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "repair-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <RepairPdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "pdf-to-word") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <PdfToWordWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "pdf-to-powerpoint") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <PdfToPowerPointWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "pdf-to-excel") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <PdfToExcelWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "word-to-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <WordToPdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "powerpoint-to-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <PowerPointToPdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "excel-to-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <ExcelToPdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "pdf-to-text") {
    return (
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <PdfToTextWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "watermark-pdf") {
    return <WatermarkPdfWorkspace tool={tool} />;
  }

  if (slug === "json-formatter") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <JsonFormatterWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "protect-pdf") {
    return <ProtectPdfWorkspace tool={tool} />;
  }

  if (slug === "unlock-pdf") {
    return <UnlockPdfWorkspace tool={tool} />;
  }

  if (slug === "ocr-pdf") {
    return <OcrPdfWorkspace tool={tool} />;
  }

  if (slug === "image-to-word") {
    return <ImageToWordWorkspace tool={tool} />;
  }

  if (slug === "compress-image") {
    return <CompressImageWorkspace tool={tool} />;
  }

  if (slug === "resize-image") {
    return <ResizeImageWorkspace tool={tool} />;
  }

  if (slug === "rotate-image") {
    return <RotateImageWorkspace tool={tool} />;
  }

  if (slug === "image-to-jpg") {
    return <ImageToJpgWorkspace tool={tool} />;
  }

  if (slug === "jpg-to-image") {
    return <JpgToImageWorkspace tool={tool} />;
  }

  if (slug === "jpg-to-png") {
    return <JpgToPngWorkspace tool={tool} />;
  }

  if (slug === "png-to-jpg") {
    return <PngToJpgWorkspace tool={tool} />;
  }

  if (slug === "jpg-to-webp") {
    return <JpgToWebpWorkspace tool={tool} />;
  }

  if (slug === "webp-to-jpg") {
    return <WebpToJpgWorkspace tool={tool} />;
  }

  if (slug === "heic-to-jpg") {
    return <HeicToJpgWorkspace tool={tool} />;
  }

  if (slug === "gif-to-png") {
    return <GifToPngWorkspace tool={tool} />;
  }

  if (slug === "bmp-to-jpg") {
    return <BmpToJpgWorkspace tool={tool} />;
  }

  if (slug === "avif-to-jpg") {
    return <AvifToJpgWorkspace tool={tool} />;
  }

  if (slug === "svg-to-jpg") {
    return <SvgToJpgWorkspace tool={tool} />;
  }

  const theme = CATEGORY_THEME[tool.category];
  const Icon = theme.icon;
  const categoryMeta = TOOL_CATEGORIES[tool.category];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 text-center">
        <span
          className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.accentBg} ${theme.accentBorder} ${theme.accent}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {categoryMeta.label}
        </span>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          {tool.name}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
          {tool.description}
        </p>
      </div>
      {resolveRuntime(tool) === "utility" ? (
        <UtilityWorkspace tool={tool} />
      ) : resolveRuntime(tool) === "server" ? (
        <ServerToolWorkspace tool={tool} />
      ) : slug === "merge-pdf" ? (
        <MergePdfWorkspace tool={tool} />
      ) : (
        <BrowserToolWorkspace tool={tool} />
      )}
    </div>
  );
}

