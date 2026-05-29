"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Pagination / Search
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const fetchSubscribers = async (currentPage = 1, searchQuery = search) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setLoading(true);
    try {
      const url = new URL(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/subscribers`
      );
      url.searchParams.append("page", currentPage.toString());
      url.searchParams.append("limit", "20");
      if (searchQuery) url.searchParams.append("search", searchQuery);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch subscribers");
      const data = await response.json();

      if (data.success) {
        setSubscribers(data.data);
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error("Failed to load subscribers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers(1, "");
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubscribers(1, search);
  };

  const handleExportCSV = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setIsExporting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/subscribers/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to export subscribers CSV");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converthub-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV list downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download CSV export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the newsletter?`)) return;

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/subscribers/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Removed ${email} from subscriber base.`);
        fetchSubscribers(page);
      } else {
        toast.error(data.message || "Failed to remove subscriber.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error removing subscriber.");
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "active":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Active</span>;
      case "unsubscribed":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-500">Unsubscribed</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">Pending</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Subscribers Base</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage newsletter signups and export contact lists.</p>
        </div>
        <div>
          <button
            onClick={handleExportCSV}
            disabled={isExporting || subscribers.length === 0}
            className="w-full sm:w-auto rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-violet-900/25 transition"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 backdrop-blur-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subscribers by email..."
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-xs text-white placeholder-zinc-700 pl-9 pr-3 py-2.5 transition"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-white px-4 py-2.5 text-xs font-semibold transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Table */}
      <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/10 backdrop-blur-sm">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : error ? (
          <div className="py-20 text-center flex flex-col items-center justify-center p-4">
            <AlertTriangle className="h-8 w-8 text-rose-500 mb-2" />
            <h3 className="text-white font-bold text-sm">Failed to load subscribers</h3>
            <p className="text-zinc-600 text-xs mt-1">Please ensure the backend API is online.</p>
          </div>
        ) : subscribers.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center p-4">
            <Users className="h-8 w-8 text-zinc-700 mb-2" />
            <h3 className="text-zinc-500 font-bold text-sm">No subscribers found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-zinc-950/40 text-zinc-400 uppercase tracking-widest text-[9px] border-b border-zinc-800 font-bold">
                <tr>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Verified</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Subscribed At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {subscribers.map((sub) => (
                  <tr key={sub._id} className="hover:bg-zinc-900/15 transition-colors">
                    <td className="p-4 font-semibold text-white">{sub.email}</td>
                    <td className="p-4">{getStatusBadge(sub.status)}</td>
                    <td className="p-4">
                      {sub.verified ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-zinc-500 flex items-center gap-1 font-medium">
                          <XCircle className="h-3.5 w-3.5" /> No
                        </span>
                      )}
                    </td>
                    <td className="p-4 capitalize text-zinc-400">{sub.source || "Website"}</td>
                    <td className="p-4 text-zinc-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(sub._id, sub.email)}
                        className="rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-zinc-500 hover:text-rose-400 p-1.5 transition"
                        title="Remove Subscriber"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs bg-zinc-950/20">
            <button
              disabled={page <= 1}
              onClick={() => fetchSubscribers(page - 1)}
              className="rounded-lg px-3 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="text-zinc-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchSubscribers(page + 1)}
              className="rounded-lg px-3 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
