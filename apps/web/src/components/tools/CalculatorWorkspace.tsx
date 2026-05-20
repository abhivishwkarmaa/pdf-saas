"use client";

import { useEffect, useMemo, useState } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { ToolWorkspaceLayout } from "./ToolWorkspaceLayout";
import { PrimaryButton } from "./PrimaryButton";
import { SubmissionPreview, type PreviewSummaryItem } from "./SubmissionPreview";
import { CATEGORY_THEME } from "@/lib/category-theme";
import { cn } from "@/lib/utils";

type CalculatorPreviewState = {
  summaryItems: PreviewSummaryItem[];
  resultPreview?: { title: string; value: string; hint?: string };
};

interface CalculatorWorkspaceProps {
  tool: ToolDefinition;
}

type PercentMode = "of" | "is" | "change";

const UNIT_GROUPS = {
  length: {
    label: "Length",
    units: [
      { id: "km", label: "Kilometers" },
      { id: "mi", label: "Miles" },
      { id: "m", label: "Meters" },
      { id: "ft", label: "Feet" },
    ],
    convert: (value: number, from: string, to: string) => {
      const toMeters: Record<string, number> = {
        km: 1000,
        mi: 1609.34,
        m: 1,
        ft: 0.3048,
      };
      const meters = value * (toMeters[from] ?? 1);
      return meters / (toMeters[to] ?? 1);
    },
  },
  temperature: {
    label: "Temperature",
    units: [
      { id: "c", label: "Celsius °C" },
      { id: "f", label: "Fahrenheit °F" },
    ],
    convert: (value: number, from: string, to: string) => {
      if (from === to) return value;
      if (from === "c" && to === "f") return value * (9 / 5) + 32;
      if (from === "f" && to === "c") return (value - 32) * (5 / 9);
      return value;
    },
  },
  weight: {
    label: "Weight",
    units: [
      { id: "kg", label: "Kilograms" },
      { id: "lb", label: "Pounds" },
    ],
    convert: (value: number, from: string, to: string) => {
      const toKg: Record<string, number> = { kg: 1, lb: 0.453592 };
      const kg = value * (toKg[from] ?? 1);
      return kg / (toKg[to] ?? 1);
    },
  },
} as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-900";

function ResultCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-4 dark:border-teal-800 dark:bg-teal-950/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-teal-900 dark:text-teal-100">{value}</p>
      {hint && (
        <p className="mt-1 text-sm text-teal-700/80 dark:text-teal-300/80">{hint}</p>
      )}
    </div>
  );
}

