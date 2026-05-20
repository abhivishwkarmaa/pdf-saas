"use client";

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
      {fields.map((field) => (
        <OptionField
          key={field.key}
          field={field}
          value={options[field.key] ?? ""}
          onChange={(value) => onChange({ ...options, [field.key]: value })}
        />
      ))}
    </div>
  );
}

function OptionField({
  field,
  value,
  onChange,
}: {
  field: ToolOptionField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
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
          className="input mt-1.5"
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
