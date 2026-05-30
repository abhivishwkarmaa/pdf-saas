import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Trash2,
  Replace,
  Copy,
  RotateCw,
  Merge,
  Split,
  Minimize2,
  Heading,
  FileSpreadsheet,
  ListOrdered,
  Layers,
  Binary,
  Lock,
  Unlock,
  Maximize,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI PDF Tools — ConvertHub",
  description:
    "Type natural language commands to modify, convert, compress, merge, split, secure, and watermark your PDF files instantly with AI.",
};

const AI_CARDS = [
  {
    slug: "remove-pages",
    name: "Remove Pages",
    description: "Permanently delete specified pages from your PDF document.",
    icon: Trash2,
    color: "from-rose-500 to-red-500",
    example: "Remove page 3 and 5",
  },
  {
    slug: "replace-page",
    name: "Replace Page",
    description: "Swap any page in your PDF with another file's page.",
    icon: Replace,
    color: "from-cyan-500 to-blue-500",
    example: "Replace page 2 with this new page",
  },
  {
    slug: "extract-pages",
    name: "Extract Pages",
    description: "Extract specific pages or page ranges into a separate new PDF.",
    icon: Copy,
    color: "from-emerald-500 to-teal-500",
    example: "Extract pages 4 to 8",
  },
  {
    slug: "rotate-pages",
    name: "Rotate Pages",
    description: "Rotate specific pages or all pages of a PDF by 90, 180, or 270 degrees.",
    icon: RotateCw,
    color: "from-amber-500 to-orange-500",
    example: "Rotate page 1 by 90 degrees",
  },
  {
    slug: "merge",
    name: "Merge PDFs",
    description: "Combine multiple PDF documents together in sequential order.",
    icon: Merge,
    color: "from-indigo-500 to-purple-500",
    example: "Merge this PDF with another PDF",
  },
  {
    slug: "split",
    name: "Split PDF",
    description: "Split your PDF into two separate files after a specific page number.",
    icon: Split,
    color: "from-sky-500 to-indigo-500",
    example: "Split after page 5",
  },
  {
    slug: "compress",
    name: "Compress PDF",
    description: "Reduce file size while preserving document readability.",
    icon: Minimize2,
    color: "from-violet-500 to-fuchsia-500",
    example: "Compress this PDF",
  },
  {
    slug: "watermark",
    name: "Add Watermark",
    description: "Overlay customizable text watermarks to prevent unauthorized sharing.",
    icon: Heading,
    color: "from-fuchsia-500 to-pink-500",
    example: "Add watermark that says CONFIDENTIAL on every page",
  },
  {
    slug: "convert-to-word",
    name: "Convert PDF to Word",
    description: "Convert PDF documents to editable Microsoft Word files (.docx).",
    icon: FileSpreadsheet,
    color: "from-blue-500 to-indigo-600",
    example: "Convert PDF to Word",
  },
  {
    slug: "reorder-pages",
    name: "Reorder Pages",
    description: "Rearrange pages into a specific custom ordering map.",
    icon: ListOrdered,
    color: "from-violet-600 to-rose-600",
    example: "Make page 3 the first page",
  },
  {
    slug: "delete-blank-pages",
    name: "Delete Blank Pages",
    description: "Scan pages and remove blank pages automatically using visual checks.",
    icon: Layers,
    color: "from-teal-500 to-emerald-600",
    example: "Delete all blank pages",
  },
  {
    slug: "add-page-numbers",
    name: "Add Page Numbers",
    description: "Insert 'Page X of Y' numbers at the bottom center footer.",
    icon: Binary,
    color: "from-lime-500 to-green-600",
    example: "Add page numbers to footer",
  },
  {
    slug: "encrypt",
    name: "Encrypt PDF",
    description: "Password protect your PDF with strong 256-bit AES encryption.",
    icon: Lock,
    color: "from-pink-500 to-rose-600",
    example: "Encrypt this PDF with password: hello123",
  },
  {
    slug: "decrypt",
    name: "Decrypt PDF",
    description: "Remove passwords and restriction layers from encrypted files.",
    icon: Unlock,
    color: "from-emerald-400 to-teal-500",
    example: "Remove password from this PDF",
  },
  {
    slug: "resize-pages",
    name: "Resize Pages",
    description: "Resize all pages to standard A4 dimensions, scaling content to fit.",
    icon: Maximize,
    color: "from-orange-500 to-amber-600",
    example: "Resize all pages to A4",
  },
];

export default function AIToolsLandingPage() {
  return (
    <div className="min-h-screen bg-zinc-955 bg-zinc-950 text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.08),transparent_40%)]" />

      {/* Hero Section */}
      <div className="relative border-b border-zinc-900 pb-16 pt-20">
        <div className="mx-auto max-w-5xl px-4 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            AI Powered PDF Hub
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-zinc-100 to-fuchsia-300 bg-clip-text text-transparent">
            🤖 CONVERTHUB AI PDF Tools
          </h1>
          <p className="mx-auto max-w-2xl text-zinc-300 text-lg">
            Say goodbye to complex buttons. Upload your PDF and type what you want to do in plain English. The AI does the rest.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 space-y-12">
        {/* Universal AI Card */}
        <div className="group relative rounded-3xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/20 via-zinc-950 to-violet-950/20 p-8 shadow-2xl overflow-hidden hover:border-fuchsia-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 h-40 w-40 bg-fuchsia-600/10 blur-3xl rounded-full" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/20">
                <Sparkles className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-2xl font-bold text-white">Universal AI Tool</h3>
                <p className="text-zinc-300 text-sm mt-1 max-w-xl">
                  Accepts any command or combination of changes. Write multiple commands in one sentence, and let the AI compile them!
                </p>
              </div>
            </div>
            <Link
              href="/ai-tools/universal"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-zinc-100 px-6 py-3.5 text-sm font-bold text-black shadow-lg transition-all hover:scale-105 shrink-0"
            >
              Start Universal AI
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Specialized Tools Title */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Specialized AI Workspaces</h2>
          <p className="text-sm text-zinc-400">
            Select a workspace customized for individual operations with context-aware suggestions.
          </p>
        </div>

        {/* Grid of 15 Tools */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AI_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.slug}
                className="group relative rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col justify-between hover:border-zinc-700 hover:bg-zinc-850 transition-all duration-300"
              >
                <div className="space-y-4">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white group-hover:text-fuchsia-400 transition-colors">
                      {card.name}
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed min-h-[40px]">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="border-t border-zinc-800 pt-3 text-[11px] text-zinc-400 italic">
                    Example: &quot;{card.example}&quot;
                  </div>
                  <Link
                    href={`/ai-tools/${card.slug}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-zinc-600 bg-zinc-850 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all"
                  >
                    Launch Tool
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
