"use client";
import React, { useState } from "react";
import { MessageSquare, X, Send, CheckCircle2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

export function SuggestionsModal() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", suggestion: "", category: "New Tool Request" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.suggestion) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const derivedTitle = form.suggestion.split("\n")[0].slice(0, 50) || "Feedback Submission";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userName: form.name,
            userEmail: form.email,
            category: form.category,
            title: derivedTitle,
            message: form.suggestion,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        toast.success(data.message || "Feedback submitted! Thank you.");
        setForm({ name: "", email: "", suggestion: "", category: "New Tool Request" });
      } else {
        toast.error(data.message || "Failed to submit feedback.");
      }
    } catch (error) {
      console.error("Suggestion submission error:", error);
      toast.error("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Wait for exit transition to finish before resetting state
    setTimeout(() => {
      setSuccess(false);
    }, 300);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold px-4 py-3 shadow-lg shadow-violet-900/30 hover:shadow-violet-600/40 hover:scale-105 transition-all duration-200"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="text-sm">Feedback</span>
      </button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 p-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <Lightbulb className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Suggest a Feature</h3>
                    <p className="text-xs text-zinc-500">Help us shape the future of ConvertHub</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-10 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4 animate-bounce">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Thank you!</h4>
                    <p className="text-sm text-zinc-400 max-w-sm">
                      Your suggestion was logged. Our product developers review submissions weekly and will update you via email if we planned or completed it!
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2 text-sm font-semibold transition"
                    >
                      Close Modal
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Name</label>
                        <input
                          required
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-white text-sm px-3 py-2.5 placeholder-zinc-700 transition"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email</label>
                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-white text-sm px-3 py-2.5 placeholder-zinc-700 transition"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-white text-sm px-3 py-2.5 transition"
                      >
                        {[
                          "New Tool Request",
                          "UI Improvement",
                          "Bug Report",
                          "AI Feature Suggestion",
                          "Performance Issue",
                          "General Feedback",
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Suggestion / Idea</label>
                      <textarea
                        required
                        rows={4}
                        value={form.suggestion}
                        onChange={(e) => setForm((p) => ({ ...p, suggestion: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-none text-white text-sm px-3 py-2.5 placeholder-zinc-700 resize-none transition"
                        placeholder="What feature or tool should we build next? Tell us your idea..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 text-sm font-semibold transition"
                    >
                      {loading ? (
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Submit Suggestion
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
