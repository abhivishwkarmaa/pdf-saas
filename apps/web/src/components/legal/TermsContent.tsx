"use client";

import React, { useState, useEffect } from "react";
import {
  FileText, User, Upload, AlertTriangle, Copyright, Cpu,
  Clock, CreditCard, XCircle, Shield, Search, ChevronRight, Mail
} from "lucide-react";

const SECTIONS = [
  { id: "acceptance", title: "Acceptance of Terms", icon: FileText },
  { id: "use-of-service", title: "Use of Service", icon: User },
  { id: "upload-restrictions", title: "Upload Restrictions", icon: Upload },
  { id: "prohibited-content", title: "Prohibited Content", icon: AlertTriangle },
  { id: "copyright", title: "Copyright Policy", icon: Copyright },
  { id: "ai-disclaimer", title: "AI Content Disclaimer", icon: Cpu },
  { id: "service-limits", title: "Service Limitations", icon: Clock },
  { id: "subscriptions", title: "Subscription & Plans", icon: CreditCard },
  { id: "termination", title: "Account Termination", icon: XCircle },
  { id: "liability", title: "Liability Disclaimer", icon: Shield },
  { id: "acceptable-use", title: "Acceptable Use Policy", icon: Shield },
  { id: "contact", title: "Contact & Disputes", icon: Mail },
];

