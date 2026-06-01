"use client";

import React, { useState, useMemo } from "react";
import { Hash } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextInput } from "@/components/text-tools/TextInput";
import { StatsCard } from "@/components/text-tools/StatsCard";

export default function WordCounterPage() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const rawWords = text.trim().split(/\s+/).filter(Boolean);
    const words = rawWords.length;
    const charsWithSpaces = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;
    
    // Split by sentence terminators
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;
      
    // Split by newlines
    const paragraphs = text
      .split(/\n+/)
      .filter((p) => p.trim().length > 0).length;

    // Reading time (200 words per minute)
    const readTimeSec = Math.round((words / 200) * 60);
    const readTimeStr =
      readTimeSec === 0
        ? "0s"
        : readTimeSec < 60
        ? `${readTimeSec}s`
        : `${Math.floor(readTimeSec / 60)}m ${readTimeSec % 60}s`;

    // Speaking time (130 words per minute)
    const speakTimeSec = Math.round((words / 130) * 60);
    const speakTimeStr =
      speakTimeSec === 0
        ? "0s"
        : speakTimeSec < 60
        ? `${speakTimeSec}s`
        : `${Math.floor(speakTimeSec / 60)}m ${speakTimeSec % 60}s`;

    // Density: Top 5 words (exclude punctuation, lowercase, length > 1)
    const wordCounts: Record<string, number> = {};
    rawWords.forEach((w) => {
      const clean = w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
      if (clean.length > 1) {
        wordCounts[clean] = (wordCounts[clean] || 0) + 1;
      }
    });

    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({
        word,
        count,
        percentage: words > 0 ? Math.round((count / words) * 100) : 0,
      }));

    return {
      words,
      charsWithSpaces,
      charsNoSpaces,
      sentences,
      paragraphs,
      readTimeStr,
      speakTimeStr,
      topWords,
    };
  }, [text]);

  return (
    <TextToolLayout
      title="Word Counter"
      description="Analyze your text instantly: count words, characters, sentences, paragraphs, reading time, and word density."
      icon={Hash}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Text Input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
            <TextInput
              value={text}
              onChange={setText}
              label="Text to Analyze"
              placeholder="Start typing or paste your document content here to see real-time analysis..."
              rows={14}
            />
          </div>
        </div>

        {/* Right Column: Statistics Grid & Density */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              Text Statistics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatsCard label="Words" value={stats.words} />
              <StatsCard label="Sentences" value={stats.sentences} />
              <StatsCard label="Chars (with spaces)" value={stats.charsWithSpaces} />
              <StatsCard label="Chars (no spaces)" value={stats.charsNoSpaces} />
              <StatsCard label="Paragraphs" value={stats.paragraphs} />
              <StatsCard label="Reading Time" value={stats.readTimeStr} />
              <StatsCard label="Speaking Time" value={stats.speakTimeStr} />
            </div>
          </div>

          {/* Word Density */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              Word Density (Top 5)
            </h2>
            {stats.topWords.length > 0 ? (
              <div className="space-y-3">
                {stats.topWords.map(({ word, count, percentage }) => (
                  <div key={word} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-200">{word}</span>
                      <span className="text-zinc-500">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">
                Type at least one word to see density analysis.
              </p>
            )}
          </div>
        </div>
      </div>
    </TextToolLayout>
  );
}
