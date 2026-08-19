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
import { JsonFormatterWorkspace } from "@/components/tools/JsonFormatterWorkspace";
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
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <TextToPdfWorkspace tool={tool} />
      </div>
    );
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
      <div className="mx-auto max-w-6xl px-4 py-10">
        <MergePdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "split-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <SplitPdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "remove-pages") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <RemovePagesWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "extract-pages") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ExtractPagesWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "organize-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <OrganizePdfWorkspace tool={tool} />
      </div>
    );
  }

  if (slug === "rotate-pdf") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <RotatePdfWorkspace tool={tool} />
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

