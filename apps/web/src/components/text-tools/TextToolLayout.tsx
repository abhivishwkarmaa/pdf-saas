"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, LucideIcon } from "lucide-react";
import { Toaster } from "sonner";

interface TextToolLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function TextToolLayout({
  title,
  description,
  icon: Icon,
  children,
}: TextToolLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" richColors />
      <div className="mx-auto max-w-6xl">
        {/* Navigation */}
        <Link
          href="/text-tools"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition mb-6 group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Text Tools
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <Icon className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {title}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm sm:text-base">
              {description}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
