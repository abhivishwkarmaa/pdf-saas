import type { ToolCategory } from "@pdf-saas/shared";
import {
  Calculator,
  Code,
  FileText,
  Image,
  Type,
  Video,
  type LucideIcon,
} from "lucide-react";

export interface CategoryTheme {
  icon: LucideIcon;
  label: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  sectionBg: string;
  button: string;
  ring: string;
}

export const CATEGORY_THEME: Record<ToolCategory, CategoryTheme> = {
  pdf: {
    icon: FileText,
    label: "PDF",
    accent: "text-red-600",
    accentBg: "bg-red-50 dark:bg-red-950/50",
    accentBorder: "border-red-200 dark:border-red-900",
    sectionBg: "bg-white dark:bg-zinc-900",
    button: "bg-red-600 hover:bg-red-700",
    ring: "focus:ring-red-500",
  },
  image: {
    icon: Image,
    label: "Image",
    accent: "text-blue-600",
    accentBg: "bg-blue-50 dark:bg-blue-950/50",
    accentBorder: "border-blue-200 dark:border-blue-900",
    sectionBg: "bg-white dark:bg-zinc-900",
    button: "bg-blue-600 hover:bg-blue-700",
    ring: "focus:ring-blue-500",
  },
  video: {
    icon: Video,
    label: "Video",
    accent: "text-cyan-600",
    accentBg: "bg-cyan-50 dark:bg-cyan-950/50",
    accentBorder: "border-cyan-200 dark:border-cyan-900",
    sectionBg: "bg-white dark:bg-zinc-900",
    button: "bg-cyan-600 hover:bg-cyan-700",
    ring: "focus:ring-cyan-500",
  },
  text: {
    icon: Type,
    label: "Text",
    accent: "text-violet-600",
    accentBg: "bg-violet-50 dark:bg-violet-950/50",
    accentBorder: "border-violet-200 dark:border-violet-900",
    sectionBg: "bg-white dark:bg-zinc-900",
    button: "bg-violet-600 hover:bg-violet-700",
    ring: "focus:ring-violet-500",
  },
  developer: {
    icon: Code,
    label: "Developer",
    accent: "text-amber-600",
    accentBg: "bg-amber-50 dark:bg-amber-950/50",
    accentBorder: "border-amber-200 dark:border-amber-900",
    sectionBg: "bg-white dark:bg-zinc-900",
    button: "bg-amber-600 hover:bg-amber-700",
    ring: "focus:ring-amber-500",
  },
  calculator: {
    icon: Calculator,
    label: "Calculator",
    accent: "text-teal-600",
    accentBg: "bg-teal-50 dark:bg-teal-950/50",
    accentBorder: "border-teal-200 dark:border-teal-900",
    sectionBg: "bg-gradient-to-br from-teal-50/80 to-white dark:from-teal-950/30 dark:to-zinc-900",
    button: "bg-teal-600 hover:bg-teal-700",
    ring: "focus:ring-teal-500",
  },
};