export function CalculatorWorkspace({ tool }: CalculatorWorkspaceProps) {
  const theme = CATEGORY_THEME.calculator;
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CalculatorPreviewState>({
    summaryItems: [],
  });

  return (
    <ToolWorkspaceLayout
      tool={tool}
      preview={
        <SubmissionPreview
          tool={tool}
          summaryItems={preview.summaryItems}
          resultPreview={preview.resultPreview}
        />
      }
    >
      {tool.slug === "percentage-calculator" && (
        <PercentageCalc theme={theme} onError={setError} onPreview={setPreview} />
      )}
      {tool.slug === "age-calculator" && (
        <AgeCalc theme={theme} onError={setError} onPreview={setPreview} />
      )}
      {tool.slug === "bmi-calculator" && (
        <BmiCalc theme={theme} onError={setError} onPreview={setPreview} />
      )}
      {tool.slug === "unit-converter" && (
        <UnitCalc theme={theme} onError={setError} onPreview={setPreview} />
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </ToolWorkspaceLayout>
  );
}

function PercentageCalc({
  theme,
  onError,
  onPreview,
}: {
  theme: (typeof CATEGORY_THEME)["calculator"];
  onError: (msg: string | null) => void;
  onPreview: (state: CalculatorPreviewState) => void;
}) {
  const [mode, setMode] = useState<PercentMode>("of");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const modes: { id: PercentMode; label: string }[] = [
    { id: "of", label: "X% of Y" },
    { id: "is", label: "X is % of Y" },
    { id: "change", label: "% change" },
  ];

  useEffect(() => {
    onPreview({
      summaryItems: [
        { label: "Mode", value: modes.find((m) => m.id === mode)?.label ?? mode },
        { label: mode === "change" ? "From" : "Value / %", value: a || "—" },
        {
          label: mode === "change" ? "To" : mode === "of" ? "Of (total)" : "Out of (total)",
          value: b || "—",
        },
      ],
      resultPreview: result
        ? { title: "Result", value: result }
        : undefined,
    });
  }, [a, b, mode, result, onPreview]);

  const calculate = () => {
    onError(null);
    const x = parseFloat(a);
    const y = parseFloat(b);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      onError("Enter valid numbers in both fields.");
      setResult(null);
      return;
    }
    if (mode === "of") setResult(`${((x / 100) * y).toLocaleString()} (${x}% of ${y})`);
    else if (mode === "is") {
      if (y === 0) {
        onError("Second value cannot be zero.");
        return;
      }
      setResult(`${((x / y) * 100).toFixed(2)}%`);
    } else {
      if (x === 0) {
        onError("Starting value cannot be zero.");
        return;
      }
      const change = ((y - x) / x) * 100;
      setResult(`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              mode === m.id
                ? "bg-teal-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={mode === "change" ? "From" : "Value / %"}>
          <input className={inputClass} type="number" value={a} onChange={(e) => setA(e.target.value)} />
        </Field>
        <Field label={mode === "change" ? "To" : mode === "of" ? "Of (total)" : "Out of (total)"}>
          <input className={inputClass} type="number" value={b} onChange={(e) => setB(e.target.value)} />
        </Field>
      </div>
      <PrimaryButton
        className={theme.button}
        label="Calculate"
        onClick={calculate}
      />
      {result && <ResultCard title="Result" value={result} />}
    </div>
  );
}

function AgeCalc({
  theme,
  onError,
  onPreview,
}: {
  theme: (typeof CATEGORY_THEME)["calculator"];
  onError: (msg: string | null) => void;
  onPreview: (state: CalculatorPreviewState) => void;
}) {
  const [birth, setBirth] = useState("");
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<{ years: number; months: number; days: number } | null>(null);

  useEffect(() => {
    onPreview({
      summaryItems: [
        { label: "Date of birth", value: birth || "—" },
        { label: "As of", value: asOf || "—" },
      ],
      resultPreview: result
        ? {
            title: "Your age",
            value: `${result.years} years`,
            hint: `${result.months} months · ${result.days} days`,
          }
        : undefined,
    });
  }, [birth, asOf, result, onPreview]);

  const calculate = () => {
    onError(null);
    const birthDate = new Date(birth);
    const refDate = new Date(asOf);
    if (Number.isNaN(birthDate.getTime())) {
      onError("Enter a valid birth date.");
      setResult(null);
      return;
    }
    if (birthDate > refDate) {
      onError("Birth date cannot be after the reference date.");
      setResult(null);
      return;
    }
    let years = refDate.getFullYear() - birthDate.getFullYear();
    let months = refDate.getMonth() - birthDate.getMonth();
    let days = refDate.getDate() - birthDate.getDate();
    if (days < 0) {
      months--;
      const prev = new Date(refDate.getFullYear(), refDate.getMonth(), 0);
      days += prev.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    setResult({ years, months, days });
  };

  return (
    <div className="space-y-4">
      <Field label="Date of birth">
        <input className={inputClass} type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
      </Field>
      <Field label="Calculate age as of">
        <input className={inputClass} type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </Field>
      <PrimaryButton className={theme.button} label="Calculate age" onClick={calculate} />
      {result && (
        <ResultCard
          title="Your age"
          value={`${result.years} years`}
          hint={`${result.months} months · ${result.days} days`}
        />
      )}
    </div>
  );
}

function BmiCalc({
  theme,
  onError,
  onPreview,
}: {
  theme: (typeof CATEGORY_THEME)["calculator"];
  onError: (msg: string | null) => void;
  onPreview: (state: CalculatorPreviewState) => void;
}) {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);

  const category = useMemo(() => {
    if (bmi == null) return null;
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal weight";
    if (bmi < 30) return "Overweight";
    return "Obese";
  }, [bmi]);

  useEffect(() => {
    onPreview({
      summaryItems: [
        { label: "Units", value: unit === "metric" ? "Metric (kg, cm)" : "Imperial (lb, in)" },
        {
          label: unit === "metric" ? "Weight (kg)" : "Weight (lb)",
          value: weight || "—",
        },
        {
          label: unit === "metric" ? "Height (cm)" : "Height (in)",
          value: height || "—",
        },
      ],
      resultPreview:
        bmi != null && category
          ? { title: "Body Mass Index", value: bmi.toFixed(1), hint: category }
          : undefined,
    });
  }, [unit, weight, height, bmi, category, onPreview]);

  const calculate = () => {
    onError(null);
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (Number.isNaN(w) || Number.isNaN(h) || w <= 0 || h <= 0) {
      onError("Enter valid weight and height.");
      setBmi(null);
      return;
    }
    const meters = unit === "metric" ? h / 100 : h * 0.0254;
    const kg = unit === "metric" ? w : w * 0.453592;
    setBmi(kg / (meters * meters));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["metric", "imperial"] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setUnit(u)}
            className={cn(
              "flex-1 rounded-lg border py-2 text-sm font-medium transition",
              unit === u
                ? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
                : "border-zinc-200 text-zinc-600 dark:border-zinc-700"
            )}
          >
            {u === "metric" ? "Metric (kg, cm)" : "Imperial (lb, in)"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={unit === "metric" ? "Weight (kg)" : "Weight (lb)"}>
          <input className={inputClass} type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
        <Field label={unit === "metric" ? "Height (cm)" : "Height (in)"}>
          <input className={inputClass} type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
        </Field>
      </div>
      <PrimaryButton className={theme.button} label="Calculate BMI" onClick={calculate} />
      {bmi != null && category && (
        <ResultCard title="Body Mass Index" value={bmi.toFixed(1)} hint={category} />
      )}
    </div>
  );
}

function UnitCalc({
  theme,
  onError,
  onPreview,
}: {
  theme: (typeof CATEGORY_THEME)["calculator"];
  onError: (msg: string | null) => void;
  onPreview: (state: CalculatorPreviewState) => void;
}) {
  const [groupKey, setGroupKey] = useState<keyof typeof UNIT_GROUPS>("length");
  const group = UNIT_GROUPS[groupKey];
  const [from, setFrom] = useState<string>(group.units[0].id);
  const [to, setTo] = useState<string>(group.units[1]?.id ?? group.units[0].id);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const fromLabel = group.units.find((u) => u.id === from)?.label ?? from;
    const toLabel = group.units.find((u) => u.id === to)?.label ?? to;
    onPreview({
      summaryItems: [
        { label: "Category", value: group.label },
        { label: "Amount", value: value || "—" },
        { label: "From", value: fromLabel },
        { label: "To", value: toLabel },
      ],
      resultPreview: result ? { title: "Converted", value: result } : undefined,
    });
  }, [groupKey, group, from, to, value, result, onPreview]);

  const onGroupChange = (key: keyof typeof UNIT_GROUPS) => {
    setGroupKey(key);
    const g = UNIT_GROUPS[key];
    setFrom(g.units[0].id);
    setTo(g.units[1]?.id ?? g.units[0].id);
    setResult(null);
    onError(null);
  };

  const calculate = () => {
    onError(null);
    const n = parseFloat(value);
    if (Number.isNaN(n)) {
      onError("Enter a valid number.");
      setResult(null);
      return;
    }
    const out = group.convert(n, from, to);
    const toLabel = group.units.find((u) => u.id === to)?.label ?? to;
    setResult(`${out.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toLabel}`);
  };

  return (
    <div className="space-y-4">
      <Field label="Category">
        <select
          className={inputClass}
          value={groupKey}
          onChange={(e) => onGroupChange(e.target.value as keyof typeof UNIT_GROUPS)}
        >
          {Object.entries(UNIT_GROUPS).map(([key, g]) => (
            <option key={key} value={key}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount">
        <input className={inputClass} type="number" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From">
          <select className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)}>
            {group.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="To">
          <select className={inputClass} value={to} onChange={(e) => setTo(e.target.value)}>
            {group.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <PrimaryButton className={theme.button} label="Convert" onClick={calculate} />
      {result && <ResultCard title="Converted" value={result} />}
    </div>
  );
}
