import { FileText, Image, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: FileText,
    title: "PDF tools",
    description: "Merge, split, compress, and convert PDFs in seconds",
    className: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30",
    iconClass: "text-emerald-600",
  },
  {
    icon: Image,
    title: "Image tools",
    description: "Resize, compress, and convert JPG, PNG, WebP, and more",
    className: "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30",
    iconClass: "text-amber-600",
  },
  {
    icon: Sparkles,
    title: "Quick utilities",
    description: "JSON, calculators, encoders — instant results",
    className: "border-indigo-200 bg-indigo-50/80 dark:border-indigo-900 dark:bg-indigo-950/30",
    iconClass: "text-indigo-600",
  },
] as const;

export function PopularPreview() {
  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-3">
      {HIGHLIGHTS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className={`flex gap-3 rounded-xl border p-4 ${item.className}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${item.iconClass}`} />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
