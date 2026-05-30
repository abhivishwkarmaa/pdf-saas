"use client";

import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";

interface AICommandInputProps {
  value: string;
  onChange: (val: string) => void;
  onPreview: () => void;
  isLoading: boolean;
  suggestions: string[];
  disabled?: boolean;
}

export function AICommandInput({
  value,
  onChange,
  onPreview,
  isLoading,
  suggestions,
  disabled = false,
}: AICommandInputProps) {
  const maxLength = 250;

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          disabled={disabled || isLoading}
          placeholder="Type your command in plain English... (e.g. Remove page 3 and 5)"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white placeholder:text-zinc-505 focus:border-purple-500 focus:outline-none resize-none text-sm min-h-[100px] pr-12"
        />
        <div className="absolute bottom-3 right-3 text-zinc-500 text-xs font-mono">
          {value.length}/{maxLength}
        </div>
      </div>

      {/* Suggestion Chips */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">
            Suggested Commands
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onChange(suggestion)}
                disabled={disabled || isLoading}
                className="border border-zinc-600 rounded-full px-3 py-1.5 text-xs text-zinc-200 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer text-left"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview Button */}
      <button
        type="button"
        onClick={onPreview}
        disabled={disabled || isLoading || !value.trim()}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl
          bg-gradient-to-r from-purple-600 to-fuchsia-600
          hover:from-purple-500 hover:to-fuchsia-500
          text-white font-bold text-sm shadow-lg shadow-purple-700/30
          hover:shadow-purple-500/40 hover:scale-[1.01]
          disabled:opacity-30 disabled:pointer-events-none disabled:shadow-none
          transition-all duration-200"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]"></span>
            <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.15s]"></span>
            <span className="h-2 w-2 rounded-full bg-white animate-bounce"></span>
            <span className="ml-1 text-xs">AI is understanding...</span>
          </div>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Preview Action
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
