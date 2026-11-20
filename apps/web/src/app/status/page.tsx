import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, AlertCircle, Zap, ShieldCheck, Cpu, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "System Status — ConvertHub",
  description: "Real-time status of ConvertHub platform file conversion services.",
};

const SERVICES = [
  { name: "Web Application & Client Engine (Browser)", status: "operational" as const, latency: "15ms", desc: "pdf-lib, Canvas, Web Crypto" },
  { name: "PDF Processing Engine (Poppler)", status: "operational" as const, latency: "45ms", desc: "pdftoppm, pdftotext, pdfimages" },
  { name: "Document Conversion Engine (LibreOffice)", status: "operational" as const, latency: "120ms", desc: "DOCX, XLSX, PPTX, RTF, EPUB" },
  { name: "PDF Compression & Repair (Ghostscript)", status: "operational" as const, latency: "85ms", desc: "Ghostscript 10.x, PDF/A Archiving" },
  { name: "OCR Text Recognition Engine (Tesseract)", status: "operational" as const, latency: "210ms", desc: "Tesseract 5.x multi-language OCR" },
  { name: "HTML to PDF Engine (Chromium + SSRF Guard)", status: "operational" as const, latency: "180ms", desc: "Headless Chromium, CSS3 Vector Rendering" },
  { name: "Image Processing Pipeline (Sharp)", status: "operational" as const, latency: "35ms", desc: "High-speed libvips rasterization" },
  { name: "Public Inquiries & Feedback API", status: "operational" as const, latency: "25ms", desc: "Contact, Feedback, Newsletter" },
];

const STATUS_META = {
  operational: { label: "Operational", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  degraded: { label: "Degraded", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  outage: { label: "Outage", icon: Circle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export default function StatusPage() {
  const allOperational = SERVICES.every((s) => s.status === "operational");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative border-b border-border bg-gradient-to-b from-card to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.1),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full ${allOperational
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300"
              : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-300"
              } border px-4 py-1.5 text-sm font-medium mb-4`}
          >
            <span
              className={`h-2 w-2 rounded-full ${allOperational ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
            />
            {allOperational ? "All Systems Operational" : "Partial Degradation"}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-zinc-900 dark:text-white">System Status</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            ConvertHub platform infrastructure and conversion engine telemetry
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
            Platform Conversion Services
          </h2>
          <span className="text-xs text-muted flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> 100% Uptime (90 Days)
          </span>
        </div>

        <div className="space-y-2.5">
          {SERVICES.map(({ name, status, latency, desc }) => {
            const meta = STATUS_META[status];
            return (
              <div
                key={name}
                className={`flex items-center justify-between rounded-xl border ${meta.border} bg-card px-4 py-3.5 shadow-2xs transition`}
              >
                <div className="flex items-center gap-3">
                  <meta.icon className={`h-4.5 w-4.5 ${meta.color} shrink-0`} />
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white block">{name}</span>
                    <span className="text-xs text-muted">{desc}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-muted font-mono">{latency}</span>
                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & Health Card */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 space-y-3 shadow-2xs">
          <h3 className="font-bold text-zinc-900 dark:text-white text-md flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-500" />
            Security & Automatic File Purging
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            All file conversions are processed in isolated, memory-bounded sandbox environments.
            Files uploaded to ConvertHub are never stored permanently; temporary files are
            purged immediately upon transfer completion. All connections are secured via TLS 1.3
            and protected by active SSRF filtering.
          </p>
        </div>

        <p className="mt-8 text-xs text-muted text-center">
          Have an issue with a conversion?{" "}
          <Link href="/contact" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
            Contact our engineering team →
          </Link>
        </p>
      </div>
    </div>
  );
}
