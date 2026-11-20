"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
}

const STORAGE_KEY = "converthub-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use safe SSR defaults so server and client render identical HTML on first pass.
  // The real localStorage value is applied after mount via useEffect below.
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Hydrate from localStorage after mount to avoid SSR/client mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      const mode: ThemeMode =
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "system";
      const resolved = mode === "system" ? getSystemTheme() : mode;
      setThemeState(mode);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    } catch {
      // localStorage unavailable – keep defaults.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolve = useCallback((mode: ThemeMode) => {
    return mode === "system" ? getSystemTheme() : mode;
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      localStorage.setItem(STORAGE_KEY, mode);
      setThemeState(mode);
      const resolved = resolve(mode);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    },
    [resolve]
  );

  useLayoutEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const mode = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (mode === "system" || !mode) {
        const next = getSystemTheme();
        setResolvedTheme(next);
        applyTheme(next);
      }
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
