import type { Metadata } from "next";
import { Copyright, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "DMCA Policy — ConvertHub",
  description: "ConvertHub DMCA copyright takedown policy and process.",
};

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="relative border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(239,68,68,0.1),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-sm text-red-300 mb-4">
            <Copyright className="h-3.5 w-3.5" />
            DMCA Policy
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">DMCA Copyright Policy</h1>
          <p className="text-zinc-400">ConvertHub respects intellectual property rights and responds to valid DMCA notices.</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 space-y-10 text-zinc-400 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Overview</h2>
          <p>ConvertHub complies with the Digital Millennium Copyright Act (DMCA). If you believe content on our platform infringes your copyright, please submit a formal takedown notice to our designated DMCA agent.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">Filing a DMCA Takedown Notice</h2>
          <p className="mb-3">Your notice must include all of the following:</p>
          <ul className="space-y-2 list-disc pl-5">
            {[
              "Your full legal name and contact information (address, phone, email)",
              "A description of the copyrighted work you claim has been infringed",
              "The URL or specific location of the allegedly infringing content on ConvertHub",
              "A statement that you have a good faith belief that the use is not authorized by the copyright owner",
              "A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf",
              "Your physical or electronic signature",
            ].map(item => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">Counter-Notification</h2>
          <p>If you believe content was removed in error, you may file a counter-notification. Counter-notifications must include your contact info, identification of the removed content, a statement under penalty of perjury that you have a good faith belief the material was removed by mistake, and your consent to jurisdiction.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">Repeat Infringers</h2>
          <p>ConvertHub has a policy of terminating accounts of users who are repeat infringers in appropriate circumstances.</p>
        </section>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex items-start gap-4">
          <Mail className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-white mb-1">Submit DMCA Notices To:</p>
            <p><a href="mailto:dmca@converthub.io" className="text-violet-400 hover:underline">dmca@converthub.io</a></p>
            <p className="text-sm mt-2 text-zinc-500">Response time: within 5 business days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
