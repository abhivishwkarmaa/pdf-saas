import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolBySlug, resolveRuntime, TOOL_CATEGORIES } from "@pdf-saas/shared";
import { BrowserToolWorkspace } from "@/components/tools/BrowserToolWorkspace";
import { ServerToolWorkspace } from "@/components/tools/ServerToolWorkspace";
import { UtilityWorkspace } from "@/components/tools/UtilityWorkspace";
import { VideoConverterWorkspace } from "@/components/tools/VideoConverterWorkspace";
import { ImageEditorWorkspace } from "@/components/tools/ImageEditorWorkspace";
import { VideoEditorWorkspace } from "@/components/tools/VideoEditorWorkspace";
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
  if (slug === "video-editor") {
    return <VideoEditorWorkspace tool={tool} />;
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
      {slug === "video-converter" ? (
        <VideoConverterWorkspace tool={tool} />
      ) : resolveRuntime(tool) === "utility" ? (
        <UtilityWorkspace tool={tool} />
      ) : resolveRuntime(tool) === "server" ? (
        <ServerToolWorkspace tool={tool} />
      ) : (
        <BrowserToolWorkspace tool={tool} />
      )}
    </div>
  );
}

