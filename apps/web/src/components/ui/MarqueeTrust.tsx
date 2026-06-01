"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Lock, Sparkles, Check, Heart } from "lucide-react";

const badges = [
  { label: "Privacy First", Icon: Shield },
  { label: "Instant Conversion", Icon: Zap },
  { label: "Secure Processing", Icon: Lock },
  { label: "AI Powered Tools", Icon: Sparkles },
  { label: "100% Free & Open", Icon: Check },
  { label: "No Watermarks", Icon: Heart },
];

export function MarqueeTrust() {
  // Duplicate the badges multiple times to guarantee seamless wrapping on wide layouts
  const listItems = [...badges, ...badges, ...badges, ...badges];

  return (
    <div className="relative overflow-hidden py-10 border-y border-white/5 bg-black/10 backdrop-blur-sm">
      {/* Edge gradient mask overlays to create a fading-out effect */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10 pointer-events-none" />

      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="flex gap-16 w-max px-8"
      >
        {listItems.map((badge, i) => {
          const Icon = badge.Icon;
          return (
            <div key={i} className="flex items-center gap-3 text-zinc-400 whitespace-nowrap">
              <Icon className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-semibold tracking-wide uppercase">{badge.label}</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
export default MarqueeTrust;
