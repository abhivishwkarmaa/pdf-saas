import { TOOLS, TOOL_CATEGORIES } from "@pdf-saas/shared";
import type { ToolCategory } from "@pdf-saas/shared";
import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText, Image, Video, Type, Code2, Calculator, Sparkles,
  Music, ArrowRight, CheckCircle2, Zap, Shield, Clock
} from "lucide-react";
import { notFound } from "next/navigation";

const CATEGORY_META: Record<string, {
  icon: React.ElementType; color: string; bg: string; border: string;
  gradient: string; heroDesc: string; features: string[];
}> = {
  pdf: {
    icon: FileText, color: "text-rose-400", bg: "bg-rose-500/10",
    border: "border-rose-500/20", gradient: "from-rose-600 to-orange-600",
    heroDesc: "Professional PDF tools for conversion, compression, merging, splitting, OCR and more.",
    features: ["No quality loss", "Bank-grade encryption", "Auto-delete after 1hr", "Batch processing"],
  },
  image: {
    icon: Image, color: "text-sky-400", bg: "bg-sky-500/10",
    border: "border-sky-500/20", gradient: "from-sky-600 to-blue-600",
    heroDesc: "Convert, compress, resize, crop, and edit images with AI-powered tools.",
    features: ["AI Enhancement", "Background Removal", "Lossless compression", "40+ formats"],
  },
  video: {
    icon: Video, color: "text-violet-400", bg: "bg-violet-500/10",
    border: "border-violet-500/20", gradient: "from-violet-600 to-fuchsia-600",
    heroDesc: "Convert, compress, trim, merge, and edit videos with AI captions and effects.",
    features: ["AI Auto-Captions", "Timeline Editor", "Multi-track audio", "Cloud processing"],
  },
  text: {
    icon: Type, color: "text-emerald-400", bg: "bg-emerald-500/10",
    border: "border-emerald-500/20", gradient: "from-emerald-600 to-teal-600",
    heroDesc: "Convert documents between formats, extract text, and transform plain text.",
    features: ["DOCX, XLSX, PPTX", "Markdown support", "Plain text extraction", "Batch conversion"],
  },
  developer: {
    icon: Code2, color: "text-cyan-400", bg: "bg-cyan-500/10",
    border: "border-cyan-500/20", gradient: "from-cyan-600 to-blue-600",
    heroDesc: "JSON formatter, Base64, URL encoder, SHA-256, and more dev utilities — all private and in-browser.",
    features: ["100% client-side", "No data sent", "Instant results", "Code formatting"],
  },
  calculator: {
    icon: Calculator, color: "text-orange-400", bg: "bg-orange-500/10",
    border: "border-orange-500/20", gradient: "from-orange-600 to-amber-600",
    heroDesc: "Percentage, BMI, age, unit conversion calculators with instant results.",
    features: ["Instant results", "No signup", "Accurate formulas", "Mobile-friendly"],
  },
};

const SLUG_TO_CATEGORY: Record<string, ToolCategory> = {
  "pdf-tools": "pdf",
  "image-tools": "image",
  "video-tools": "video",
  "text-tools": "text",
  "developer-tools": "developer",
  "calculators": "calculator",
  "ai-tools": "image", // fallback — shows AI-capable tools
};

export async function generateStaticParams() {
  return Object.keys(SLUG_TO_CATEGORY).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = SLUG_TO_CATEGORY[slug];
  if (!cat) return { title: "Not Found" };
  const info = TOOL_CATEGORIES[cat];
  return {
    title: `${info.label} — Free Online ${info.label}`,
    description: info.description,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = SLUG_TO_CATEGORY[slug];
  if (!category) return notFound();

  const meta = CATEGORY_META[category];
  const tools = TOOLS.filter(t => t.category === category && t.enabled);
  const catInfo = TOOL_CATEGORIES[category];
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative border-b border-zinc-800 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-5`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(124,58,237,0.15),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
            <Link href="/" className="hover:text-zinc-300 transition">Home</Link>
            <span>/</span>
            <span className={meta.color}>{catInfo.label}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className={`inline-flex items-center gap-2 rounded-full ${meta.bg} border ${meta.border} px-4 py-1.5 text-sm font-medium ${meta.color} mb-4`}>
                <Icon className="h-4 w-4" />
                {tools.length} Free Tools
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                {catInfo.label}
              </h1>
              <p className="text-zinc-400 text-lg mb-6 max-w-xl">{meta.heroDesc}</p>
              <div className="flex flex-wrap gap-3">
                {meta.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl ${meta.bg} border ${meta.border} shadow-2xl`}>
              <Icon className={`h-16 w-16 ${meta.color}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/40">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap gap-6 items-center justify-center md:justify-start text-xs text-zinc-500">
          {[
            { icon: Shield, text: "Encrypted & Secure" },
            { icon: Clock, text: "Auto-deleted in 1hr" },
            { icon: Zap, text: "Fast cloud processing" },
            { icon: CheckCircle2, text: "No watermark, No signup" },
          ].map(({ icon: I, text }) => (
            <span key={text} className="flex items-center gap-1.5">
              <I className="h-3.5 w-3.5 text-emerald-400" />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-bold text-white mb-6">
          All {catInfo.label} <span className="text-zinc-500 font-normal text-base ml-1">({tools.length} tools)</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-900 p-5 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg} border ${meta.border} group-hover:scale-110 transition-transform`}>
                <Icon className={`h-5 w-5 ${meta.color}`} />
              </div>
              <h3 className="font-semibold text-white mb-1 text-sm">{tool.name}</h3>
              <p className="text-xs text-zinc-500 leading-snug mb-3">{tool.description}</p>
              <div className="flex items-center gap-1 text-xs text-violet-400 opacity-0 group-hover:opacity-100 transition-all duration-200">
                Open tool <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
