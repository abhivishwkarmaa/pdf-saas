"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { TextToolLayout } from "@/components/text-tools/TextToolLayout";
import { TextOutput } from "@/components/text-tools/TextOutput";
import { OptionToggle } from "@/components/text-tools/OptionToggle";

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea",
  "commodo", "consequat", "duis", "aute", "irure", "dolor", "in", "reprehenderit",
  "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla",
  "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non", "proident",
  "sunt", "in", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id",
  "est", "laborum", "sed", "ut", "perspiciatis", "unde", "omnis", "iste", "natus",
  "error", "sit", "voluptatem", "accusantium", "doloremque", "laudantium", "totam",
  "rem", "aperiam", "eaque", "ipsa", "quae", "ab", "illo", "inventore", "veritatis",
  "et", "quasi", "architecto", "beatae", "vitae", "dicta", "sunt", "explicabo"
];

export default function LoremIpsumPage() {
  const [type, setType] = useState<"words" | "sentences" | "paragraphs">("paragraphs");
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [output, setOutput] = useState("");

  const getRandomWord = () => {
    const idx = Math.floor(Math.random() * LOREM_WORDS.length);
    return LOREM_WORDS[idx];
  };

  const generateSentence = (startWithPrefix = false) => {
    const wordCount = Math.floor(Math.random() * 8) + 6; // 6 to 13 words
    const sentenceWords: string[] = [];

    if (startWithPrefix) {
      sentenceWords.push("lorem", "ipsum", "dolor", "sit", "amet");
    }

    while (sentenceWords.length < wordCount) {
      sentenceWords.push(getRandomWord());
    }

    // Capitalize first word and join
    const sentence = sentenceWords.join(" ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
  };

  const generateParagraph = (startWithPrefix = false) => {
    const sentenceCount = Math.floor(Math.random() * 4) + 4; // 4 to 7 sentences
    const sentences: string[] = [];

    for (let i = 0; i < sentenceCount; i++) {
      sentences.push(generateSentence(i === 0 && startWithPrefix));
    }

    return sentences.join(" ");
  };

  const handleGenerate = () => {
    let result = "";
    const cleanCount = Math.max(1, Math.min(1000, count));

    if (type === "words") {
      const words: string[] = [];
      if (startWithLorem) {
        words.push("lorem", "ipsum", "dolor", "sit", "amet");
      }
      while (words.length < cleanCount) {
        words.push(getRandomWord());
      }
      result = words.join(" ");
      // capitalize first letter
      result = result.charAt(0).toUpperCase() + result.slice(1);
    } else if (type === "sentences") {
      const sentences: string[] = [];
      for (let i = 0; i < cleanCount; i++) {
        sentences.push(generateSentence(i === 0 && startWithLorem));
      }
      result = sentences.join(" ");
    } else if (type === "paragraphs") {
      const paragraphs: string[] = [];
      for (let i = 0; i < cleanCount; i++) {
        paragraphs.push(generateParagraph(i === 0 && startWithLorem));
      }
      result = paragraphs.join("\n\n");
    }

    setOutput(result);
  };

  return (
    <TextToolLayout
      title="Lorem Ipsum Generator"
      description="Create customizable placeholder text for layouts, print, or web design designs."
      icon={Sparkles}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: options */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-5">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Generator Settings
          </h3>

          {/* Type Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase">
              Generation Unit
            </label>
            <div className="flex gap-2">
              {(["words", "sentences", "paragraphs"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => {
                    setType(unit);
                    // adjust count defaults based on type selection
                    if (unit === "words") setCount(150);
                    else if (unit === "sentences") setCount(5);
                    else setCount(3);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border capitalize transition ${
                    type === unit
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Count Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase">
              Quantity to Generate
            </label>
            <input
              type="number"
              min={1}
              max={type === "words" ? 5000 : type === "sentences" ? 500 : 100}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white focus:border-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition"
            />
          </div>

          {/* Start with Lorem Toggle */}
          <OptionToggle
            label="Start with 'Lorem ipsum...'"
            checked={startWithLorem}
            onChange={setStartWithLorem}
            description="Prefixes your output with standard placeholder wording"
          />

          <button
            onClick={handleGenerate}
            className="w-full py-3 px-4 font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:-translate-y-0.5 transition duration-200"
          >
            Generate Copy
          </button>
        </div>

        {/* Right column: output */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5">
          <TextOutput
            value={output}
            label="Generated Lorem Ipsum"
            placeholder="Click 'Generate Copy' to populate placeholder text..."
            rows={14}
            downloadFileName="lorem-ipsum.txt"
          />
        </div>
      </div>
    </TextToolLayout>
  );
}
