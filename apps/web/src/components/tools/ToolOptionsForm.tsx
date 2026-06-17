"use client";

import { useState } from "react";
import { Plus, Trash2, RotateCw, FilePlus } from "lucide-react";
import { getToolOptionFields, type ToolOptionField } from "@/lib/tool-options";

interface ToolOptionsFormProps {
  slug: string;
  options: Record<string, string>;
  onChange: (options: Record<string, string>) => void;
}

export function ToolOptionsForm({ slug, options, onChange }: ToolOptionsFormProps) {
  const fields = getToolOptionFields(slug);
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3" role="group" aria-label="Tool options">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Options
      </p>
      {fields.map((field) => {
        if ((slug === "pdf-to-jpg" || slug === "pdf-to-png") && field.key === "quality" && options.mode === "extract") {
          return null;
        }
        const isImageToPdf = ["jpg-to-pdf", "png-to-pdf", "scan-to-pdf", "image-to-pdf"].includes(slug);
        if (isImageToPdf && field.key === "orientation" && options.pageSize === "fit") {
          return null;
        }
        return (
          <OptionField
            key={field.key}
            slug={slug}
            field={field}
            value={options[field.key] ?? ""}
            onChange={(value) => onChange({ ...options, [field.key]: value })}
          />
        );
      })}
    </div>
  );
}

function OptionField({
  slug,
  field,
  value,
  onChange,
}: {
  slug: string;
  field: ToolOptionField;
  value: string;
  onChange: (value: string) => void;
}) {
  let errorMsg = "";
  if (value) {
    if (field.key === "ranges" || field.key === "pages") {
      let allowedRegex = /[^0-9\-\s,;]/;
      if (slug === "rotate-pdf" && field.key === "pages") {
        allowedRegex = /[^0-9\-\s,;:]/;
      }
      if (allowedRegex.test(value)) {
        errorMsg = slug === "rotate-pdf" && field.key === "pages"
          ? "Use only numbers, hyphens (-), colons (:) and separators (e.g. 1:90, 4:180)"
          : "Use only numbers, hyphens (-) and separators (like commas or spaces)";
      }
    } else if (field.key === "order") {
      const cleanVal = value.toLowerCase().replace(/blank/g, "").replace(/b/g, "");
      if (/[^0-9\s,;]/.test(cleanVal)) {
        errorMsg = "Use only numbers, 'b' / 'blank' (to insert a blank page), and separators";
      }
    }
  }

  return (
    <div className="block text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {field.label}
      </span>
      {field.type === "select" && field.options ? (
        <select
          className="input mt-1.5"
          value={value || field.options[0]?.value}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={
            field.type === "password"
              ? "password"
              : field.type === "number"
                ? "number"
                : "text"
          }
          className={`input mt-1.5 ${errorMsg ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {errorMsg && (
        <p className="mt-1 text-xs text-red-500 font-medium">
          {errorMsg}
        </p>
      )}

      {slug === "organize-pdf" && field.key === "order" && (
        <OrganizePdfHelper value={value} onChange={onChange} />
      )}

      {slug === "rotate-pdf" && field.key === "pages" && (
        <RotatePdfHelper value={value} onChange={onChange} />
      )}
    </div>
  );
}

function OrganizePdfHelper({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [pageNum, setPageNum] = useState("");
  const tokens = value.split(/[\s,;]+/).filter(Boolean);

  const removeToken = (index: number) => {
    const updated = tokens.filter((_, i) => i !== index);
    onChange(updated.join(", "));
  };

  const addBlank = () => {
    onChange([...tokens, "b"].join(", "));
  };

  const addPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageNum.trim()) return;
    onChange([...tokens, pageNum.trim()].join(", "));
    setPageNum("");
  };

  const clearAll = () => {
    onChange("");
  };

  return (
    <div className="mt-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/20 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Visual Page Sequence</span>
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium transition"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {tokens.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">No pages added yet. Use the controls below to build your sequence.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
          {tokens.map((token, idx) => {
            const isBlank = token.toLowerCase() === "b" || token.toLowerCase() === "blank";
            return (
              <span
                key={idx}
                className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                  isBlank
                    ? "bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 border-dashed"
                    : "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300"
                }`}
              >
                {isBlank ? "📄 Blank" : `📄 Page ${token}`}
                <button
                  type="button"
                  onClick={() => removeToken(idx)}
                  className="hover:text-red-500 ml-0.5 text-zinc-400 transition"
                  aria-label="Remove item"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={addBlank}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition"
        >
          <FilePlus className="h-3.5 w-3.5 text-zinc-505" /> + Blank Page
        </button>

        <form onSubmit={addPage} className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Page (e.g. 3)"
            value={pageNum}
            onChange={(e) => setPageNum(e.target.value)}
            className="w-24 px-2 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="submit"
            className="flex items-center justify-center p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition"
            aria-label="Add page"
          >
            <Plus className="h-3.5 w-3.5 text-violet-500" />
          </button>
        </form>
      </div>
    </div>
  );
}

function RotatePdfHelper({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [pageInput, setPageInput] = useState("");
  const [angleInput, setAngleInput] = useState("90");
  const tokens = value.split(/[\s,;]+/).filter(Boolean);

  const removeToken = (index: number) => {
    const updated = tokens.filter((_, i) => i !== index);
    onChange(updated.join(", "));
  };

  const addRotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageInput.trim()) return;
    const newToken = `${pageInput.trim()}:${angleInput}`;
    onChange([...tokens, newToken].join(", "));
    setPageInput("");
  };

  const clearAll = () => {
    onChange("");
  };

  return (
    <div className="mt-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/20 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Visual Page Rotations</span>
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium transition"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {tokens.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">No custom page rotations added yet. Use the controls below to configure rotations.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
          {tokens.map((token, idx) => {
            const hasColon = token.includes(":");
            let label = `🔄 Page ${token} (Default)`;
            if (hasColon) {
              const [p, a] = token.split(":");
              label = `🔄 Page ${p} @ ${a}°`;
            }
            return (
              <span
                key={idx}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeToken(idx)}
                  className="hover:text-red-500 ml-0.5 text-zinc-400 transition"
                  aria-label="Remove item"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      <form onSubmit={addRotation} className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Page (e.g. 4)"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          className="w-24 px-2 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-amber-500"
        />

        <select
          value={angleInput}
          onChange={(e) => setAngleInput(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="90">90° CW</option>
          <option value="180">180°</option>
          <option value="270">270° CW</option>
        </select>

        <button
          type="submit"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-amber-600 transition"
        >
          <RotateCw className="h-3.5 w-3.5" /> Rotate
        </button>
      </form>
    </div>
  );
}
