"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Calculator,
  Percent,
  Calendar,
  HeartPulse,
  Scale,
  ArrowRightLeft,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Clock,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  Ruler,
  Weight,
  Thermometer,
  HardDrive,
  Gauge,
  HelpCircle,
  Share2,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CATEGORY_THEME } from "@/lib/category-theme";

interface CalculatorWorkspaceProps {
  tool: ToolDefinition;
}

const CALCULATOR_TOOLS = [
  { slug: "percentage-calculator", name: "Percentage Calculator", icon: Percent, desc: "Calculate discounts, percentage of values, and percentage increase/decrease." },
  { slug: "age-calculator", name: "Age Calculator", icon: Calendar, desc: "Accurate age in years, months, days, total weeks, and birthday countdown." },
  { slug: "bmi-calculator", name: "BMI Calculator", icon: HeartPulse, desc: "Body Mass Index gauge, health category, and ideal weight recommendations." },
  { slug: "unit-converter", name: "Unit Converter", icon: Scale, desc: "Instant conversion between Length, Weight, Temperature, Storage, and Speed." },
];

export function CalculatorWorkspace({ tool }: CalculatorWorkspaceProps) {
  const theme = CATEGORY_THEME.calculator || {
    button: "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20",
    accent: "text-orange-600 dark:text-orange-400",
    accentBg: "bg-orange-500/10",
    accentBorder: "border-orange-500/20",
    icon: Calculator,
  };

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8 space-y-6">
      <Toaster position="top-center" richColors />

      {/* TOP NAVIGATION & HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/#calculator"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
                {tool.name}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                {tool.description}
              </p>
            </div>
          </div>
        </div>

        {/* Realtime Client Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <Zap className="h-3.5 w-3.5" />
          <span>Instant Real-Time Result</span>
        </div>
      </div>

      {/* QUICK CALCULATORS SWITCHER BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200 dark:border-zinc-800">
        {CALCULATOR_TOOLS.map((t) => {
          const Icon = t.icon;
          const isActive = tool.slug === t.slug;
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-xs",
                isActive
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.name}</span>
            </Link>
          );
        })}
      </div>

      {/* RENDER SPECIFIC CALCULATOR STUDIO */}
      {tool.slug === "percentage-calculator" && <PercentageCalculatorStudio />}
      {tool.slug === "age-calculator" && <AgeCalculatorStudio />}
      {tool.slug === "bmi-calculator" && <BmiCalculatorStudio />}
      {tool.slug === "unit-converter" && <UnitConverterStudio />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. PERCENTAGE CALCULATOR STUDIO
// ─────────────────────────────────────────────────────────────
function PercentageCalculatorStudio() {
  const [tab, setTab] = useState<"of" | "is" | "change" | "discount">("of");

  // State
  const [valOfA, setValOfA] = useState<string>("15");
  const [valOfB, setValOfB] = useState<string>("200");

  const [valIsA, setValIsA] = useState<string>("45");
  const [valIsB, setValIsB] = useState<string>("180");

  const [valChangeA, setValChangeA] = useState<string>("100");
  const [valChangeB, setValChangeB] = useState<string>("125");

  const [valDiscPrice, setValDiscPrice] = useState<string>("80");
  const [valDiscPercent, setValDiscPercent] = useState<string>("20");

  const [copied, setCopied] = useState(false);

  // Computed results
  const resultOf = useMemo(() => {
    const a = parseFloat(valOfA);
    const b = parseFloat(valOfB);
    if (isNaN(a) || isNaN(b)) return null;
    return ((a / 100) * b).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, [valOfA, valOfB]);

  const resultIs = useMemo(() => {
    const a = parseFloat(valIsA);
    const b = parseFloat(valIsB);
    if (isNaN(a) || isNaN(b) || b === 0) return null;
    return ((a / b) * 100).toFixed(2);
  }, [valIsA, valIsB]);

  const resultChange = useMemo(() => {
    const a = parseFloat(valChangeA);
    const b = parseFloat(valChangeB);
    if (isNaN(a) || isNaN(b) || a === 0) return null;
    const diff = b - a;
    const pct = (diff / Math.abs(a)) * 100;
    return {
      percent: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
      diff: diff.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      isIncrease: pct >= 0,
    };
  }, [valChangeA, valChangeB]);

  const resultDiscount = useMemo(() => {
    const price = parseFloat(valDiscPrice);
    const disc = parseFloat(valDiscPercent);
    if (isNaN(price) || isNaN(disc)) return null;
    const savings = (price * disc) / 100;
    const finalPrice = Math.max(0, price - savings);
    return {
      finalPrice: finalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      savings: savings.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    };
  }, [valDiscPrice, valDiscPercent]);

  const currentResultText = useMemo(() => {
    if (tab === "of") return resultOf ? `${resultOf}` : "";
    if (tab === "is") return resultIs ? `${resultIs}%` : "";
    if (tab === "change") return resultChange ? `${resultChange.percent}` : "";
    if (tab === "discount") return resultDiscount ? `$${resultDiscount.finalPrice}` : "";
    return "";
  }, [tab, resultOf, resultIs, resultChange, resultDiscount]);

  const handleCopy = () => {
    if (!currentResultText) return;
    navigator.clipboard.writeText(currentResultText);
    setCopied(true);
    toast.success("Result copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Interactive Mode & Inputs */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { id: "of", label: "X% of Y", desc: "Percentage of Value" },
            { id: "is", label: "X is % of Y", desc: "Calculate Percentage" },
            { id: "change", label: "% Change", desc: "Increase / Decrease" },
            { id: "discount", label: "Discount", desc: "Sale & Savings" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setTab(m.id as any)}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-xl font-bold transition text-center",
                tab === m.id
                  ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <span>{m.label}</span>
              <span className="text-[10px] opacity-70 font-normal mt-0.5">{m.desc}</span>
            </button>
          ))}
        </div>

        {/* Inputs Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm space-y-5">
          {tab === "of" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <Percent className="h-4 w-4 text-orange-500" />
                <span>What is X% of Y?</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Percentage (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={valOfA}
                      onChange={(e) => setValOfA(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-sm font-bold text-zinc-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Total Value (Y)
                  </label>
                  <input
                    type="number"
                    value={valOfB}
                    onChange={(e) => setValOfB(e.target.value)}
                    placeholder="e.g. 200"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "is" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <Percent className="h-4 w-4 text-orange-500" />
                <span>X is what percent of Y?</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Portion Value (X)
                  </label>
                  <input
                    type="number"
                    value={valIsA}
                    onChange={(e) => setValIsA(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Total Out of (Y)
                  </label>
                  <input
                    type="number"
                    value={valIsB}
                    onChange={(e) => setValIsB(e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "change" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span>Percentage Increase / Decrease</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Original / Initial Value
                  </label>
                  <input
                    type="number"
                    value={valChangeA}
                    onChange={(e) => setValChangeA(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    New / Final Value
                  </label>
                  <input
                    type="number"
                    value={valChangeB}
                    onChange={(e) => setValChangeB(e.target.value)}
                    placeholder="e.g. 125"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "discount" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <Percent className="h-4 w-4 text-orange-500" />
                <span>Discount & Final Sale Price</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Original Price ($)
                  </label>
                  <input
                    type="number"
                    value={valDiscPrice}
                    onChange={(e) => setValDiscPrice(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Discount Off (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={valDiscPercent}
                      onChange={(e) => setValDiscPercent(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-sm font-bold text-zinc-400">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Live Result Card */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/30 p-6 shadow-sm space-y-5 flex flex-col justify-between h-full min-h-[300px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                Calculation Result
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!currentResultText}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold hover:bg-orange-100 transition shadow-xs disabled:opacity-40"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* Display Big Output */}
            <div className="mt-6 text-center space-y-1">
              <p className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
                {currentResultText || "—"}
              </p>
              {tab === "of" && resultOf && (
                <p className="text-xs font-medium text-orange-700/80 dark:text-orange-300/80">
                  {valOfA}% of {valOfB} is equal to {resultOf}
                </p>
              )}
              {tab === "is" && resultIs && (
                <p className="text-xs font-medium text-orange-700/80 dark:text-orange-300/80">
                  {valIsA} is {resultIs}% of {valIsB}
                </p>
              )}
              {tab === "change" && resultChange && (
                <p className="text-xs font-medium text-orange-700/80 dark:text-orange-300/80">
                  {resultChange.isIncrease ? "Increased by" : "Decreased by"} {resultChange.diff} ({resultChange.percent})
                </p>
              )}
              {tab === "discount" && resultDiscount && (
                <p className="text-xs font-medium text-orange-700/80 dark:text-orange-300/80">
                  You save: <b className="text-emerald-600 dark:text-emerald-400 font-bold">${resultDiscount.savings}</b>
                </p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-orange-200/60 dark:border-orange-800/40 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
            <span className="font-bold text-zinc-800 dark:text-zinc-200">Mathematical Formula:</span>
            <p className="font-mono text-[10px]">
              {tab === "of" && `Result = (${valOfA} ÷ 100) × ${valOfB}`}
              {tab === "is" && `Percentage = (${valIsA} ÷ ${valIsB}) × 100`}
              {tab === "change" && `Change = ((${valChangeB} − ${valChangeA}) ÷ |${valChangeA}|) × 100`}
              {tab === "discount" && `Final = ${valDiscPrice} − (${valDiscPrice} × ${valDiscPercent} ÷ 100)`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. AGE CALCULATOR STUDIO
// ─────────────────────────────────────────────────────────────
function AgeCalculatorStudio() {
  const [birthDate, setBirthDate] = useState<string>("1998-05-15");
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const stats = useMemo(() => {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    const ref = new Date(asOfDate || new Date().toISOString().slice(0, 10));

    if (isNaN(b.getTime()) || isNaN(ref.getTime()) || b > ref) return null;

    let years = ref.getFullYear() - b.getFullYear();
    let months = ref.getMonth() - b.getMonth();
    let days = ref.getDate() - b.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const diffMs = ref.getTime() - b.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;
    const totalHours = totalDays * 24;

    // Next birthday countdown
    let nextBday = new Date(ref.getFullYear(), b.getMonth(), b.getDate());
    if (nextBday < ref) {
      nextBday = new Date(ref.getFullYear() + 1, b.getMonth(), b.getDate());
    }
    const daysToBday = Math.ceil((nextBday.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));

    return {
      years,
      months,
      days,
      totalMonths,
      totalWeeks,
      totalDays,
      totalHours,
      daysToBday,
    };
  }, [birthDate, asOfDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Inputs */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <Calendar className="h-4 w-4 text-orange-500" />
            <span>Select Birth Date</span>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
              Date of Birth:
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
              Calculate Age as of:
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between text-xs font-semibold text-zinc-500">
            <button
              type="button"
              onClick={() => {
                setBirthDate("2000-01-01");
                toast.success("Loaded Year 2000 preset");
              }}
              className="hover:text-orange-500 underline"
            >
              Preset: Born 2000
            </button>
            <button
              type="button"
              onClick={() => {
                setBirthDate("1995-10-24");
                toast.success("Loaded 1995 preset");
              }}
              className="hover:text-orange-500 underline"
            >
              Preset: Born 1995
            </button>
          </div>
        </div>
      </div>

      {/* Results Dashboard */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {stats ? (
          <div className="space-y-4">
            {/* Main Highlight Card */}
            <div className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/30 p-6 shadow-sm text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                Exact Age
              </span>
              <p className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono mt-2">
                {stats.years} <span className="text-2xl font-normal text-zinc-500">Years</span>
              </p>
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mt-1">
                {stats.months} months and {stats.days} days
              </p>
            </div>

            {/* Total Units Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
                <p className="text-[10px] text-zinc-400 font-bold uppercase">Total Months</p>
                <p className="text-lg font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                  {stats.totalMonths.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
                <p className="text-[10px] text-zinc-400 font-bold uppercase">Total Weeks</p>
                <p className="text-lg font-mono font-extrabold text-violet-600 dark:text-violet-400 mt-0.5">
                  {stats.totalWeeks.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
                <p className="text-[10px] text-zinc-400 font-bold uppercase">Total Days</p>
                <p className="text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {stats.totalDays.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
                <p className="text-[10px] text-zinc-400 font-bold uppercase">Next Birthday</p>
                <p className="text-lg font-mono font-extrabold text-orange-600 dark:text-orange-400 mt-0.5">
                  {stats.daysToBday} days
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm text-center text-zinc-400 space-y-2 flex flex-col items-center justify-center min-h-[250px]">
            <Calendar className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
              Select a valid date of birth on the left to calculate age
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. BMI CALCULATOR STUDIO
// ─────────────────────────────────────────────────────────────
function BmiCalculatorStudio() {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");

  // Metric
  const [weightKg, setWeightKg] = useState<string>("70");
  const [heightCm, setHeightCm] = useState<string>("175");

  // Imperial
  const [weightLbs, setWeightLbs] = useState<string>("154");
  const [heightFt, setHeightFt] = useState<string>("5");
  const [heightIn, setHeightIn] = useState<string>("9");

  const bmiData = useMemo(() => {
    let w = 0;
    let hInMeters = 0;

    if (unit === "metric") {
      w = parseFloat(weightKg);
      const cm = parseFloat(heightCm);
      if (isNaN(w) || isNaN(cm) || w <= 0 || cm <= 0) return null;
      hInMeters = cm / 100;
    } else {
      w = parseFloat(weightLbs) * 0.453592;
      const ft = parseFloat(heightFt) || 0;
      const inches = parseFloat(heightIn) || 0;
      const totalInches = ft * 12 + inches;
      if (isNaN(w) || w <= 0 || totalInches <= 0) return null;
      hInMeters = totalInches * 0.0254;
    }

    const bmi = w / (hInMeters * hInMeters);

    let category = "Normal weight";
    let colorClass = "text-emerald-600 dark:text-emerald-400";
    let bgClass = "bg-emerald-500/10 border-emerald-500/30";
    let barPct = 0;

    if (bmi < 18.5) {
      category = "Underweight";
      colorClass = "text-blue-600 dark:text-blue-400";
      bgClass = "bg-blue-500/10 border-blue-500/30";
      barPct = Math.min(25, (bmi / 18.5) * 25);
    } else if (bmi < 25) {
      category = "Normal weight";
      colorClass = "text-emerald-600 dark:text-emerald-400";
      bgClass = "bg-emerald-500/10 border-emerald-500/30";
      barPct = 25 + ((bmi - 18.5) / 6.5) * 25;
    } else if (bmi < 30) {
      category = "Overweight";
      colorClass = "text-amber-600 dark:text-amber-400";
      bgClass = "bg-amber-500/10 border-amber-500/30";
      barPct = 50 + ((bmi - 25) / 5) * 25;
    } else {
      category = "Obese";
      colorClass = "text-red-600 dark:text-red-400";
      bgClass = "bg-red-500/10 border-red-500/30";
      barPct = Math.min(100, 75 + ((bmi - 30) / 10) * 25);
    }

    // Ideal weight calculation (BMI 18.5 to 24.9)
    const minIdealKg = 18.5 * (hInMeters * hInMeters);
    const maxIdealKg = 24.9 * (hInMeters * hInMeters);

    const minIdeal = unit === "metric" ? `${minIdealKg.toFixed(1)} kg` : `${(minIdealKg * 2.20462).toFixed(1)} lbs`;
    const maxIdeal = unit === "metric" ? `${maxIdealKg.toFixed(1)} kg` : `${(maxIdealKg * 2.20462).toFixed(1)} lbs`;

    return {
      bmi: bmi.toFixed(1),
      category,
      colorClass,
      bgClass,
      barPct,
      idealRange: `${minIdeal} – ${maxIdeal}`,
    };
  }, [unit, weightKg, heightCm, weightLbs, heightFt, heightIn]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Unit Toggle & Inputs */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Unit Selector */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setUnit("metric")}
            className={cn(
              "py-2 rounded-xl font-bold transition text-center",
              unit === "metric"
                ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs border border-zinc-200 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400"
            )}
          >
            Metric (kg, cm)
          </button>
          <button
            type="button"
            onClick={() => setUnit("imperial")}
            className={cn(
              "py-2 rounded-xl font-bold transition text-center",
              unit === "imperial"
                ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs border border-zinc-200 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400"
            )}
          >
            Imperial (lbs, ft/in)
          </button>
        </div>

        {/* Inputs Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm space-y-4">
          {unit === "metric" ? (
            <>
              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Weight (Kilograms - kg):
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 70"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Height (Centimeters - cm):
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g. 175"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Weight (Pounds - lbs):
                </label>
                <input
                  type="number"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  placeholder="e.g. 154"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Height (Feet - ft):
                  </label>
                  <input
                    type="number"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Inches (in):
                  </label>
                  <input
                    type="number"
                    value={heightIn}
                    onChange={(e) => setHeightIn(e.target.value)}
                    placeholder="e.g. 9"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Column: Visual BMI Gauge & Health Insights */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {bmiData ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm space-y-6">
            {/* Header & Big BMI Display */}
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Body Mass Index Score
              </span>
              <p className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
                {bmiData.bmi}
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold">
                <span className={bmiData.colorClass}>{bmiData.category}</span>
              </div>
            </div>

            {/* Visual BMI Gauge Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                <div className="h-full w-1/4 bg-blue-500" title="Underweight (<18.5)" />
                <div className="h-full w-1/4 bg-emerald-500" title="Normal (18.5 - 24.9)" />
                <div className="h-full w-1/4 bg-amber-500" title="Overweight (25 - 29.9)" />
                <div className="h-full w-1/4 bg-red-500" title="Obese (30+)" />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono font-bold">
                <span>&lt;18.5 (Under)</span>
                <span>18.5–24.9 (Normal)</span>
                <span>25–29.9 (Over)</span>
                <span>30+ (Obese)</span>
              </div>
            </div>

            {/* Ideal Weight Recommendation Card */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-orange-500" />
                Ideal Weight Range for Your Height:
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {bmiData.idealRange}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm text-center text-zinc-400 space-y-2 flex flex-col items-center justify-center min-h-[250px]">
            <HeartPulse className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
              Enter valid weight and height to compute your BMI
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. UNIT CONVERTER STUDIO
// ─────────────────────────────────────────────────────────────
const UNIT_DEFINITIONS = {
  length: {
    label: "Length & Distance",
    icon: Ruler,
    units: [
      { id: "km", label: "Kilometers (km)", toBase: 1000 },
      { id: "m", label: "Meters (m)", toBase: 1 },
      { id: "cm", label: "Centimeters (cm)", toBase: 0.01 },
      { id: "mm", label: "Millimeters (mm)", toBase: 0.001 },
      { id: "mi", label: "Miles (mi)", toBase: 1609.344 },
      { id: "yd", label: "Yards (yd)", toBase: 0.9144 },
      { id: "ft", label: "Feet (ft)", toBase: 0.3048 },
      { id: "in", label: "Inches (in)", toBase: 0.0254 },
    ],
  },
  weight: {
    label: "Weight & Mass",
    icon: Weight,
    units: [
      { id: "kg", label: "Kilograms (kg)", toBase: 1 },
      { id: "g", label: "Grams (g)", toBase: 0.001 },
      { id: "mg", label: "Milligrams (mg)", toBase: 0.000001 },
      { id: "lb", label: "Pounds (lb)", toBase: 0.45359237 },
      { id: "oz", label: "Ounces (oz)", toBase: 0.0283495231 },
      { id: "t", label: "Metric Tonnes (t)", toBase: 1000 },
    ],
  },
  temperature: {
    label: "Temperature",
    icon: Thermometer,
    units: [
      { id: "c", label: "Celsius (°C)" },
      { id: "f", label: "Fahrenheit (°F)" },
      { id: "k", label: "Kelvin (K)" },
    ],
  },
  storage: {
    label: "Digital Storage",
    icon: HardDrive,
    units: [
      { id: "b", label: "Bytes (B)", toBase: 1 },
      { id: "kb", label: "Kilobytes (KB)", toBase: 1024 },
      { id: "mb", label: "Megabytes (MB)", toBase: 1024 * 1024 },
      { id: "gb", label: "Gigabytes (GB)", toBase: 1024 * 1024 * 1024 },
      { id: "tb", label: "Terabytes (TB)", toBase: 1024 * 1024 * 1024 * 1024 },
    ],
  },
};

function UnitConverterStudio() {
  const [category, setCategory] = useState<keyof typeof UNIT_DEFINITIONS>("length");
  const currentDef = UNIT_DEFINITIONS[category];

  const [fromUnit, setFromUnit] = useState<string>("km");
  const [toUnit, setToUnit] = useState<string>("mi");
  const [amount, setAmount] = useState<string>("10");

  const [copied, setCopied] = useState(false);

  // Update units on category change
  const handleCategoryChange = (cat: keyof typeof UNIT_DEFINITIONS) => {
    setCategory(cat);
    const def = UNIT_DEFINITIONS[cat];
    setFromUnit(def.units[0].id);
    setToUnit(def.units[1]?.id ?? def.units[0].id);
  };

  // Convert calculation
  const convertedResult = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val)) return null;

    if (category === "temperature") {
      if (fromUnit === toUnit) return val;
      // Convert from source to Celsius
      let celsius = val;
      if (fromUnit === "f") celsius = (val - 32) * (5 / 9);
      else if (fromUnit === "k") celsius = val - 273.15;

      // Convert from Celsius to target
      if (toUnit === "c") return celsius;
      if (toUnit === "f") return celsius * (9 / 5) + 32;
      if (toUnit === "k") return celsius + 273.15;
      return celsius;
    }

    const fromObj = currentDef.units.find((u) => u.id === fromUnit) as any;
    const toObj = currentDef.units.find((u) => u.id === toUnit) as any;
    if (!fromObj || !toObj) return null;

    const baseVal = val * fromObj.toBase;
    return baseVal / toObj.toBase;
  }, [category, fromUnit, toUnit, amount, currentDef]);

  // Swap From and To
  const handleSwap = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
    toast.success("Swapped conversion units!");
  };

  const handleCopy = () => {
    if (convertedResult === null) return;
    navigator.clipboard.writeText(String(convertedResult));
    setCopied(true);
    toast.success("Converted value copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Category & Converter Controls */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Category Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {Object.entries(UNIT_DEFINITIONS).map(([key, def]) => {
            const Icon = def.icon;
            const isSel = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCategoryChange(key as any)}
                className={cn(
                  "flex items-center justify-center gap-1.5 p-2.5 rounded-xl font-bold transition text-center",
                  isSel
                    ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Icon className="h-3.5 w-3.5 text-orange-500" />
                <span>{def.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Input & Unit Pickers */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
              Value to Convert:
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10"
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
            {/* From Unit */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                From:
              </label>
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              >
                {currentDef.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center sm:pt-5">
              <button
                type="button"
                onClick={handleSwap}
                className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-orange-600 dark:text-orange-400 transition"
                title="Swap units"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>

            {/* To Unit */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                To:
              </label>
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              >
                {currentDef.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Converted Result */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/30 p-6 shadow-sm space-y-5 flex flex-col justify-between h-full min-h-[300px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                Converted Result
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={convertedResult === null}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold hover:bg-orange-100 transition shadow-xs disabled:opacity-40"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            <div className="mt-6 text-center space-y-1">
              <p className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight break-all">
                {convertedResult !== null
                  ? convertedResult.toLocaleString(undefined, { maximumFractionDigits: 6 })
                  : "—"}
              </p>
              <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
                {currentDef.units.find((u) => u.id === toUnit)?.label}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-orange-200/60 dark:border-orange-800/40 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1 font-mono">
            <span>Calculation Summary:</span>
            <p>
              {amount} {currentDef.units.find((u) => u.id === fromUnit)?.label} ={" "}
              {convertedResult !== null ? convertedResult.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}{" "}
              {currentDef.units.find((u) => u.id === toUnit)?.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
