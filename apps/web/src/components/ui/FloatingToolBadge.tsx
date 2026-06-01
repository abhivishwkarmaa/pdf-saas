"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const defaultTools = [
  "PDF to Word",
  "Compress Image",
  "Video to MP4",
  "AI Remove Pages",
  "Merge PDF",
  "JSON Formatter",
  "Watermark PDF",
];

export function FloatingToolBadge({ tools = defaultTools }: { tools?: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % tools.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [tools.length]);

  return (
    <div className="flex justify-center h-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300 text-sm font-semibold tracking-wide backdrop-blur-md shadow-lg shadow-purple-500/5 hover:border-purple-500/30 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span>✨ {tools[activeIndex]}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
export default FloatingToolBadge;