export function TermsContent() {
  const [activeSection, setActiveSection] = useState("acceptance");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const onScroll = () => {
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) setActiveSection(s.id);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const filtered = SECTIONS.filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-16 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2563eb22_0%,_transparent_60%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-300 mb-4">
            <FileText className="h-3.5 w-3.5" />
            Effective: May 29, 2026
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Terms of Service</h1>
          <p className="mx-auto max-w-xl text-zinc-400 text-lg">
            Please read these terms carefully before using ConvertHub. By using our platform, you agree to be bound by these terms.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 lg:flex lg:gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-20 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search terms..." className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs pl-8 pr-3 py-2 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
            </div>
            <nav className="space-y-0.5">
              {filtered.map(({ id, title, icon: Icon }) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-all ${
                    activeSection === id ? "bg-blue-600/20 border border-blue-600/30 text-blue-300" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}>
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
          <TSection id="acceptance" title="Acceptance of Terms" icon={FileText}>
            <p>By accessing or using ConvertHub (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service.</p>
            <p>These Terms apply to all users of the Service, including visitors, registered users, and contributors. ConvertHub reserves the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance.</p>
            <InfoBox color="blue">We will notify users of significant changes to these Terms via a banner on the website or via email (if registered for newsletters).</InfoBox>
          </TSection>

          <TSection id="use-of-service" title="Use of Service" icon={User}>
            <p>ConvertHub grants you a limited, non-exclusive, non-transferable, revocable license to use the Service for personal or commercial file conversion purposes, subject to these Terms.</p>
            <p>You agree to:</p>
            <ul>
              <li>Use the Service only for lawful purposes</li>
              <li>Not interfere with the Service&apos;s operation or servers</li>
              <li>Not attempt to bypass rate limits, abuse APIs, or scrape the platform</li>
              <li>Take full responsibility for files you upload and convert</li>
              <li>Not impersonate ConvertHub or its representatives</li>
            </ul>
          </TSection>

          <TSection id="upload-restrictions" title="Upload Restrictions" icon={Upload}>
            <p>The following technical restrictions apply to file uploads:</p>
            <table>
              <thead><tr><th>Category</th><th>Limit</th></tr></thead>
              <tbody>
                <tr><td>Maximum file size (free)</td><td>100 MB per file</td></tr>
                <tr><td>Maximum file size (pro)</td><td>2 GB per file</td></tr>
                <tr><td>Simultaneous conversions (free)</td><td>3 concurrent jobs</td></tr>
                <tr><td>Daily conversions (free)</td><td>50 conversions / day</td></tr>
                <tr><td>File retention</td><td>1 hour after conversion</td></tr>
              </tbody>
            </table>
            <p>ConvertHub reserves the right to modify these limits at any time. Attempting to circumvent limits (e.g., through multiple accounts, VPNs, or automation) may result in account suspension.</p>
          </TSection>

          <TSection id="prohibited-content" title="Prohibited Content Policy" icon={AlertTriangle} badge="Important">
            <p>You must NOT upload or process the following types of content:</p>
            <ul>
              <li><strong className="text-white">Child sexual abuse material (CSAM)</strong> — strictly prohibited and will be reported to authorities</li>
              <li><strong className="text-white">Malware, viruses, ransomware</strong> or any malicious software</li>
              <li><strong className="text-white">Non-consensual intimate images</strong> (deepfakes, revenge porn)</li>
              <li><strong className="text-white">Terrorist content</strong> or material promoting violence</li>
              <li><strong className="text-white">Copyrighted content</strong> you don&apos;t have rights to distribute</li>
              <li><strong className="text-white">Personally identifiable information (PII)</strong> of third parties without consent</li>
              <li><strong className="text-white">Content that violates any applicable law</strong> in your jurisdiction</li>
            </ul>
            <InfoBox color="red">Violations will result in immediate account suspension and may be reported to law enforcement or the relevant authorities.</InfoBox>
          </TSection>

          <TSection id="copyright" title="Copyright Policy" icon={Copyright}>
            <p>ConvertHub respects intellectual property rights. If you believe that any content on our platform infringes your copyright, please submit a DMCA notice to <a href="mailto:dmca@converthub.io" className="text-blue-400 hover:underline">dmca@converthub.io</a> with:</p>
            <ul>
              <li>Your contact information</li>
              <li>Description of the copyrighted work</li>
              <li>Location of the infringing content</li>
              <li>Statement of good faith belief</li>
              <li>Your signature (digital or physical)</li>
            </ul>
            <p>We will process valid DMCA notices within 5 business days.</p>
          </TSection>

          <TSection id="ai-disclaimer" title="AI Content Disclaimer" icon={Cpu}>
            <p>ConvertHub uses AI models to power certain features including image enhancement, background removal, and auto-captions. By using AI features, you acknowledge:</p>
            <ul>
              <li>AI-generated outputs may not be 100% accurate</li>
              <li>AI captions may contain errors and should be reviewed before publishing</li>
              <li>AI background removal quality depends on image complexity</li>
              <li>ConvertHub is not liable for decisions made based on AI-generated content</li>
              <li>Your files are not used to train AI models without your explicit consent</li>
            </ul>
          </TSection>

          <TSection id="service-limits" title="Service Limitations & Availability" icon={Clock}>
            <p>ConvertHub provides the Service on an &quot;as-is&quot; and &quot;as-available&quot; basis. We do not guarantee:</p>
            <ul>
              <li>100% uptime or uninterrupted access to the Service</li>
              <li>That the Service will be error-free</li>
              <li>That conversion outputs will be identical to source files</li>
              <li>Specific processing times or queue positions</li>
            </ul>
            <p>We perform maintenance and updates that may temporarily reduce availability. We will provide advance notice for planned maintenance when possible.</p>
          </TSection>

          <TSection id="subscriptions" title="Subscription & Plans" icon={CreditCard}>
            <p>ConvertHub currently offers a free tier for all users. Future premium plans may be introduced with the following terms:</p>
            <ul>
              <li>Subscriptions will be billed monthly or annually</li>
              <li>Cancellations take effect at the end of the billing period</li>
              <li>Refunds are issued within 14 days of first payment if the service is unsatisfactory</li>
              <li>We reserve the right to modify pricing with 30 days notice</li>
            </ul>
          </TSection>

          <TSection id="termination" title="Account Termination" icon={XCircle}>
            <p>ConvertHub may suspend or terminate your access to the Service at any time, with or without notice, for:</p>
            <ul>
              <li>Violation of these Terms</li>
              <li>Uploading prohibited content</li>
              <li>Abuse of the platform or other users</li>
              <li>Fraudulent or illegal activity</li>
              <li>Repeated circumvention of technical limits</li>
            </ul>
            <p>You may request account deletion at any time by emailing <a href="mailto:support@converthub.io" className="text-blue-400 hover:underline">support@converthub.io</a>.</p>
          </TSection>

          <TSection id="liability" title="Liability Disclaimer" icon={Shield}>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
            <ul>
              <li>ConvertHub is not liable for any direct, indirect, incidental, special, or consequential damages</li>
              <li>We are not responsible for data loss resulting from file conversion</li>
              <li>We do not guarantee that converted files will be free from errors or data corruption</li>
              <li>Our total liability to you shall not exceed the amount you paid us in the past 12 months</li>
            </ul>
            <InfoBox color="blue">You should always keep original copies of your files before conversion. ConvertHub cannot recover deleted or expired converted files.</InfoBox>
          </TSection>

          <TSection id="acceptable-use" title="Acceptable Use Policy" icon={Shield}>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Engage in automated scraping, bulk downloads, or API abuse</li>
              <li>Reverse engineer or attempt to extract the source code of our services</li>
              <li>Create derivative services that compete with ConvertHub using our infrastructure</li>
              <li>Send spam, phishing content, or unsolicited communications</li>
              <li>Conduct load testing or security testing without written permission</li>
              <li>Violate any applicable local, national, or international laws</li>
            </ul>
          </TSection>

          <TSection id="contact" title="Contact & Dispute Resolution" icon={Mail}>
            <p>For any questions about these Terms, or to report a violation:</p>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
              <p><strong className="text-white">Legal inquiries:</strong> <a href="mailto:legal@converthub.io" className="text-blue-400 hover:underline">legal@converthub.io</a></p>
              <p><strong className="text-white">DMCA notices:</strong> <a href="mailto:dmca@converthub.io" className="text-blue-400 hover:underline">dmca@converthub.io</a></p>
              <p><strong className="text-white">Support:</strong> <a href="mailto:support@converthub.io" className="text-blue-400 hover:underline">support@converthub.io</a></p>
              <p><strong className="text-white">Governing law:</strong> These Terms are governed by the laws of the State of Delaware, USA.</p>
            </div>
          </TSection>
        </div>
      </div>
    </div>
  );
}

function TSection({ id, title, icon: Icon, badge, children }: {
  id: string; title: string; icon: React.ElementType; badge?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15 border border-blue-600/20">
          <Icon className="h-4 w-4 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {badge && <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-400">{badge}</span>}
      </div>
      <div className="space-y-4 text-zinc-400 leading-relaxed [&_strong]:text-white [&_a]:text-blue-400 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:border [&_th]:border-zinc-800 [&_th]:bg-zinc-900 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-bold [&_th]:text-zinc-300 [&_th]:uppercase [&_td]:border [&_td]:border-zinc-800 [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-sm">
        {children}
      </div>
    </section>
  );
}

function InfoBox({ color, children }: { color: "blue" | "red" | "emerald"; children: React.ReactNode }) {
  const s = { blue: "bg-blue-500/10 border-blue-500/20 text-blue-200", red: "bg-red-500/10 border-red-500/20 text-red-200", emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200" };
  return <div className={`rounded-xl border p-4 text-sm ${s[color]}`}>{children}</div>;
}
