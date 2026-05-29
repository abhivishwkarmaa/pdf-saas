"use client";
import React, { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "General", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
        <p className="text-zinc-400 text-sm">We&apos;ll get back to you within 2–4 business hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-2">Send a message</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Name</label>
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 focus:border-violet-500 focus:outline-none text-white text-sm px-3 py-2.5 placeholder-zinc-600 transition"
            placeholder="Your name" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email</label>
          <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 focus:border-violet-500 focus:outline-none text-white text-sm px-3 py-2.5 placeholder-zinc-600 transition"
            placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Subject</label>
        <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 focus:border-violet-500 focus:outline-none text-white text-sm px-3 py-2.5 transition">
          {["General", "Technical Support", "Bug Report", "Feature Request", "Partnership", "Enterprise"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Message</label>
        <textarea required rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 focus:border-violet-500 focus:outline-none text-white text-sm px-3 py-2.5 placeholder-zinc-600 resize-none transition"
          placeholder="Describe your issue or question..." />
      </div>
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 text-sm font-semibold transition">
        {loading ? (
          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><Send className="h-4 w-4" /> Send Message</>
        )}
      </button>
      <p className="text-xs text-zinc-600 text-center">We&apos;ll never share your email with anyone.</p>
    </form>
  );
}
