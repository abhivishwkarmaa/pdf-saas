"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrimaryButtonProps {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}

export function PrimaryButton({
  label,
  loading,
  loadingLabel = "Processing...",
  disabled,
  className,
  onClick,
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
