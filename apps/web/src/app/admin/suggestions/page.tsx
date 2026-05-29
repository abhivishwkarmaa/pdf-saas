"use client";
import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  Search,
  MessageSquare,
  Clock,
  User,
  Loader2,
  AlertTriangle,
  PlusCircle,
  FileText,
  Bookmark,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter states
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Inspector state
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchSuggestions = async (currentPage = 1, searchQuery = search, cat = category, stat = status, pri = priority) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setLoading(true);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/suggestions`);
      url.searchParams.append("page", currentPage.toString());
      url.searchParams.append("limit", "10");
      if (searchQuery) url.searchParams.append("search", searchQuery);
      if (cat) url.searchParams.append("category", cat);
      if (stat) url.searchParams.append("status", stat);
      if (pri) url.searchParams.append("priority", pri);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch suggestions");
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.data);
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);

        // Re-sync inspector if it is open
        if (selectedSuggestion) {
          const fresh = data.data.find((s: any) => s._id === selectedSuggestion._id);
          if (fresh) {
            setSelectedSuggestion(fresh);
            setInternalNotes(fresh.internalNotes || "");
          }
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error("Failed to load suggestions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions(1, "", "", "", "");
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSuggestions(1, search, category, status, priority);
  };

  const handleSelectSuggestion = (s: any) => {
    setSelectedSuggestion(s);
    setInternalNotes(s.internalNotes || "");
    setReplyText("");
  };

  const handleUpdateSuggestion = async (id: string, updates: { status?: string; priority?: string }) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/suggestions/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Suggestion updated successfully.");
        // Update list inline
        setSuggestions((prev) =>
          prev.map((s) => (s._id === id ? data.data : s))
        );
        // Update inspector inline
        if (selectedSuggestion && selectedSuggestion._id === id) {
          setSelectedSuggestion(data.data);
        }
      } else {
        toast.error(data.message || "Failed to update suggestion.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating suggestion.");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedSuggestion) return;
    setSavingNotes(true);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/suggestions/${selectedSuggestion._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ internalNotes }),
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Internal notes updated.");
        // Update list inline
        setSuggestions((prev) =>
          prev.map((s) => (s._id === selectedSuggestion._id ? data.data : s))
        );
        setSelectedSuggestion(data.data);
      } else {
        toast.error(data.message || "Failed to save notes.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSuggestion) return;

    setSubmittingReply(true);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/suggestions/${selectedSuggestion._id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ replyText }),
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Reply email sent to suggester!");
        setReplyText("");
        setSelectedSuggestion(data.data);
        setSuggestions((prev) =>
          prev.map((s) => (s._id === selectedSuggestion._id ? data.data : s))
        );
      } else {
        toast.error(data.message || "Failed to send reply.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "high":
        return <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold uppercase text-[9px]">High</span>;
      case "medium":
        return <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold uppercase text-[9px]">Medium</span>;
      case "low":
        return <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold uppercase text-[9px]">Low</span>;
      default:
        return null;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "completed":
        return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
      case "in_progress":
        return "text-amber-400 border-amber-500/20 bg-amber-500/10";
      case "planned":
        return "text-blue-400 border-blue-500/20 bg-blue-500/10";
      case "reviewed":
        return "text-violet-400 border-violet-500/20 bg-violet-500/10";
      case "rejected":
        return "text-rose-400 border-rose-500/20 bg-rose-500/10";
      default:
        return "text-zinc-400 border-zinc-800 bg-zinc-900/40";
    }
  };

  return (
    <div className="h-[80vh] flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Suggestions Backlog</h1>
        <p className="text-zinc-500 text-sm mt-1">Review user feedback, plan feature roadmap and reply to creators.</p>
      </div>

      {/* Main split box */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/10 backdrop-blur-sm">
        {/* Suggestions List Column */}
        <div className="md:col-span-1 border-r border-zinc-800 flex flex-col h-full min-h-0 bg-zinc-950/20">
          {/* Filters form */}
          <form onSubmit={handleFilterSubmit} className="p-4 border-b border-zinc-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ideas..."
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-xs text-white placeholder-zinc-700 pl-9 pr-3 py-2.5 transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 px-2 py-2 focus:border-violet-500 focus:outline-none transition"
              >
                <option value="">All Categories</option>
                <option value="New Tool Request">New Tool</option>
                <option value="UI Improvement">UI/UX</option>
                <option value="Bug Report">Bug</option>
                <option value="AI Feature Suggestion">AI</option>
                <option value="Performance Issue">Performance</option>
                <option value="General Feedback">Feedback</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 px-2 py-2 focus:border-violet-500 focus:outline-none transition"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 px-2 py-2 focus:border-violet-500 focus:outline-none transition"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-zinc-850 hover:bg-zinc-850 border border-zinc-800 text-white px-3 py-2 text-xs font-semibold transition"
              >
                Apply
              </button>
            </div>
          </form>

          {/* List area */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                <Lightbulb className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-zinc-500 text-xs font-medium">No ideas logged yet</p>
              </div>
            ) : (
              suggestions.map((sug) => {
                const active = selectedSuggestion?._id === sug._id;
                return (
                  <button
                    key={sug._id}
                    onClick={() => handleSelectSuggestion(sug)}
                    className={`w-full text-left p-4 flex flex-col gap-1.5 transition ${
                      active ? "bg-zinc-800/30" : "hover:bg-zinc-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="font-semibold text-zinc-400 truncate max-w-[100px]">
                        {sug.name}
                      </span>
                      <span>
                        {new Date(sug.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-xs line-clamp-1 truncate">
                      {sug.suggestion}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 items-center mt-1">
                      <span className="text-[10px] bg-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                        {sug.category}
                      </span>
                      {getPriorityBadge(sug.priority)}
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${getStatusColor(sug.status)}`}>
                        {sug.status.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-zinc-800 flex items-center justify-between text-xs bg-zinc-950/40">
              <button
                disabled={page <= 1}
                onClick={() => fetchSuggestions(page - 1)}
                className="rounded-lg px-2.5 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Prev
              </button>
              <span className="text-zinc-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchSuggestions(page + 1)}
                className="rounded-lg px-2.5 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Suggestion Inspector Column */}
        <div className="md:col-span-2 flex flex-col h-full min-h-0 bg-zinc-900/10">
          {selectedSuggestion ? (
            <div className="flex flex-col h-full min-h-0 divide-y divide-zinc-800/60">
              {/* Main detail view */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Meta details */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-zinc-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-md">{selectedSuggestion.name}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{selectedSuggestion.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[10px] text-zinc-500">
                      IP: {selectedSuggestion.ipAddress || "Unknown"}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Logged: {new Date(selectedSuggestion.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Main suggestion content */}
                <div className="space-y-2 border-t border-zinc-800 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-bold">
                      {selectedSuggestion.category}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 leading-relaxed text-zinc-300 text-sm whitespace-pre-wrap">
                    {selectedSuggestion.suggestion}
                  </div>
                </div>

                {/* Suggestion configuration dropdowns */}
                <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Update Status</label>
                    <select
                      value={selectedSuggestion.status}
                      onChange={(e) => handleUpdateSuggestion(selectedSuggestion._id, { status: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 px-3 py-2.5 focus:border-violet-500 focus:outline-none transition font-semibold"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Update Priority</label>
                    <select
                      value={selectedSuggestion.priority}
                      onChange={(e) => handleUpdateSuggestion(selectedSuggestion._id, { priority: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 px-3 py-2.5 focus:border-violet-500 focus:outline-none transition font-semibold"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {/* Internal developer notes */}
                <div className="border-t border-zinc-800 pt-4 space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Internal Developer Notes</label>
                  <div className="flex gap-2">
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Add developer notes (roadmap notes, rejection reason, etc.)..."
                      rows={2}
                      className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-xs text-white placeholder-zinc-700 p-3 resize-none transition"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="rounded-xl border border-zinc-850 hover:bg-zinc-850 text-white px-4 text-xs font-semibold shrink-0 transition"
                    >
                      {savingNotes ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Conversation replies */}
                {selectedSuggestion.replies && selectedSuggestion.replies.length > 0 && (
                  <div className="border-t border-zinc-800 pt-6 space-y-4">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Admin Communications</span>
                    <div className="space-y-3">
                      {selectedSuggestion.replies.map((rep: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-violet-500/20 bg-violet-600/5 p-4 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-violet-400">
                              {rep.senderName} (Staff)
                            </span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(rep.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">{rep.replyText}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reply field footer */}
              <div className="p-4 bg-zinc-950/20">
                <form onSubmit={handleReplySubmit} className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    placeholder={`Write email response to suggester...`}
                    rows={2}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-xs text-white placeholder-zinc-700 p-3 resize-none transition"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-900/25 transition"
                    >
                      {submittingReply ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Send Reply Email
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Lightbulb className="h-10 w-10 text-zinc-800 mb-2" />
              <h3 className="text-zinc-400 font-bold text-sm">Select a suggestion</h3>
              <p className="text-zinc-600 text-xs mt-1">Select an item from the backlog to modify status, write notes, and contact user.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
