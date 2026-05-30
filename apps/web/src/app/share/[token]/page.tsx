import { Metadata } from "next";
import { prisma } from "@/lib/server/db";
import { Download, AlertTriangle, FileVideo, FileText, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download Shared File | ConvertHub",
  description: "Download a file shared with you via ConvertHub.",
};

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  
  let errorMsg: string | null = null;
  let fileInfo: { name: string; size: string; type: string } | null = null;
  let stats: { downloads: number; maxDownloads: number; expiresAt: Date } | null = null;

  try {
    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
    });

    if (!shareToken) {
      errorMsg = "This share link is invalid or has been deleted.";
    } else if (shareToken.expiresAt < new Date()) {
      errorMsg = "This share link has expired (links are only valid for 24 hours).";
    } else if (shareToken.downloads >= shareToken.maxDownloads) {
      errorMsg = "This share link has reached its maximum download limit.";
    } else {
      const job = await prisma.job.findUnique({
        where: { id: shareToken.jobId },
      });

      if (!job || !job.outputKey) {
        errorMsg = "The file associated with this share link is missing or incomplete.";
      } else {
        const ext = job.fileName?.split(".").pop() || "unknown";
        fileInfo = {
          name: job.fileName || "shared_file",
          size: job.outputKey ? "Processed File" : "0 MB", // we don't store size directly in job, but we show processed label
          type: ext.toUpperCase(),
        };
        stats = {
          downloads: shareToken.downloads,
          maxDownloads: shareToken.maxDownloads,
          expiresAt: shareToken.expiresAt,
        };
      }
    }
  } catch (err) {
    errorMsg = "An error occurred while loading this share link.";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-8">
        
        {/* Header Branding */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-black bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
            CONVERTHUB
          </Link>
          <p className="text-zinc-500 text-xs mt-1">Premium File Processing & Conversion</p>
        </div>

        {errorMsg ? (
          /* Error State */
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 animate-pulse">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-200">Link Unavailable</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">{errorMsg}</p>
            </div>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 text-sm font-semibold transition-all"
            >
              Back to ConvertHub
            </Link>
          </div>
        ) : (
          /* Success State */
          <div className="space-y-8">
            <div className="space-y-4 text-center">
              {/* File Icon */}
              <div className="mx-auto w-20 h-20 bg-cyan-950/30 border border-cyan-500/20 rounded-3xl flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/5">
                {fileInfo?.type === "MP4" || fileInfo?.type === "WEBM" ? (
                  <FileVideo className="h-10 w-10" />
                ) : (
                  <FileText className="h-10 w-10" />
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white truncate px-4" title={fileInfo?.name}>
                  {fileInfo?.name}
                </h2>
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400">
                  <span className="bg-zinc-800 px-2 py-0.5 rounded text-cyan-400 font-bold">{fileInfo?.type}</span>
                  <span>•</span>
                  <span>Shared Download</span>
                </div>
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 gap-3 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/40 text-xs">
              <div className="space-y-1">
                <p className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Remaining Downloads</p>
                <p className="text-white font-mono text-sm font-bold">
                  {stats ? stats.maxDownloads - stats.downloads : 0} / {stats?.maxDownloads}
                </p>
              </div>
              <div className="space-y-1 border-l border-zinc-800/60 pl-4">
                <p className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Link Expiry</p>
                <div className="flex items-center gap-1 text-white font-semibold mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>24 Hours</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <a
                href={`/api/share/${token}/download`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-black py-4 text-sm font-extrabold shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all"
              >
                <Download className="h-4 w-4" />
                Download Shared File
              </a>
              <p className="text-[10px] text-zinc-500 text-center">
                By downloading, you agree to our terms of service and usage policy.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
