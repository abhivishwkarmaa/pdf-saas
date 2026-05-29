"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mail,
  Search,
  CheckCircle,
  Trash2,
  Reply,
  Loader2,
  Clock,
  User,
  ShieldAlert,
  Inbox,
  Send,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminMessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Selected message state (for inspectors)
  const initialId = searchParams.get("id");
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  // Messages list state
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Filtering / pagination states
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMessages = async (currentPage = 1, searchQuery = search, statusFilter = status) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setLoadingList(true);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/messages`);
      url.searchParams.append("page", currentPage.toString());
      url.searchParams.append("limit", "10");
      if (searchQuery) url.searchParams.append("search", searchQuery);
      if (statusFilter) url.searchParams.append("status", statusFilter);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch messages list");
      const data = await response.json();

      if (data.success) {
        setMessages(data.data);
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);

        // If an initial ID is in URL, load it up in inspector
        if (initialId && !selectedMessage) {
          const matched = data.data.find((m: any) => m._id === initialId);
          if (matched) {
            setSelectedMessage(matched);
            // Mark as read automatically when opened if it was unread
            if (matched.status === "unread") {
              updateStatus(matched._id, "read");
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load message list.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchMessages(1, "", "");
  }, [initialId]);

  const selectMessage = async (msg: any) => {
    setSelectedMessage(msg);
    // Push ID to URL query without hard reloading
    router.replace(`/admin/messages?id=${msg._id}`);
    
    // Mark as read immediately on open
    if (msg.status === "unread") {
      await updateStatus(msg._id, "read");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/messages/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        // Update list inline
        setMessages((prev) =>
          prev.map((m) => (m._id === id ? { ...m, status: newStatus } : m))
        );
        // Update inspector inline
        if (selectedMessage && selectedMessage._id === id) {
          setSelectedMessage((p: any) => ({ ...p, status: newStatus }));
        }
        if (newStatus === "resolved") {
          toast.success("Support ticket marked as resolved.");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/messages/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Message deleted successfully.");
        setSelectedMessage(null);
        router.replace("/admin/messages");
        fetchMessages(page);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete message.");
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    setSubmittingReply(true);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messageId: selectedMessage._id,
            replyText,
          }),
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Reply email sent to user!");
        setReplyText("");
        // Reload list and details to fetch new replies array
        setSelectedMessage(data.data);
        setMessages((prev) =>
          prev.map((m) => (m._id === selectedMessage._id ? data.data : m))
        );
      } else {
        toast.error(data.message || "Failed to dispatch reply.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while replying.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(1, search, status);
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "unread":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400">Unread</span>;
      case "read":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400">Read</span>;
      case "replied":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 border border-violet-500/20 text-violet-400">Replied</span>;
      case "resolved":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Resolved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="h-[80vh] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Support Inbox</h1>
          <p className="text-zinc-500 text-sm mt-1">Review contact form submissions and reply directly.</p>
        </div>
      </div>

      {/* Main split box */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/10 backdrop-blur-sm">
        {/* Messages List Column */}
        <div className="md:col-span-1 border-r border-zinc-800 flex flex-col h-full min-h-0 bg-zinc-950/20">
          {/* Search + filter bar */}
          <form onSubmit={handleSearchSubmit} className="p-4 border-b border-zinc-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search inbox..."
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-xs text-white placeholder-zinc-700 pl-9 pr-3 py-2.5 transition"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  fetchMessages(1, search, e.target.value);
                }}
                className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 px-3 py-2 focus:border-violet-500 focus:outline-none transition"
              >
                <option value="">All Statuses</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="resolved">Resolved</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 text-xs font-semibold transition"
              >
                Find
              </button>
            </div>
          </form>

          {/* List area */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
            {loadingList ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                <Inbox className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-zinc-500 text-xs font-medium">Your inbox is clean!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const active = selectedMessage?._id === msg._id;
                return (
                  <button
                    key={msg._id}
                    onClick={() => selectMessage(msg)}
                    className={`w-full text-left p-4 flex flex-col gap-1 transition ${
                      active ? "bg-zinc-800/30" : "hover:bg-zinc-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs truncate max-w-[120px]">
                        {msg.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-300 text-xs font-medium truncate flex-1">
                        {msg.subject}
                      </span>
                      {getStatusBadge(msg.status)}
                    </div>
                    <p className="text-zinc-500 text-[11px] line-clamp-1 truncate mt-0.5">
                      {msg.message}
                    </p>
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
                onClick={() => fetchMessages(page - 1)}
                className="rounded-lg px-2.5 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Prev
              </button>
              <span className="text-zinc-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchMessages(page + 1)}
                className="rounded-lg px-2.5 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Message Inspector Column */}
        <div className="md:col-span-2 flex flex-col h-full min-h-0 bg-zinc-900/10">
          {selectedMessage ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Header actions */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedMessage.status)}
                  <span className="text-xs text-zinc-500 font-medium">
                    IP: {selectedMessage.ipAddress || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMessage.status !== "resolved" && (
                    <button
                      onClick={() => updateStatus(selectedMessage._id, "resolved")}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedMessage._id)}
                    className="rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-1.5 text-xs font-semibold transition"
                    title="Delete Message"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Message Details Inspector */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Details */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-md">{selectedMessage.name}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{selectedMessage.email}</p>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4 space-y-2">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Subject</span>
                    <h3 className="text-lg font-bold text-white leading-snug">{selectedMessage.subject}</h3>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 leading-relaxed text-zinc-300 text-sm whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* Reply Threads / Conversation History */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div className="border-t border-zinc-800 pt-6 space-y-4">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Conversation History</span>
                    <div className="space-y-4">
                      {selectedMessage.replies.map((rep: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-violet-500/20 bg-violet-600/5 p-4 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
                              <Reply className="h-3 w-3" />
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

              {/* Reply Form Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/20">
                <form onSubmit={handleReplySubmit} className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    placeholder={`Reply to ${selectedMessage.name}...`}
                    rows={3}
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
              <Mail className="h-10 w-10 text-zinc-800 mb-2" />
              <h3 className="text-zinc-400 font-bold text-sm">Select an inquiry</h3>
              <p className="text-zinc-600 text-xs mt-1">Select a support ticket from the list to review details and reply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
