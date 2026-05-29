"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, ChevronRight, Search, Lock, Database, Cookie, Eye, Globe, Mail, Trash2, Cpu, AlertTriangle } from "lucide-react";

const SECTIONS = [
  { id: "overview", title: "Overview", icon: Shield },
  { id: "data-collection", title: "Data We Collect", icon: Database },
  { id: "file-handling", title: "File Upload & Handling", icon: Lock },
  { id: "auto-deletion", title: "Auto File Deletion", icon: Trash2 },
  { id: "security", title: "Security Standards", icon: Shield },
  { id: "ai-processing", title: "AI Processing", icon: Cpu },
  { id: "third-party", title: "Third-Party Services", icon: Globe },
  { id: "cookies", title: "Cookies & Tracking", icon: Cookie },
  { id: "user-rights", title: "Your Rights (GDPR)", icon: Eye },
  { id: "children", title: "Children's Privacy", icon: AlertTriangle },
  { id: "contact", title: "Contact Us", icon: Mail },
];

export function PrivacyContent() {
  const [activeSection, setActiveSection] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const onScroll = () => {
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) setActiveSection(s.id);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filtered = SECTIONS.filter(s =>
    !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-16 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#7c3aed22_0%,_transparent_60%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-sm font-medium text-violet-300 mb-4">
            <Shield className="h-3.5 w-3.5" />
            Last updated: May 29, 2026
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Privacy Policy</h1>
          <p className="mx-auto max-w-xl text-zinc-400 text-lg">
            We believe privacy is a right, not a feature. Here&apos;s exactly how we handle your data.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 lg:flex lg:gap-12">
        {/* Sticky Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-20 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search sections..."
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs pl-8 pr-3 py-2 placeholder-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <nav className="space-y-0.5">
              {filtered.map(({ id, title, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-all ${
                    activeSection === id
                      ? "bg-violet-600/20 border border-violet-600/30 text-violet-300"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{title}</span>
                  {activeSection === id && <ChevronRight className="h-3 w-3 ml-auto" />}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-14">
          <Section id="overview" title="Overview" icon={Shield} badge="GDPR Compliant">
            <p>ConvertHub (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and protect information when you use our online file conversion platform at converthub.io.</p>
            <p>We operate on a <strong className="text-white">privacy-first</strong> philosophy: your files are processed transiently and deleted automatically. We never sell your data. We never store your files longer than necessary.</p>
            <InfoBox color="emerald">
              <strong>TL;DR:</strong> Files you upload are processed in memory and deleted automatically within 1 hour. We collect minimal analytics data. We never sell your personal information.
            </InfoBox>
          </Section>

          <Section id="data-collection" title="Data We Collect" icon={Database}>
            <p>We collect only the minimum data necessary to provide our services:</p>
            <SubSection title="Information You Provide">
              <ul>
                <li><strong className="text-white">Files:</strong> Files you upload for conversion are temporarily stored during processing only.</li>
                <li><strong className="text-white">Email:</strong> If you subscribe to our newsletter, we store your email address.</li>
                <li><strong className="text-white">Contact Information:</strong> If you contact support, we store your name and email for correspondence.</li>
              </ul>
            </SubSection>
            <SubSection title="Automatically Collected Data">
              <ul>
                <li><strong className="text-white">Usage analytics:</strong> Page views, tool usage frequency, and performance metrics (no personal identifiers).</li>
                <li><strong className="text-white">IP Address:</strong> Collected for security and rate-limiting purposes, not stored permanently.</li>
                <li><strong className="text-white">Browser information:</strong> User agent, screen resolution (for UI optimization only).</li>
                <li><strong className="text-white">Cookies:</strong> Session and preference cookies (see Cookies section).</li>
              </ul>
            </SubSection>
            <InfoBox color="blue">
              We do <strong>not</strong> collect names, phone numbers, or payment information (ConvertHub is entirely free).
            </InfoBox>
          </Section>

          <Section id="file-handling" title="File Upload & Handling" icon={Lock} badge="Encrypted">
            <p>All files uploaded to ConvertHub are handled with the following safeguards:</p>
            <ul>
              <li><strong className="text-white">Encrypted in transit:</strong> All file uploads and downloads use TLS 1.3 encryption (HTTPS).</li>
              <li><strong className="text-white">Isolated processing:</strong> Each conversion job runs in an isolated container environment with no access to other users&apos; files.</li>
              <li><strong className="text-white">No human access:</strong> No ConvertHub employees can view, access, or read your file contents during or after processing.</li>
              <li><strong className="text-white">No indexing:</strong> Your files are never indexed, analyzed for advertising, or used to train AI models without explicit consent.</li>
              <li><strong className="text-white">Temporary storage:</strong> Files are stored on encrypted cloud servers only for the duration of conversion + a 1-hour deletion window.</li>
            </ul>
            <InfoBox color="violet">
              <strong>AI-powered tools:</strong> When using AI features (background removal, AI enhancement), your file is processed by our private inference server. Files are never shared with third-party AI providers unless explicitly stated.
            </InfoBox>
          </Section>

          <Section id="auto-deletion" title="Auto File Deletion Policy" icon={Trash2} badge="Auto Delete">
            <p>We operate a strict automatic deletion policy for all uploaded files:</p>
            <table>
              <thead><tr><th>Event</th><th>Deletion Timeline</th></tr></thead>
              <tbody>
                <tr><td>Conversion completed</td><td>Input file deleted within <strong className="text-emerald-400">5 minutes</strong></td></tr>
                <tr><td>Output file available</td><td>Deleted <strong className="text-emerald-400">1 hour</strong> after generation</td></tr>
                <tr><td>Session expired / abandoned</td><td>Deleted within <strong className="text-emerald-400">1 hour</strong></td></tr>
                <tr><td>Server reboot</td><td>All temporary files cleared</td></tr>
              </tbody>
            </table>
            <p>You can also manually delete your output file at any time using the provided delete link in the download interface.</p>
          </Section>

          <Section id="security" title="Security Standards" icon={Shield} badge="Enterprise Grade">
            <p>We implement industry-standard security measures:</p>
            <ul>
              <li><strong className="text-white">TLS 1.3:</strong> All data in transit is encrypted using modern TLS.</li>
              <li><strong className="text-white">AES-256 at rest:</strong> Temporary files are stored with AES-256 encryption.</li>
              <li><strong className="text-white">Container isolation:</strong> Each processing job is containerized and runs in a sandboxed environment.</li>
              <li><strong className="text-white">Rate limiting:</strong> API rate limiting prevents abuse and DDoS attacks.</li>
              <li><strong className="text-white">Dependency audits:</strong> Regular automated security scans of all dependencies.</li>
              <li><strong className="text-white">Penetration testing:</strong> Annual third-party penetration tests on our infrastructure.</li>
              <li><strong className="text-white">SOC 2 Type II compliant cloud:</strong> Our cloud infrastructure providers are SOC 2 compliant.</li>
            </ul>
          </Section>

          <Section id="ai-processing" title="AI Processing Disclosure" icon={Cpu} badge="AI Powered">
            <p>ConvertHub uses AI models for certain features. Here is a full disclosure:</p>
            <SubSection title="AI Features and Data Handling">
              <ul>
                <li><strong className="text-white">AI Background Removal:</strong> Uses a local inference model. Files are not sent to external AI APIs.</li>
                <li><strong className="text-white">AI Image Enhancement:</strong> Processed on our own inference infrastructure.</li>
                <li><strong className="text-white">AI Auto-Captions:</strong> Speech-to-text is processed server-side. Audio is not retained after caption generation.</li>
                <li><strong className="text-white">AI Compression:</strong> ML-based compression algorithms run locally — no external sharing.</li>
              </ul>
            </SubSection>
            <InfoBox color="orange">
              Your files are <strong>never used to train AI models</strong> without your explicit written consent. AI processing is solely for delivering the requested service.
            </InfoBox>
          </Section>

          <Section id="third-party" title="Third-Party Services" icon={Globe}>
            <p>We use trusted third-party providers to operate our platform:</p>
            <table>
              <thead><tr><th>Service</th><th>Purpose</th><th>Data Shared</th></tr></thead>
              <tbody>
                <tr><td>Cloudflare</td><td>CDN, DDoS protection</td><td>IP address (anonymized)</td></tr>
                <tr><td>AWS S3</td><td>Temporary file storage</td><td>Encrypted file blobs</td></tr>
                <tr><td>Vercel</td><td>Web hosting</td><td>Request logs (anonymized)</td></tr>
                <tr><td>PostHog</td><td>Analytics</td><td>Anonymous usage events</td></tr>
                <tr><td>Resend</td><td>Newsletter emails</td><td>Email address (newsletter subscribers only)</td></tr>
              </tbody>
            </table>
            <p>All third-party providers are bound by data processing agreements (DPAs) compliant with GDPR Article 28.</p>
          </Section>

          <Section id="cookies" title="Cookies & Tracking" icon={Cookie}>
            <p>We use minimal, privacy-respecting cookies:</p>
            <table>
              <thead><tr><th>Cookie</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead>
              <tbody>
                <tr><td>theme</td><td>Functional</td><td>Dark/light mode preference</td><td>1 year</td></tr>
                <tr><td>session_id</td><td>Functional</td><td>Track active conversion session</td><td>Session</td></tr>
                <tr><td>ph_*</td><td>Analytics</td><td>Anonymous analytics (PostHog)</td><td>1 year</td></tr>
              </tbody>
            </table>
            <p>We do <strong className="text-white">not</strong> use advertising cookies, cross-site tracking, or sell cookie data to advertisers. You can clear cookies at any time via your browser settings.</p>
          </Section>

          <Section id="user-rights" title="Your Rights (GDPR)" icon={Eye} badge="GDPR">
            <p>If you are in the European Economic Area (EEA), you have the following rights under GDPR:</p>
            <ul>
              <li><strong className="text-white">Right of Access:</strong> Request a copy of personal data we hold about you.</li>
              <li><strong className="text-white">Right to Rectification:</strong> Correct inaccurate personal data.</li>
              <li><strong className="text-white">Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
              <li><strong className="text-white">Right to Portability:</strong> Receive your data in a machine-readable format.</li>
              <li><strong className="text-white">Right to Object:</strong> Object to processing based on legitimate interest.</li>
              <li><strong className="text-white">Right to Restrict Processing:</strong> Request restriction of processing under certain circumstances.</li>
              <li><strong className="text-white">Right to Withdraw Consent:</strong> Withdraw consent at any time for consent-based processing.</li>
            </ul>
            <p>To exercise your rights, contact us at <a href="mailto:privacy@converthub.io" className="text-violet-400 hover:underline">privacy@converthub.io</a>. We will respond within 30 days.</p>
          </Section>

          <Section id="children" title="Children's Privacy" icon={AlertTriangle}>
            <p>ConvertHub is not directed at children under the age of 13 (or 16 in certain jurisdictions). We do not knowingly collect personal information from children.</p>
            <p>If you believe we have inadvertently collected data from a child, please contact us at <a href="mailto:privacy@converthub.io" className="text-violet-400 hover:underline">privacy@converthub.io</a> and we will delete it promptly.</p>
          </Section>

          <Section id="contact" title="Contact Us" icon={Mail}>
            <p>For all privacy-related inquiries, please contact our Data Protection team:</p>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
              <p><strong className="text-white">Email:</strong> <a href="mailto:privacy@converthub.io" className="text-violet-400 hover:underline">privacy@converthub.io</a></p>
              <p><strong className="text-white">Response time:</strong> Within 5 business days (GDPR: max 30 days)</p>
              <p><strong className="text-white">Website:</strong> <Link href="/" className="text-violet-400 hover:underline">converthub.io</Link></p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function Section({
  id, title, icon: Icon, badge, children
}: {
  id: string; title: string; icon: React.ElementType; badge?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/15 border border-violet-600/20">
          <Icon className="h-4 w-4 text-violet-400" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {badge && (
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            {badge}
          </span>
        )}
      </div>
      <div className="prose prose-zinc prose-invert max-w-none space-y-4 text-zinc-400 leading-relaxed [&_strong]:text-white [&_a]:text-violet-400 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:border [&_th]:border-zinc-800 [&_th]:bg-zinc-900 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-bold [&_th]:text-zinc-300 [&_th]:uppercase [&_td]:border [&_td]:border-zinc-800 [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-sm">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-2">{title}</h3>
      {children}
    </div>
  );
}

function InfoBox({ color, children }: { color: "emerald" | "blue" | "violet" | "orange"; children: React.ReactNode }) {
  const styles = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-200",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-200",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-200",
  };
  return (
    <div className={`rounded-xl border p-4 text-sm ${styles[color]}`}>
      {children}
    </div>
  );
}
