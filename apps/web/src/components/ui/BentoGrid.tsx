"use client";

import { motion } from "framer-motion";
import { Zap, Shield, Sparkles, Layers, Gift } from "lucide-react";

export function BentoGrid() {
  return (
    <section className="w-full px-[5vw] py-24 bg-background relative">
      {/* Background glow orb behind bento */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center max-w-3xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-purple-600 dark:text-purple-400 text-sm font-semibold uppercase tracking-wider mb-3"
        >
          Why Choose ConvertHub
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
        >
          Everything you need to
          <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent"> convert files</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-zinc-600 dark:text-zinc-400 text-lg"
        >
          Fast, secure, and entirely browser-based. Zero hassle, maximum performance.
        </motion.p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        {/* Large card */}
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2 p-10 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 dark:from-purple-900/50 dark:to-pink-900/30 border border-purple-500/20 backdrop-blur-md relative overflow-hidden group transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-purple-600 dark:text-purple-400 text-sm font-semibold uppercase tracking-wider mb-2">⚡ Lightning Fast</div>
            <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4">Convert files in seconds</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">Our optimized pipeline processes your files instantly using server-side FFmpeg and LibreOffice. No lag, just pure speed.</p>
          </div>
        </motion.div>

        {/* Small card */}
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="p-8 md:p-10 rounded-3xl bg-zinc-100/50 dark:bg-white/4 border border-zinc-200 dark:border-white/8 hover:border-zinc-300 dark:hover:border-white/15 backdrop-blur-md relative overflow-hidden group transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-blue-600 dark:text-blue-400 text-sm font-semibold uppercase tracking-wider mb-2">🔒 Private & Secure</div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">No data stored</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">Files are automatically deleted after processing. Zero tracking, zero logs, privacy first.</p>
          </div>
        </motion.div>

        {/* Three equal cards */}
        {[
          { icon: Sparkles, color: "text-purple-600 dark:text-purple-400", title: "AI-Powered", desc: "Smart PDF editing with natural language commands and intelligence." },
          { icon: Layers, color: "text-pink-600 dark:text-pink-400", title: "70+ Tools", desc: "PDF, image, video, audio, developer text tools — all in one single hub." },
          { icon: Gift, color: "text-blue-600 dark:text-blue-400", title: "100% Free", desc: "No hidden subscription fees, no annoying watermarks, no registration required." },
        ].map((card, i) => {
          const CardIcon = card.icon;
          return (
            <motion.div
              key={card.title}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 30 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 + 0.15 }}
              className="p-8 rounded-3xl bg-zinc-100/50 dark:bg-white/4 border border-zinc-200 dark:border-white/8 hover:border-zinc-300 dark:hover:border-white/15 backdrop-blur-md relative overflow-hidden group transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <CardIcon className={`w-6 h-6 ${card.color}`} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{card.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
export default BentoGrid;
