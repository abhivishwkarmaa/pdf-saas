import Link from "next/link";
import {
  TOOLS,
  TOOL_CATEGORIES,
  getPopularTools,
  type ToolCategory,
} from "@pdf-saas/shared";
import { ToolSearch } from "@/components/home/ToolSearch";
import { ToolCard } from "@/components/home/ToolCard";
import { THEME_CONFIG } from "@/lib/theme-config";
import {
  ArrowRight,
  ShieldCheck,
  Cpu,
  Zap,
  Lock,
  HardDrive,
  CheckCircle2,
} from "lucide-react";

const CATEGORY_HREFS: Record<ToolCategory, string> = {
  pdf: "/pdf-tools",
  image: "/image-tools",
  developer: "/developer-tools",
  text: "/text-tools",
  calculator: "/calculators",
};

export default function HomePage() {
  const popularTools = getPopularTools().slice(0, 8);
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];
  const totalToolsCount = TOOLS.filter((t) => t.enabled).length;

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* 1. Hero Section with Ambient Violet Glow */}
      <section className="relative border-b border-border bg-gradient-to-b from-violet-50/70 via-background to-background dark:from-violet-950/20 dark:via-background dark:to-background px-4 py-16 sm:py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(139,92,246,0.14),transparent)] pointer-events-none" />

        <div className="relative mx-auto max-w-4xl">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-900/60 bg-violet-50/80 dark:bg-violet-950/40 px-3.5 py-1 text-[11px] font-mono uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-6 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">{totalToolsCount} Tools Ready</span>
            <span className="text-violet-300 dark:text-violet-700">·</span>
            <span>Client-Side WASM</span>
            <span className="text-violet-300 dark:text-violet-700">·</span>
            <span>Zero Server Uploads</span>
          </div>

          {/* Heading with Brand Gradient */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-5">
            Private File & Media{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Utilities
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed">
            Convert, compress, and manipulate files directly in your browser using WebAssembly.
            No server uploads, no registration, and no artificial daily limits.
          </p>

          {/* Search Bar */}
          <ToolSearch />
        </div>

        {/* 4-Item Specifications Bar */}
        <div className="relative mx-auto max-w-6xl mt-14 pt-8 border-t border-border/60 grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl border border-violet-200/80 dark:border-violet-900/50 bg-card/80 backdrop-blur-xs shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
              <Cpu className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span>In-Browser WASM</span>
            </div>
            <p className="text-xs text-muted leading-snug">
              Processed directly in client RAM with native binary speed.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-card/80 backdrop-blur-xs shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
              <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span>Zero Retention</span>
            </div>
            <p className="text-xs text-muted leading-snug">
              Files never leave your device. Complete privacy by design.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-card/80 backdrop-blur-xs shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
              <HardDrive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Uncapped Quotas</span>
            </div>
            <p className="text-xs text-muted leading-snug">
              No daily file conversion limits, watermarks, or subscriptions.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-sky-200/80 dark:border-sky-900/50 bg-card/80 backdrop-blur-xs shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
              <Zap className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Instant Execution</span>
            </div>
            <p className="text-xs text-muted leading-snug">
              Zero network upload queueing. Instant hardware throughput.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Frequently Used Utilities */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-violet-600 dark:text-violet-400 font-bold mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
              Quick Access
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Frequently Used Utilities
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              High-frequency daily operations for PDF, image, and data manipulation.
            </p>
          </div>
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 transition group shrink-0 shadow-2xs"
          >
            <span>View All {totalToolsCount} Tools</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* 3. Privacy & Technical Architecture Moat */}
      <section className="border-y border-border bg-gradient-to-b from-card/60 via-card/30 to-background py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Architectural Privacy Guarantee</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Your Files Never Leave Your Browser
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Most online file tools secretly upload your contracts, financial records, and photos to remote cloud servers. ConvertHub executes all processing directly inside your browser sandbox.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-violet-200/80 dark:border-violet-900/60 bg-card p-6 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-violet-300 transition-all">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-900/60 text-violet-600 dark:text-violet-400 mb-4 shadow-2xs">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  In-Memory Sandboxing
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  WebAssembly binaries run within your browser's secure memory boundary. When your session ends or you close the tab, all memory is instantly purged.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50 text-[11px] font-mono text-violet-600 dark:text-violet-400 font-semibold">
                WASM Runtime · V8 Isolation
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-card p-6 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-rose-300 transition-all">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 mb-4 shadow-2xs">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  Zero Network Telemetry
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Open your browser's Developer Tools Network tab during any conversion: zero payload bytes are sent over the wire. Strict zero-retention by default.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50 text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                HTTP Egress: 0 KB
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/60 bg-card p-6 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-sky-300 transition-all">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900/60 text-sky-600 dark:text-sky-400 mb-4 shadow-2xs">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  Hardware-Accelerated Speed
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Eliminating upload and download queues means file conversions happen at the speed of your device's multi-core CPU and SSD storage.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50 text-[11px] font-mono text-sky-600 dark:text-sky-400 font-semibold">
                Sub-Second Conversion
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Curated Category Highlights (Top 4 per category) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-violet-600 dark:text-violet-400 font-bold mb-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
            Browse By Category
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Comprehensive Utility Suites
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Explore focused toolsets with native theme styling.
          </p>
        </div>

        {categories.map((cat) => {
          const meta = TOOL_CATEGORIES[cat];
          const catTools = TOOLS.filter((t) => t.category === cat && t.enabled);
          const topTools = catTools.slice(0, 4);
          const theme = THEME_CONFIG[cat];
          const CatIcon = theme.icon;
          const href = CATEGORY_HREFS[cat];

          return (
            <div key={cat} className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${theme.bg} ${theme.border} ${theme.accent} shadow-2xs`}>
                    <CatIcon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      {meta.label}
                      <span className="text-xs font-mono font-normal text-muted">
                        ({catTools.length})
                      </span>
                    </h3>
                    <p className="text-xs text-muted">{meta.description}</p>
                  </div>
                </div>

                <Link
                  href={href}
                  className={`text-xs font-semibold ${theme.accent} hover:underline transition flex items-center gap-1 shrink-0`}
                >
                  <span>View All {catTools.length} {meta.label}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {topTools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* 5. Technical FAQ Section */}
      <section className="border-t border-border bg-card/40 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Technical & Security FAQ
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted">
              Common questions regarding privacy, format codecs, and browser limitations.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>How is complete privacy guaranteed?</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                All document parsing, image re-encoding, and text transformations execute strictly via WebAssembly and HTML5 Canvas in your browser thread. No files are uploaded to remote servers.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Are there file size limitations?</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                There are no artificial server upload quotas. The only ceiling is your device's available browser memory (RAM), allowing processing of large multi-hundred-megabyte files smoothly.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Does ConvertHub require an account?</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                No. All 67+ tools are completely accessible without signup, email collection, or subscription tiers. Simply open the tool and process your files immediately.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Which codecs and engines are utilized?</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We employ industry-standard WASM packages including pdf-lib, libvips/sharp bindings, and native browser WebP/AVIF compressors for lossless fidelity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Closing Call-To-Action Panel */}
      <section className="border-t border-border py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-violet-200/80 dark:border-violet-900/60 bg-gradient-to-b from-violet-50/60 via-card to-card dark:from-violet-950/20 dark:via-card dark:to-card p-8 sm:p-12 text-center relative overflow-hidden shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
              Ready to process files privately?
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
              Access all {totalToolsCount} browser-based utilities right now. Free, private, and with zero configuration.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 text-xs font-bold hover:opacity-95 transition shadow-md shadow-violet-600/25"
              >
                <span>Open All Tools Directory</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pdf-tools"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <span>Browse PDF Utilities</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
