"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home, Shield } from "lucide-react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { TOOL_CATEGORIES } from "@pdf-saas/shared";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
}

export function BreadcrumbNav({
  items,
  className,
  showHomeIcon = false,
}: BreadcrumbNavProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={cn(
          "flex flex-wrap items-center gap-1.5 text-xs text-muted",
          className
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400" />
              )}
              {isLast || !item.href ? (
                <span
                  className="font-medium text-zinc-900 dark:text-white truncate max-w-[240px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
                >
                  {index === 0 && showHomeIcon && (
                    <Home className="h-3 w-3 mr-0.5" />
                  )}
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}

export interface ToolTopNavProps {
  tool: ToolDefinition;
  action?: React.ReactNode;
  className?: string;
}

export function ToolTopNav({ tool, action, className }: ToolTopNavProps) {
  const categoryMeta = TOOL_CATEGORIES[tool.category];
  const categoryHref =
    tool.category === "calculator" ? "/calculators" : `/${tool.category}-tools`;
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: categoryMeta.label, href: categoryHref },
    { label: tool.name },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3 mb-6",
        className
      )}
    >
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <Shield className="h-3 w-3" /> Secure Sandbox
        </span>
        {action}
      </div>
    </div>
  );
}
