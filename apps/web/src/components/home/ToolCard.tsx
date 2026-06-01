"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ToolDefinition } from "@pdf-saas/shared";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { ArrowRight } from "lucide-react";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const theme = CATEGORY_THEME[tool.category] ?? CATEGORY_THEME.pdf;
  const Icon = theme.icon;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Link
        href={`/tools/${tool.slug}`}
        className="group relative flex flex-col h-full p-6 rounded-2xl bg-white/60 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:border-purple-500/50 dark:hover:border-purple-500/50 backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden text-left"
      >
        {/* Gradient glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-pink-600/0 group-hover:from-purple-600/10 group-hover:to-pink-600/10 transition-all duration-300 rounded-2xl" />

        {/* Icon container */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-500/20 dark:border-purple-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>

        {/* Title */}
        <h3 className="text-zinc-900 dark:text-white font-semibold text-base mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
          {tool.name}
        </h3>

        {/* Description */}
        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed flex-1 line-clamp-2">
          {tool.description}
        </p>

        {/* Hover indicators */}
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">
          <span>Open Tool</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </Link>
    </motion.div>
  );
}
export default ToolCard;
