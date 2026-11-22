import React from "react";
import type { ToolCategory } from "@pdf-saas/shared";
import {
  FileText,
  Image as ImageIcon,
  Type,
  Code2,
  Calculator,
} from "lucide-react";

export interface CategoryThemeConfig {
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  accent: string;
  bg: string;
  border: string;
  hoverBorder: string;
  activeTab: string;
  badge: string;
}

export const THEME_CONFIG: Record<ToolCategory, CategoryThemeConfig> = {
  pdf: {
    label: "PDF Tools",
    shortLabel: "PDF",
    icon: FileText,
    accent: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-900/60",
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-rose-500/5",
    activeTab: "bg-rose-600 text-white shadow-rose-600/25 border-rose-600",
    badge: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-900/80",
  },
  image: {
    label: "Image Tools",
    shortLabel: "Image",
    icon: ImageIcon,
    accent: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-900/60",
    hoverBorder: "hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-sky-500/5",
    activeTab: "bg-sky-600 text-white shadow-sky-600/25 border-sky-600",
    badge: "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/60 dark:border-sky-900/80",
  },
  text: {
    label: "Text Tools",
    shortLabel: "Text",
    icon: Type,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900/60",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-emerald-500/5",
    activeTab: "bg-emerald-600 text-white shadow-emerald-600/25 border-emerald-600",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-900/80",
  },
  developer: {
    label: "Developer Tools",
    shortLabel: "Dev",
    icon: Code2,
    accent: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-cyan-200 dark:border-cyan-900/60",
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-cyan-500/5",
    activeTab: "bg-cyan-600 text-white shadow-cyan-600/25 border-cyan-600",
    badge: "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/60 dark:border-cyan-900/80",
  },
  calculator: {
    label: "Calculators",
    shortLabel: "Calculators",
    icon: Calculator,
    accent: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-900/60",
    hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-orange-500/5",
    activeTab: "bg-orange-600 text-white shadow-orange-600/25 border-orange-600",
    badge: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/60 dark:border-orange-900/80",
  },
};
