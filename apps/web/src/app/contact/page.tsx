import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { Mail, MessageCircle, Globe, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us — ConvertHub Support",
  description: "Get in touch with the ConvertHub team for support, partnerships, or enterprise inquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="relative border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.15),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Contact Us</h1>
          <p className="text-zinc-400 text-lg">We typically respond within 2–4 business hours.</p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-bold mb-6">Get in touch</h2>
          <div className="space-y-4 mb-8">
            {[
              { icon: Mail, title: "General Support", desc: "support@converthub.io", link: "mailto:support@converthub.io" },
              { icon: Mail, title: "Business & Partnerships", desc: "business@converthub.io", link: "mailto:business@converthub.io" },
              { icon: Mail, title: "Privacy & Legal", desc: "privacy@converthub.io", link: "mailto:privacy@converthub.io" },
              { icon: MessageCircle, title: "Community Discord", desc: "Join our Discord server", link: "https://discord.gg/converthub" },
            ].map(({ icon: Icon, title, desc, link }) => (
              <a key={title} href={link} className="flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 p-4 transition group">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Icon className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{title}</p>
                  <p className="text-zinc-500 text-sm group-hover:text-violet-400 transition">{desc}</p>
                </div>
              </a>
            ))}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Support Hours</p>
              <p className="text-xs text-zinc-500">Mon–Fri 9am–6pm UTC. We aim to respond within 2–4 hours.</p>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
