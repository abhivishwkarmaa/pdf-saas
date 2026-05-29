import type { Metadata } from "next";
import Link from "next/link";
import { Cookie, ChevronRight, Shield, ToggleLeft, Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Cookie Policy — ConvertHub",
  description: "Learn how ConvertHub uses cookies and tracking technologies.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="relative border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(234,179,8,0.1),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-sm text-amber-300 mb-4">
            <Cookie className="h-3.5 w-3.5" />
            Last updated: May 29, 2026
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Cookie Policy</h1>
          <p className="text-zinc-400">How we use cookies and similar technologies on ConvertHub.</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 space-y-10 text-zinc-400 leading-relaxed">
        {[
          {
            title: "What Are Cookies?",
            icon: Cookie,
            content: "Cookies are small text files that are stored on your device when you visit a website. They help websites remember your preferences and improve your browsing experience. ConvertHub uses only essential and analytics cookies — we do not use advertising cookies."
          },
          {
            title: "Cookies We Use",
            icon: Settings,
            content: null,
            table: [
              ["Cookie Name", "Type", "Purpose", "Duration"],
              ["theme", "Functional", "Dark/light mode preference", "1 year"],
              ["session_id", "Functional", "Active conversion session", "Session"],
              ["ph_*", "Analytics", "Anonymous usage analytics (PostHog)", "1 year"],
            ]
          },
          {
            title: "What We Don't Do",
            icon: Shield,
            content: "We do NOT use advertising cookies, cross-site tracking, third-party ad networks, or sell any cookie data. We never fingerprint your browser for advertising purposes."
          },
          {
            title: "Managing Cookies",
            icon: ToggleLeft,
            content: "You can control and delete cookies through your browser settings. Disabling functional cookies may affect your experience (e.g., theme preference won't persist). Disabling analytics cookies won't affect core functionality. To opt out of PostHog analytics, visit their opt-out page."
          },
        ].map(({ title, icon: Icon, content, table }) => (
          <section key={title}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Icon className="h-4 w-4 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
            </div>
            {content && <p>{content}</p>}
            {table && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>{table[0].map(h => <th key={h} className="text-left border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {table.slice(1).map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j} className="border border-zinc-800 px-4 py-2.5">{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm"><strong className="text-white">Questions?</strong> Contact us at <a href="mailto:privacy@converthub.io" className="text-violet-400 hover:underline">privacy@converthub.io</a></p>
        </div>
      </div>
    </div>
  );
}
