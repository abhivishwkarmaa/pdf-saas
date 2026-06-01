"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TOOLS,
  TOOL_CATEGORIES,
  getPopularTools,
  type ToolCategory,
} from "@pdf-saas/shared";
import { ToolSearch } from "@/components/home/ToolSearch";
import { ToolCard } from "@/components/home/ToolCard";
import { CategorySection } from "@/components/home/CategorySection";
import { FloatingToolBadge } from "@/components/ui/FloatingToolBadge";
import { MarqueeTrust } from "@/components/ui/MarqueeTrust";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { StatCounter } from "@/components/ui/StatCounter";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export default function HomePage() {
  const popular = getPopularTools();
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];
  const totalTools = TOOLS.filter((t) => t.enabled).length;

  return (
    <div className="bg-background text-foreground min-h-screen w-full relative overflow-x-clip">
      
      {/* HERO SECTION */}
      <section className="relative w-full min-h-screen overflow-hidden bg-background">
        {/* Full screen background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:36px_36px] z-0" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-600/10 dark:bg-purple-700/25 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-600/10 dark:bg-pink-700/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-600/10 dark:bg-violet-900/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full min-h-screen flex items-center px-[5vw] py-20">
          
          {/* LEFT SIDE — Text content */}
          <div className="flex-1 max-w-full lg:max-w-[55%] lg:pr-12 text-center lg:text-left flex flex-col items-center lg:items-start">

            {/* Animated badge */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/20 dark:border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 text-sm mb-8 backdrop-blur-sm"
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full"
              />
              ✨ AI-Powered File Conversion Platform
            </motion.div>

            {/* Headline — LEFT ALIGNED */}
            <div className="overflow-hidden mb-6">
              <motion.h1
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] tracking-tight text-center lg:text-left"
              >
                <span className="text-zinc-900 dark:text-white block">Convert</span>
                <span className="block bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 dark:from-purple-400 dark:via-pink-400 dark:to-orange-400 bg-clip-text text-transparent">
                  Anything.
                </span>
                <span className="text-zinc-900 dark:text-white block">Instantly.</span>
              </motion.h1>
            </div>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed mb-8 max-w-lg text-center lg:text-left"
            >
              {totalTools}+ free tools for PDF, images, video, audio, and more.
              No signup. No watermark. 100% private.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center gap-4 mb-12 justify-center lg:justify-start w-full sm:w-auto"
            >
              <motion.div
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(139,92,246,0.4)" }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  href="#popular-tools"
                  className="inline-block px-7 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl text-base shadow-xl shadow-purple-500/10 dark:shadow-purple-500/20 whitespace-nowrap"
                >
                  Start Converting Free →
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.03, borderColor: "rgba(139,92,246,0.3)" }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  href="#all-tools"
                  className="inline-block px-7 py-3.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-medium rounded-xl text-base backdrop-blur-sm hover:bg-zinc-200 dark:hover:bg-white/10 transition-all whitespace-nowrap"
                >
                  Browse All Tools
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center gap-8 justify-center lg:justify-start"
            >
              {[
                { value: `${totalTools}+`, label: "Free Tools" },
                { value: "1M+", label: "Conversions" },
                { value: "0", label: "Signup Needed" },
              ].map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-zinc-500 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT SIDE — Animated tool cards showcase */}
          <div className="flex-1 relative h-[600px] hidden lg:block overflow-hidden">

            {/* Floating tool cards — 3 columns staggered */}
            <div className="absolute inset-0 flex items-center justify-center">
              
              {/* Column 1 — scrolls up */}
              <motion.div
                animate={{ y: [0, -40, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="flex flex-col gap-3 mr-3 shrink-0"
              >
                {["PDF to Word", "Merge PDF", "Compress PDF", "Split PDF", "OCR PDF", "Rotate PDF"].map((tool, i) => (
                  <motion.div
                    key={tool}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="px-4 py-3 rounded-xl bg-white/60 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-sm text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap hover:border-purple-500/40 hover:bg-white/80 dark:hover:bg-white/8 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400" />
                    {tool}
                  </motion.div>
                ))}
              </motion.div>

              {/* Column 2 — scrolls down, offset */}
              <motion.div
                animate={{ y: [0, 40, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="flex flex-col gap-3 mx-3 mt-12 shrink-0"
              >
                {["Image to PDF", "Compress Image", "Background Remover", "Video to MP4", "AI Remove Pages", "Word Counter"].map((tool, i) => (
                  <motion.div
                    key={tool}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.08 }}
                    className="px-4 py-3 rounded-xl bg-white/60 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-sm text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap hover:border-pink-500/40 hover:bg-white/80 dark:hover:bg-white/8 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-pink-500 dark:bg-pink-400" />
                    {tool}
                  </motion.div>
                ))}
              </motion.div>

              {/* Column 3 — scrolls up, more offset */}
              <motion.div
                animate={{ y: [0, -30, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="flex flex-col gap-3 ml-3 mt-6 shrink-0"
              >
                {["Base64 Encode", "JSON Formatter", "URL Encoder", "Text Diff", "BMI Calculator", "Lorem Ipsum"].map((tool, i) => (
                  <motion.div
                    key={tool}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.08 }}
                    className="px-4 py-3 rounded-xl bg-white/60 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-sm text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap hover:border-blue-500/40 hover:bg-white/80 dark:hover:bg-white/8 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                    {tool}
                  </motion.div>
                ))}
              </motion.div>

              {/* Gradient fade top and bottom */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
            </div>
          </div>
        </div>

        {/* Bottom search bar — full width */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="absolute bottom-12 left-0 right-0 px-[5vw] z-20"
        >
          <ToolSearch />
        </motion.div>
      </section>

      {/* INFINITE MARQUEE TRUST BAR — Edge to Edge */}
      <section className="w-full overflow-hidden">
        <MarqueeTrust />
      </section>

      {/* FEATURES GRID — Bento layout */}
      <section className="w-full">
        <BentoGrid />
      </section>

      {/* POPULAR TOOLS SECTION — 6-8 columns */}
      <section id="popular-tools" className="w-full px-[5vw] py-24 bg-background scroll-mt-16 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
          >
            Most Popular Tools
          </motion.h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            Quick access to our highest-performing and most frequently used file conversion utilities.
          </p>
        </div>

        {/* Dynamic wide grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4"
        >
          {popular.map((tool) => (
            <motion.div key={tool.slug} variants={fadeInUp}>
              <ToolCard tool={tool} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ALL TOOLS SECTION */}
      <section id="all-tools" className="w-full px-[5vw] pb-32 bg-background space-y-16 scroll-mt-16 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
          >
            All Free Tools
          </motion.h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            Browse our full catalog of online file processing tools, categorized for speed and efficiency.
          </p>
        </div>

        <div className="space-y-8">
          {categories.map((cat, i) => {
            const categoryTools = TOOLS.filter((t) => t.category === cat && t.enabled);
            return (
              <CategorySection
                key={cat}
                category={cat}
                tools={categoryTools}
                index={i}
              />
            );
          })}
        </div>
      </section>

    </div>
  );
}
