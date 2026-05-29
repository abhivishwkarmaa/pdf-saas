import Link from "next/link";
import { Home, Search, ArrowLeft, Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-zinc-950 text-white px-4">
      <div className="text-center max-w-lg">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <div className="text-9xl font-black text-zinc-800 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-2xl shadow-violet-600/40">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-3">Page Not Found</h1>
        <p className="text-zinc-500 mb-8 leading-relaxed">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Try browsing our tools or go back home.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 text-sm font-semibold transition hover:shadow-lg hover:shadow-violet-600/25"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/tools"
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 text-sm font-semibold transition"
          >
            <Search className="h-4 w-4" />
            Browse All Tools
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2 text-sm">
          {["PDF Tools", "Image Tools", "Video Tools", "FAQ", "Contact"].map((label) => {
            const hrefs: Record<string, string> = {
              "PDF Tools": "/pdf-tools",
              "Image Tools": "/image-tools",
              "Video Tools": "/video-tools",
              "FAQ": "/faq",
              "Contact": "/contact",
            };
            return (
              <Link key={label} href={hrefs[label]}
                className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-zinc-500 hover:text-white hover:border-zinc-600 transition text-xs">
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
