"use client";
import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Trash2,
  Reply,
  Loader2,
  Clock,
  User,
  ShieldAlert,
  Inbox,
  Send,
  AlertTriangle,
  Lightbulb,
  Bug,
  Cpu,
  Monitor,
  Calendar,
  Layers,
  Sparkles,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminFeedbackPage() {
  const [stats, setStats] = useState<any>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Inspector inputs
  const [internalNotes, setInternalNotes] = useState("");
  const [replyText, setReplyText] = useState("");

  const fetchStats = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setLoadingStats(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/feedback/admin/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to load stats");
      const data = await response.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load feedback metrics.");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchFeedbackList = async (currentPage = 1, searchQuery = search, cat = category, stat = status, pri = priority, ass = assignee, unres = unresolvedOnly, sort = sortBy) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setLoadingList(true);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/feedback/admin`);
      url.searchParams.append("page", currentPage.toString());
      url.searchParams.append("limit", "10");
      if (searchQuery) url.searchParams.append("search", searchQuery);
      if (cat) url.searchParams.append("category", cat);
      if (stat) url.searchParams.append("status", stat);
      if (pri) url.searchParams.append("priority", pri);
      if (ass) url.searchParams.append("assignee", ass);
      if (unres) url.searchParams.append("unresolved", "true");
      url.searchParams.append("sortBy", sort);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch feedback list");
      const data = await response.json();

      if (data.success) {
        setFeedbackList(data.data);
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);

        // Re-sync inspector if open
        if (selectedItem) {
          const fresh = data.data.find((f: any) => f._id === selectedItem._id);
          if (fresh) {
            setSelectedItem(fresh);
            setInternalNotes(fresh.adminNotes || "");
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load feedback logs.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchFeedbackList(1);
  }, []);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeedbackList(1, search, category, status, priority, assignee, unresolvedOnly, sortBy);
  };

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setInternalNotes(item.adminNotes || "");
    setReplyText("");
  };

  const handleUpdateFeedback = async (id: string, updates: any) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/feedback/admin/${id}`,
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
        toast.success("Feedback updated successfully.");
        fetchStats();
        // Update list inline
        setFeedbackList((prev) => prev.map((f) => (f._id === id ? data.data : f)));
        // Update inspector
        if (selectedItem && selectedItem._id === id) {
          setSelectedItem(data.data);
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
    if (!selectedItem) return;
    setSavingNotes(true);
    await handleUpdateFeedback(selectedItem._id, { adminNotes: internalNotes });
    setSavingNotes(false);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedItem) return;

    setSubmittingReply(true);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/feedback/admin/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            feedbackId: selectedItem._id,
            replyText,
          }),
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Response email delivered successfully!");
        setReplyText("");
        setSelectedItem(data.data);
        setFeedbackList((prev) =>
          prev.map((f) => (f._id === selectedItem._id ? data.data : f))
        );
      } else {
        toast.error(data.message || "Failed to dispatch email reply.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while replying.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!selectedItem) return;
    setResendingEmail(true);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/feedback/admin/${selectedItem._id}/resend-confirmation`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Confirmation email resent successfully!");
        fetchFeedbackList(page);
      } else {
        toast.error(data.message || "Delivery failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error resending email.");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback ticket?")) return;

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/messages/${id}`, // Reuse spam delete endpoint or map custom. Let's delete message.
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Feedback deletion: for simplicity we can support manual deletion.
      // Since feedback deletes could be added, let's show inline remove or update status to Rejected.
      await handleUpdateFeedback(id, { status: "rejected" });
      toast.success("Feedback marked as rejected.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject feedback.");
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "critical":
        return <span className="px-2 py-0.5 rounded bg-rose-600 border border-rose-500 text-white font-extrabold uppercase text-[8px] animate-pulse">Critical</span>;
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

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "completed":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Completed</span>;
      case "in_progress":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">In Progress</span>;
      case "planned":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400">Planned</span>;
      case "under_review":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-violet-500/10 border border-violet-500/20 text-violet-400">Under Review</span>;
      case "rejected":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-zinc-800 border border-zinc-700 text-zinc-500">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 h-[80vh] flex flex-col">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Developer Feedback Portal</h1>
        <p className="text-zinc-500 text-sm mt-1">Review feedback, bugs, priority scoring, and auto-delivery logs.</p>
      </div>

      {/* Stats Cards Section */}
      {!loadingStats && stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
          {[
            { label: "Total Feedback", val: stats.total, icon: Layers, color: "text-zinc-300" },
            { label: "Pending Review", val: stats.status.pending, icon: Clock, color: "text-zinc-500" },
            { label: "Planned Roadmaps", val: stats.status.planned, icon: Lightbulb, color: "text-blue-400" },
            { label: "In Development", val: stats.status.inProgress, icon: Cpu, color: "text-amber-400" },
            { label: "Completed Shipped", val: stats.status.completed, icon: FileCheck, color: "text-emerald-400" },
            { label: "Critical Priority", val: stats.priority.critical, icon: ShieldAlert, color: "text-rose-500 animate-pulse" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{s.label}</span>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-extrabold text-white">{s.val}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Backlog Split layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/10 backdrop-blur-sm">
        {/* Feedback List Panel */}
        <div className="md:col-span-1 border-r border-zinc-800 flex flex-col h-full min-h-0 bg-zinc-950/20">
          {/* Search and filter form */}
          <form onSubmit={handleApplyFilters} className="p-4 border-b border-zinc-800 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search feedback..."
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-xs text-white placeholder-zinc-700 pl-9 pr-3 py-2.5 transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 px-2 py-2 focus:border-violet-500 focus:outline-none font-semibold transition"
              >
                <option value="">All Categories</option>
                <option value="Bug Report">Bug Reports</option>
                <option value="Feature Request">Feature Requests</option>
                <option value="UI/UX Suggestion">UI/UX Suggestions</option>
                <option value="Performance Issue">Performance</option>
                <option value="AI Tool Suggestion">AI Suggestions</option>
                <option value="Video Tool Feedback">Video Tools</option>
                <option value="Image Tool Feedback">Image Tools</option>
                <option value="General Feedback">General Feedback</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 px-2 py-2 focus:border-violet-500 focus:outline-none font-semibold transition"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 px-2 py-2 focus:border-violet-500 focus:outline-none font-semibold transition"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 px-2 py-2 focus:border-violet-500 focus:outline-none font-semibold transition"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unresolvedOnly}
                  onChange={(e) => setUnresolvedOnly(e.target.checked)}
                  className="rounded border-zinc-850 text-violet-600 focus:ring-0 bg-zinc-950 h-3.5 w-3.5"
                />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Unresolved Issues</span>
              </label>
              <button
                type="submit"
                className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 text-xs font-semibold transition"
              >
                Apply
              </button>
            </div>
          </form>

          {/* List area */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
            {loadingList ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              </div>
            ) : feedbackList.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                <Inbox className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-zinc-500 text-xs font-medium">No feedback tickets matches filters</p>
              </div>
            ) : (
              feedbackList.map((item) => {
                const active = selectedItem?._id === item._id;
                const isCritical = item.priority === "critical";
                return (
                  <button
                    key={item._id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-left p-4 flex flex-col gap-1.5 border-l-2 transition ${
                      isCritical
                        ? active
                          ? "border-rose-600 bg-rose-500/5"
                          : "border-rose-500 hover:bg-rose-500/5 bg-rose-950/5"
                        : active
                        ? "border-violet-600 bg-zinc-800/30"
                        : "border-transparent hover:bg-zinc-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="font-semibold text-zinc-400 truncate max-w-[120px]">
                        {item.userName}
                      </span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-white text-xs line-clamp-1 truncate">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 items-center mt-1">
                      <span className="text-[9px] font-semibold bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                        {item.category}
                      </span>
                      {getPriorityBadge(item.priority)}
                      {getStatusBadge(item.status)}
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
                onClick={() => fetchFeedbackList(page - 1)}
                className="rounded-lg px-2.5 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Prev
              </button>
              <span className="text-zinc-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchFeedbackList(page + 1)}
                className="rounded-lg px-2.5 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Feedback Inspector Pane */}
        <div className="md:col-span-2 flex flex-col h-full min-h-0 bg-zinc-900/10">
          {selectedItem ? (
            <div className="flex flex-col h-full min-h-0 divide-y divide-zinc-800/60">
              {/* Main details display */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Meta block */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-zinc-850 border border-zinc-800 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-zinc-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-md">{selectedItem.userName}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{selectedItem.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3.5 w-3.5 shrink-0" />
                      {selectedItem.browserInfo || "Browser"} • {selectedItem.deviceInfo || "Device"}
                    </span>
                    <span>IP: {selectedItem.ipAddress || "Unknown"}</span>
                    <span>Submitted: {new Date(selectedItem.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Main Content */}
                <div className="space-y-3 border-t border-zinc-800 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-violet-500/10 border border-violet-500/25 text-violet-400 px-2 py-0.5 rounded font-bold">
                      {selectedItem.category}
                    </span>
                    {getPriorityBadge(selectedItem.priority)}
                    {getStatusBadge(selectedItem.status)}
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{selectedItem.title}</h3>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 leading-relaxed text-zinc-300 text-sm whitespace-pre-wrap">
                    {selectedItem.message}
                  </div>
                </div>

                {/* Email Delivery Audit Box */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Auto-Responder Delivery Status</span>
                    <button
                      onClick={handleResendConfirmation}
                      disabled={resendingEmail}
                      className="rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white px-2.5 py-1 text-[10px] font-bold flex items-center gap-1.5 transition"
                    >
                      {resendingEmail ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Resend Confirmation
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">Sent Status</p>
                      <p className={selectedItem.emailSent ? "text-emerald-400" : "text-rose-400"}>
                        {selectedItem.emailSent ? "Dispatched" : "Pending/Failed"}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">Sent Timestamp</p>
                      <p className="text-zinc-300">
                        {selectedItem.sentAt ? new Date(selectedItem.sentAt).toLocaleDateString() : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">SMTP Log Status</p>
                      <p className={`capitalize ${selectedItem.deliveryStatus === "sent" ? "text-emerald-400" : selectedItem.deliveryStatus === "failed" ? "text-rose-400" : "text-zinc-500"}`}>
                        {selectedItem.deliveryStatus}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration Actions */}
                <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Roadmap Status</label>
                    <select
                      value={selectedItem.status}
                      onChange={(e) => handleUpdateFeedback(selectedItem._id, { status: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 px-3 py-2.5 focus:border-violet-500 focus:outline-none font-semibold transition"
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Priority</label>
                    <select
                      value={selectedItem.priority}
                      onChange={(e) => handleUpdateFeedback(selectedItem._id, { priority: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 px-3 py-2.5 focus:border-violet-500 focus:outline-none font-semibold transition"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Assigned Developer</label>
                    <select
                      value={selectedItem.assignedDeveloper || ""}
                      onChange={(e) => handleUpdateFeedback(selectedItem._id, { assignedDeveloper: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 px-3 py-2.5 focus:border-violet-500 focus:outline-none font-semibold transition"
                    >
                      <option value="">Unassigned</option>
                      <option value="Alex Chen">Alex Chen (Senior Dev)</option>
                      <option value="Vishwa Karma">Vishwa Karma (Backend)</option>
                      <option value="Taylor Smith">Taylor Smith (UX Designer)</option>
                    </select>
                  </div>
                </div>

                {/* Internal developer notes */}
                <div className="border-t border-zinc-800 pt-4 space-y-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">Internal Team Notes</label>
                  <div className="flex gap-2">
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Write private team debugging notes, roadmap assignments or internal logs..."
                      rows={2}
                      className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-xs text-white placeholder-zinc-700 p-3 resize-none transition"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="rounded-xl border border-zinc-850 hover:bg-zinc-800 text-white px-4 text-xs font-semibold transition shrink-0"
                    >
                      {savingNotes ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Previous replies / Conversation logs */}
                {selectedItem.replies && selectedItem.replies.length > 0 && (
                  <div className="border-t border-zinc-800 pt-6 space-y-4">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Staff Reply History</span>
                    <div className="space-y-3">
                      {selectedItem.replies.map((rep: any, idx: number) => (
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

              {/* Developer response email form */}
              <div className="p-4 bg-zinc-950/20 shrink-0">
                <form onSubmit={handleReplySubmit} className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    placeholder={`Reply directly to ${selectedItem.userName} via email...`}
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
                          <Send className="h-3.5 w-3.5" />
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
              <MessageSquare className="h-10 w-10 text-zinc-800 mb-2" />
              <h3 className="text-zinc-400 font-bold text-sm">Select feedback ticket</h3>
              <p className="text-zinc-600 text-xs mt-1">Select an item from the list to update properties, assign tasks, or respond.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
