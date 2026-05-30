"use client";

import { useState, useEffect } from "react";
import { 
  Download, Trash2, Video, FileText, CheckCircle2, XCircle, 
  RefreshCw, ChevronLeft, ChevronRight, Share2, Search, ExternalLink
} from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";

interface JobItem {
  id: string;
  toolSlug: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  fileName: string | null;
  mimeType: string | null;
  createdAt: string;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCopying, setIsCopying] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to view conversion history.");
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/jobs?status=${statusFilter}&page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, page]);

  const handleDelete = async (jobId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!confirm("Are you sure you want to delete this job and its files permanently?")) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete job");
      toast.success("Job and files deleted successfully.");
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete job");
    }
  };

  const handleShare = async (jobId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsCopying(jobId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/jobs/${jobId}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to generate share link");
      const data = await res.json();
      
      await navigator.clipboard.writeText(data.shareUrl);
      toast.success("Share link copied to clipboard! (Expires in 24h)");
    } catch (err: any) {
      toast.error(err.message || "Failed to share link");
    } finally {
      setIsCopying(null);
    }
  };

  const getStatusBadge = (status: JobItem["status"]) => {
    const styles = {
      queued: "bg-zinc-800 text-zinc-400 border-zinc-700/50",
      processing: "bg-cyan-950/20 text-cyan-400 border-cyan-500/20",
      completed: "bg-emerald-950/20 text-emerald-400 border-emerald-500/20",
      failed: "bg-red-950/20 text-red-400 border-red-500/20",
    };
    return (
      <span className={`inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 text-white space-y-8 min-h-screen">
      <Toaster position="top-right" richColors />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-gradient-to-r from-white via-zinc-100 to-cyan-300 bg-clip-text text-transparent">
            Conversion History
          </h1>
          <p className="text-zinc-400 text-sm">
            Manage your completed, queued, and processing file conversions. Download or delete records.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchJobs}
          className="self-start md:self-auto inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Main card */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-md space-y-6">
        
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {["all", "completed", "failed", "processing", "queued"].map(status => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition capitalize ${
                  statusFilter === status
                    ? "bg-cyan-500 border-cyan-500 text-black shadow-md shadow-cyan-500/10"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto min-h-[250px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
              <RefreshCw className="h-10 w-10 animate-spin text-cyan-500" />
              <p className="text-sm font-semibold">Loading conversion records...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 italic space-y-2">
              <Search className="mx-auto h-12 w-12 text-zinc-800" />
              <p className="text-sm font-semibold">No conversions found</p>
              <p className="text-xs text-zinc-600">Converted files will show up here after processing.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  <th className="pb-3 pl-2">Preview</th>
                  <th className="pb-3">File Name</th>
                  <th className="pb-3">Tool</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created At</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {jobs.map((job) => (
                  <tr key={job.id} className="text-sm align-middle hover:bg-zinc-900/10">
                    <td className="py-4 pl-2 shrink-0">
                      {job.thumbnailUrl ? (
                        <div className="w-14 h-10 rounded-lg overflow-hidden border border-zinc-800 shadow-md relative group">
                          <img 
                            src={job.thumbnailUrl} 
                            alt="preview" 
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        </div>
                      ) : job.toolSlug.includes("video") ? (
                        <div className="w-14 h-10 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-500">
                          <Video className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-500">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 max-w-xs font-semibold truncate" title={job.fileName || "unnamed"}>
                      {job.fileName || "unnamed"}
                    </td>
                    <td className="py-4 text-xs font-mono text-zinc-400">
                      {job.toolSlug}
                    </td>
                    <td className="py-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="py-4 text-xs text-zinc-500 font-mono">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {job.status === "completed" && job.downloadUrl && (
                          <>
                            <a
                              href={job.downloadUrl}
                              download
                              className="inline-flex items-center justify-center p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black transition"
                              title="Download File"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleShare(job.id)}
                              disabled={isCopying === job.id}
                              className="inline-flex items-center justify-center p-2 rounded-xl border border-zinc-850 bg-zinc-900/60 text-zinc-400 hover:text-white transition"
                              title="Copy Shareable Link"
                            >
                              {isCopying === job.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                              ) : (
                                <Share2 className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(job.id)}
                          className="inline-flex items-center justify-center p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-950/10 transition"
                          title="Delete Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-zinc-900/60">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-850 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-xs text-zinc-400 font-bold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-850 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-30 disabled:pointer-events-none"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
