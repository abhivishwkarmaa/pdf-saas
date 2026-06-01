"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TOOLS, TOOL_CATEGORIES, type ToolCategory } from "@pdf-saas/shared";
import { CategoryPreview } from "@/components/home/CategoryPreview";
import {
  FileText,
  Image,
  Video,
  Type,
  Code2,
  Calculator,
  ArrowRight,
} from "lucide-react";

const CAT_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  image: Image,
  video: Video,
  text: Type,
  developer: Code2,
  calculator: Calculator,
};

const CAT_COLORS: Record<string, string> = {
  pdf: "text-rose-600 dark:text-rose-400",
  image: "text-sky-600 dark:text-sky-400",
  video: "text-violet-600 dark:text-violet-400",
  text: "text-emerald-600 dark:text-emerald-400",
  developer: "text-cyan-600 dark:text-cyan-400",
  calculator: "text-orange-600 dark:text-orange-400",
};

const CAT_BG: Record<string, string> = {
  pdf: "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20",
  image: "bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/20",
  video: "bg-violet-500/5 dark:bg-violet-500/10 border-violet-500/20",
  text: "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20",
  developer: "bg-cyan-500/5 dark:bg-cyan-500/10 border-cyan-500/20",
  calculator: "bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/20",
};

export default function AllToolsPage() {
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <title>All Tools — ConvertHub</title>
      <meta name="description" content="Browse all 70+ free online tools for PDF, image, video, audio, text, developer utilities, and AI-powered processing." />

      {/* Hero */}
      <div className="relative border-b border-zinc-200 dark:border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.15),transparent)] pointer-events-none" />
        <div className="relative w-full px-[5vw] py-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3"
          >
            All{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
              {TOOLS.filter((t) => t.enabled).length}+ Free Tools
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-zinc-600 dark:text-zinc-400 text-lg"
          >
            PDF, Image, Video, Audio, Text, Developer & AI tools — no signup, no watermark.
          </motion.p>
        </div>
      </div>

      {/* Category quick nav */}
      <div className="border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-100/80 dark:bg-zinc-900/40">
        <div className="w-full px-[5vw] py-3 flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => {
            const Icon = CAT_ICONS[cat] || FileText;
            return (
              <a
                key={cat}
                href={`#${cat}`}
                className={`flex items-center gap-1.5 rounded-full border ${CAT_BG[cat]} px-3 py-1.5 text-xs font-medium ${CAT_COLORS[cat]} hover:opacity-80 transition`}
              >
                <Icon className="h-3 w-3" />
                {TOOL_CATEGORIES[cat].label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Tools by category */}
      <div className="w-full px-[5vw] py-12 space-y-20">
        {categories.map((cat) => {
          const tools = TOOLS.filter((t) => t.category === cat && t.enabled);
          if (!tools.length) return null;
          const Icon = CAT_ICONS[cat] || FileText;
          return (
            <section key={cat} id={cat} className="scroll-mt-20">
              
              {/* Category header animates in first */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-between mb-6"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${CAT_BG[cat]}`}>
                    <Icon className={`h-7 w-7 ${CAT_COLORS[cat]}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                      {TOOL_CATEGORIES[cat].label}
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-500 leading-relaxed mt-1">
                      {TOOL_CATEGORIES[cat].description}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/${cat === "calculator" ? "calculators" : cat + "-tools"}`}
                  className={`text-xs font-semibold ${CAT_COLORS[cat]} hover:underline flex items-center gap-1`}
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </motion.div>

              {/* Grid content containing Category Preview on Left and Staggered Tools on Right */}
              <div className="grid gap-8 lg:grid-cols-[minmax(260px,320px)_1fr] lg:items-start">
                
                {/* Left side preview card */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="lg:sticky lg:top-24 z-10"
                >
                  <CategoryPreview category={cat} />
                </motion.div>

                {/* Right side staggered animated tool cards */}
                <motion.div
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06 } },
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6"
                >
                  {tools.map((tool) => (
                    <motion.div
                      key={tool.slug}
                      variants={{
                        hidden: { opacity: 0, y: 24, scale: 0.95 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: { duration: 0.35, ease: "easeOut" },
                        },
                      }}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="h-full hover:shadow-lg hover:shadow-purple-500/10 rounded-2xl"
                    >
                      <Link
                        href={`/tools/${tool.slug}`}
                        className="group flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/60 dark:bg-white/4 border border-zinc-200 dark:border-white/8 hover:bg-white/80 dark:hover:bg-white/8 hover:border-purple-500/40 dark:hover:border-purple-500/40 transition-all duration-300 h-full text-left"
                      >
                        {/* Icon with hover scale */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 group-hover:border-purple-400/40 transition-all duration-300">
                          <Icon className={`w-6 h-6 ${CAT_COLORS[cat]} group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors`} />
                        </div>

                        {/* Tool name */}
                        <div className="min-w-0 w-full">
                          <div className="text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors leading-tight truncate">
                            {tool.name}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-500 mt-1 leading-relaxed line-clamp-2">
                            {tool.description}
                          </div>
                        </div>

                        {/* Arrow — appears on hover */}
                        <div className="mt-auto text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-all duration-300 text-xs font-medium transform -translate-x-2 group-hover:translate-x-0">
                          Try now →
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>

              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
