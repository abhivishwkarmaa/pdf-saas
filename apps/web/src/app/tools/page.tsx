import type { Metadata } from "next";
import Link from "next/link";
import { TOOLS, TOOL_CATEGORIES, type ToolCategory } from "@pdf-saas/shared";
import { Search, FileText, Image, Video, Type, Code2, Calculator, Sparkles, Music, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "All Tools — ConvertHub",
  description: "Browse all 70+ free online tools for PDF, image, video, audio, text, developer utilities, and AI-powered processing.",
};

const CAT_ICONS: Record<string, React.ElementType> = {
  pdf: FileText, image: Image, video: Video, text: Type,
  developer: Code2, calculator: Calculator,
};
const CAT_COLORS: Record<string, string> = {
  pdf: "text-rose-400", image: "text-sky-400", video: "text-violet-400",
  text: "text-emerald-400", developer: "text-cyan-400", calculator: "text-orange-400",
};
const CAT_BG: Record<string, string> = {
  pdf: "bg-rose-500/10 border-rose-500/20",
  image: "bg-sky-500/10 border-sky-500/20",
  video: "bg-violet-500/10 border-violet-500/20",
  text: "bg-emerald-500/10 border-emerald-500/20",
  developer: "bg-cyan-500/10 border-cyan-500/20",
  calculator: "bg-orange-500/10 border-orange-500/20",
};

export default function AllToolsPage() {
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.15),transparent)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            All{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {TOOLS.filter(t => t.enabled).length}+ Free Tools
            </span>
          </h1>
          <p className="text-zinc-400 text-lg mb-8">
            PDF, Image, Video, Audio, Text, Developer & AI tools — no signup, no watermark.
          </p>
        </div>
      </div>

      {/* Category quick nav */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap gap-2 justify-center">
          {categories.map(cat => {
            const Icon = CAT_ICONS[cat] || FileText;
            return (
              <a key={cat} href={`#${cat}`}
                className={`flex items-center gap-1.5 rounded-full border ${CAT_BG[cat]} px-3 py-1.5 text-xs font-medium ${CAT_COLORS[cat]} hover:opacity-80 transition`}>
                <Icon className="h-3 w-3" />
                {TOOL_CATEGORIES[cat].label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Tools by category */}
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-14">
        {categories.map(cat => {
          const tools = TOOLS.filter(t => t.category === cat && t.enabled);
          if (!tools.length) return null;
          const Icon = CAT_ICONS[cat] || FileText;
          return (
            <section key={cat} id={cat}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${CAT_BG[cat]}`}>
                    <Icon className={`h-4.5 w-4.5 ${CAT_COLORS[cat]}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{TOOL_CATEGORIES[cat].label}</h2>
                    <p className="text-xs text-zinc-500">{tools.length} tools</p>
                  </div>
                </div>
                <Link href={`/${cat === "calculator" ? "calculators" : cat + "-tools"}`}
                  className={`text-xs font-semibold ${CAT_COLORS[cat]} hover:underline flex items-center gap-1`}>
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map(tool => (
                  <Link key={tool.slug} href={`/tools/${tool.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900 px-4 py-3 transition-all duration-200">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${CAT_BG[cat]} group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-4 w-4 ${CAT_COLORS[cat]}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{tool.name}</p>
                      <p className="text-xs text-zinc-600 truncate">{tool.description}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-violet-400 transition-all" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
