import type { Metadata } from "next";
import { TOOLS, TOOL_CATEGORIES, type ToolCategory } from "@pdf-saas/shared";
import { ToolsDirectory } from "@/components/tools/ToolsDirectory";

export const metadata: Metadata = {
  title: "All Tools Directory — ConvertHub",
  description:
    "Explore 67+ private, browser-based utilities for PDF manipulation, image conversion, developer operations, and text formatting. Zero server uploads.",
  keywords: [
    "pdf tools",
    "image converter",
    "developer utilities",
    "online tools",
    "compress pdf",
    "merge pdf",
    "client-side converter",
  ],
};

export default function AllToolsPage() {
  const enabledTools = TOOLS.filter((t) => t.enabled);
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];

  return <ToolsDirectory tools={enabledTools} categories={categories} />;
}
