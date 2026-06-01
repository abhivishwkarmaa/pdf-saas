import type { Metadata } from "next";
import Link from "next/link";
import {
  Type,
  Hash,
  RefreshCw,
  ListMinus,
  SortAsc,
  Replace,
  Link2,
  Sparkles,
  GitCompare,
  Braces,
  Lock,
  Globe,
  Code,
  FileEdit,
  Eraser,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Text Tools — ConvertHub",
  description:
    "15+ free, 100% private in-browser text processing, formatting, and encoding tools. No data ever leaves your device.",
};

const TEXT_TOOLS = [
  {
    slug: "word-counter",
    name: "Word Counter",
    description: "Count words, characters, sentences, and estimate reading/speaking times.",
    example: "Count length & reading time",
    badge: "Text Processing",
    icon: Hash,
  },
  {
    slug: "case-converter",
    name: "Case Converter",
    description: "Convert text between UPPERCASE, lowercase, Title Case, camelCase, and more.",
    example: "hello world → HELLO WORLD",
    badge: "Text Processing",
    icon: Type,
  },
  {
    slug: "text-reverser",
    name: "Text Reverser",
    description: "Reverse text characters or words instantly.",
    example: "hello → olleh",
    badge: "Text Processing",
    icon: RefreshCw,
  },
  {
    slug: "remove-duplicates",
    name: "Remove Duplicate Lines",
    description: "Remove duplicate lines from lists or text documents.",
    example: "Clean up repetitive lines",
    badge: "Text Processing",
    icon: ListMinus,
  },
  {
    slug: "sort-lines",
    name: "Sort Lines",
    description: "Sort lines alphabetically (A-Z, Z-A), by length, or randomize.",
    example: "Sort lists & data records",
    badge: "Text Processing",
    icon: SortAsc,
  },
  {
    slug: "find-replace",
    name: "Find & Replace",
    description: "Search for specific terms or regular expressions and replace them.",
    example: "Replace words or regex matches",
    badge: "Text Processing",
    icon: Replace,
  },
  {
    slug: "text-to-slug",
    name: "Text to Slug",
    description: "Generate URL-friendly slugs from plain text.",
    example: "Title to URL-Slug! → title-to-url-slug",
    badge: "Text Processing",
    icon: Link2,
  },
  {
    slug: "lorem-ipsum",
    name: "Lorem Ipsum Generator",
    description: "Generate placeholder paragraphs, sentences, or words.",
    example: "Generate mock copy/lorem ipsum",
    badge: "Formatter",
    icon: Sparkles,
  },
  {
    slug: "text-diff",
    name: "Text Diff Checker",
    description: "Compare two texts line-by-line and highlight additions or removals.",
    example: "Compare revisions & files",
    badge: "Text Processing",
    icon: GitCompare,
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    description: "Pretty print, minify, validate, and syntax-highlight JSON data.",
    example: "Format, minify, and validate JSON",
    badge: "Formatter",
    icon: Braces,
  },
  {
    slug: "base64",
    name: "Base64 Encode/Decode",
    description: "Encode or decode strings and files to/from Base64 format.",
    example: "Secure string/file encoding",
    badge: "Encoding",
    icon: Lock,
  },
  {
    slug: "url-encoder",
    name: "URL Encode/Decode",
    description: "Safe-encode and decode URL parameters.",
    example: "Encode query string components",
    badge: "Encoding",
    icon: Globe,
  },
  {
    slug: "html-encoder",
    name: "HTML Entities Encoder",
    description: "Encode or decode special characters to HTML entities.",
    example: "Convert < & > to HTML entities",
    badge: "Encoding",
    icon: Code,
  },
  {
    slug: "markdown-to-html",
    name: "Markdown to HTML",
    description: "Convert markdown syntax to clean HTML or live preview.",
    example: "# Header → <h1>Header</h1>",
    badge: "Formatter",
    icon: FileEdit,
  },
  {
    slug: "remove-spaces",
    name: "Remove Extra Spaces",
    description: "Trim whitespace, clean multiple spaces, and remove empty lines.",
    example: "Trim leading/trailing/multiple spaces",
    badge: "Text Processing",
    icon: Eraser,
  },
];

const BADGE_THEMES: Record<string, string> = {
  "Text Processing": "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  "Formatter": "bg-purple-500/10 border-purple-500/20 text-purple-400",
  "Encoding": "bg-amber-500/10 border-amber-500/20 text-amber-400",
};

export default function TextToolsHome() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Header */}
      <div className="relative border-b border-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-600 opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.15),transparent)]" />
        
        <div className="relative mx-auto max-w-6xl px-4 py-20">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
            <Link href="/" className="hover:text-zinc-300 transition">Home</Link>
            <span>/</span>
            <span className="text-emerald-400">Text Tools</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-400 mb-4">
                <Type className="h-4 w-4" />
                {TEXT_TOOLS.length} Browser Tools
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Text Utilities
              </h1>
              <p className="text-zinc-400 text-lg mb-6 max-w-xl">
                Format, parse, clean, compare, and encode text files and snippets instantly. 100% local operation ensures complete privacy.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  "100% Client-Side",
                  "No Signups Required",
                  "Secure & Private",
                  "Instant Local Processing",
                ].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-2xl">
              <Type className="h-16 w-16 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-xl font-bold text-white mb-8">
          Available Tools <span className="text-zinc-500 font-normal text-base ml-1">({TEXT_TOOLS.length} utilities)</span>
        </h2>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEXT_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const badgeTheme = BADGE_THEMES[tool.badge] || "bg-zinc-800 border-zinc-700 text-zinc-400";
            
            return (
              <Link
                key={tool.slug}
                href={`/text-tools/${tool.slug}`}
                className="group rounded-2xl border border-zinc-900 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900 p-6 transition-all duration-200 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 group-hover:bg-zinc-850 group-hover:scale-105 transition-all">
                    <Icon className="h-5.5 w-5.5 text-emerald-400" />
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border ${badgeTheme}`}>
                    {tool.badge}
                  </span>
                </div>
                
                <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-emerald-400 transition-colors">
                  {tool.name}
                </h3>
                
                <p className="text-xs text-zinc-400 leading-relaxed mb-4 min-h-[36px]">
                  {tool.description}
                </p>
                
                <div className="border-t border-zinc-900 pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-mono italic truncate max-w-[80%]">
                    eg: {tool.example}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
