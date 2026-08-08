"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { ToolDefinition } from "@pdf-saas/shared";
import { toast, Toaster } from "sonner";
import {
  Copy,
  Check,
  Download,
  Upload,
  Trash2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  Search,
  AlertTriangle,
  CheckCircle2,
  BarChart2,
  FileCode,
  Code2,
  SortAsc,
  Sparkles,
  ArrowLeft,
  Clipboard,
  UnfoldVertical,
  FoldVertical,
  Layers,
  FileJson,
  GripVertical,
  Wand2,
  Quote,
  HelpCircle,
  X,
  FileText,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Dynamically import Monaco Editor to avoid SSR window issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-xs font-mono text-zinc-400 gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      Loading Monaco Code Editor...
    </div>
  ),
});

interface JsonFormatterWorkspaceProps {
  tool: ToolDefinition;
}

interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

interface JsonStats {
  fileSize: number;
  totalKeys: number;
  objectsCount: number;
  arraysCount: number;
  stringsCount: number;
  numbersCount: number;
  booleansCount: number;
  nullsCount: number;
  maxDepth: number;
}

// Quick presets for effortless user testing
const PRESETS = {
  apiResponse: `{
  "status": 200,
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "itemsCount": 3,
    "items": [
      { "id": "usr_101", "name": "Alice Johnson", "role": "Administrator", "active": true },
      { "id": "usr_102", "name": "Bob Smith", "role": "Developer", "active": true },
      { "id": "usr_103", "name": "Charlie Brown", "role": "Designer", "active": false }
    ],
    "pagination": { "page": 1, "pageSize": 10, "totalPages": 1 }
  },
  "timestamp": "${new Date().toISOString()}"
}`,

  userList: `[
  {
    "id": 1,
    "name": "Leanne Graham",
    "username": "Bret",
    "email": "Sincere@april.biz",
    "address": { "street": "Kulas Light", "city": "Gwenborough", "zipcode": "92998-3874" },
    "phone": "1-770-736-8071",
    "website": "hildegard.org"
  },
  {
    "id": 2,
    "name": "Ervin Howell",
    "username": "Antonette",
    "email": "Shanna@melissa.tv",
    "address": { "street": "Victor Plains", "city": "Wisokyburgh", "zipcode": "90566-7771" },
    "phone": "010-692-6593",
    "website": "anastasia.net"
  }
]`,

  configObj: `{
  "app": {
    "title": "PDF SaaS Workspace",
    "version": "3.1.0",
    "environment": "production",
    "features": {
      "monacoEditor": true,
      "treeViewer": true,
      "jsonPathCopy": true,
      "smartRepair": true
    }
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "sslEnabled": true,
    "timeoutMs": 60000
  },
  "database": null
}`,
};

export function JsonFormatterWorkspace({ tool }: JsonFormatterWorkspaceProps) {
  const [inputJson, setInputJson] = useState<string>(PRESETS.apiResponse);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<JsonError | null>(null);
  const [indentation, setIndentation] = useState<"2" | "4" | "tab">("2");
  
  // Tree view state
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPath, setSelectedPath] = useState<string>("$");
  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showHelpBanner, setShowHelpBanner] = useState<boolean>(true);

  // Layout / Split View state
  const [splitWidth, setSplitWidth] = useState<number>(50); // percentage
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState<boolean>(false);
  
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate and Parse JSON whenever input changes
  useEffect(() => {
    if (!inputJson.trim()) {
      setParsedData(null);
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(inputJson);
      setParsedData(parsed);
      setError(null);

      // Auto expand root and level 1 nodes initially
      const initialExpanded = new Set<string>(["$"]);
      if (typeof parsed === "object" && parsed !== null) {
        Object.keys(parsed).forEach((key) => {
          initialExpanded.add(`$.${key}`);
        });
      }
      setExpandedPaths(initialExpanded);
    } catch (err: any) {
      setParsedData(null);
      
      // Parse Line and Column from SyntaxError message if available
      const errMsg = err.message || "Invalid JSON format";
      let line: number | undefined;
      let column: number | undefined;

      const posMatch = errMsg.match(/at position (\d+)/i);
      const lineColMatch = errMsg.match(/line (\d+) column (\d+)/i);

      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      } else if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const textBeforePos = inputJson.slice(0, pos);
        const lines = textBeforePos.split("\n");
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }

      setError({ message: errMsg, line, column });
    }
  }, [inputJson]);

  // Calculate detailed JSON statistics
  const stats = useMemo<JsonStats | null>(() => {
    if (parsedData === null) return null;

    let totalKeys = 0;
    let objectsCount = 0;
    let arraysCount = 0;
    let stringsCount = 0;
    let numbersCount = 0;
    let booleansCount = 0;
    let nullsCount = 0;
    let maxDepth = 0;

    const traverse = (val: any, depth: number) => {
      if (depth > maxDepth) maxDepth = depth;

      if (val === null) {
        nullsCount++;
      } else if (Array.isArray(val)) {
        arraysCount++;
        val.forEach((item) => traverse(item, depth + 1));
      } else if (typeof val === "object") {
        objectsCount++;
        const keys = Object.keys(val);
        totalKeys += keys.length;
        keys.forEach((key) => traverse(val[key], depth + 1));
      } else if (typeof val === "string") {
        stringsCount++;
      } else if (typeof val === "number") {
        numbersCount++;
      } else if (typeof val === "boolean") {
        booleansCount++;
      }
    };

    traverse(parsedData, 1);
    const fileSize = new Blob([inputJson]).size;

    return {
      fileSize,
      totalKeys,
      objectsCount,
      arraysCount,
      stringsCount,
      numbersCount,
      booleansCount,
      nullsCount,
      maxDepth,
    };
  }, [parsedData, inputJson]);

  // Search match count calculation
  const searchMatchCount = useMemo<number>(() => {
    if (!searchQuery.trim() || parsedData === null) return 0;
    let count = 0;
    const q = searchQuery.toLowerCase();

    const searchTraverse = (val: any, keyName?: string) => {
      if (keyName && keyName.toLowerCase().includes(q)) count++;
      if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
        if (String(val).toLowerCase().includes(q)) count++;
      } else if (Array.isArray(val)) {
        val.forEach((item) => searchTraverse(item));
      } else if (typeof val === "object" && val !== null) {
        Object.keys(val).forEach((k) => searchTraverse(val[k], k));
      }
    };

    searchTraverse(parsedData);
    return count;
  }, [searchQuery, parsedData]);

  // Format / Beautify JSON
  const handleFormat = useCallback(() => {
    if (!inputJson.trim()) return;
    try {
      const parsed = JSON.parse(inputJson);
      const space = indentation === "tab" ? "\t" : Number(indentation);
      const formatted = JSON.stringify(parsed, null, space);
      setInputJson(formatted);
      toast.success("JSON formatted successfully!");
    } catch {
      toast.error("Cannot format invalid JSON. Fix syntax errors first.");
    }
  }, [inputJson, indentation]);

  // Minify JSON
  const handleMinify = useCallback(() => {
    if (!inputJson.trim()) return;
    try {
      const parsed = JSON.parse(inputJson);
      const minified = JSON.stringify(parsed);
      setInputJson(minified);
      toast.success("JSON minified to single line!");
    } catch {
      toast.error("Cannot minify invalid JSON.");
    }
  }, [inputJson]);

  // Sort Keys Alphabetically
  const handleSortKeys = useCallback(() => {
    if (!inputJson.trim()) return;
    try {
      const parsed = JSON.parse(inputJson);
      const sortObj = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(sortObj);
        } else if (typeof obj === "object" && obj !== null) {
          return Object.keys(obj)
            .sort()
            .reduce((acc: any, key: string) => {
              acc[key] = sortObj(obj[key]);
              return acc;
            }, {});
        }
        return obj;
      };

      const sorted = sortObj(parsed);
      const space = indentation === "tab" ? "\t" : Number(indentation);
      setInputJson(JSON.stringify(sorted, null, space));
      toast.success("JSON keys sorted alphabetically!");
    } catch {
      toast.error("Cannot sort invalid JSON.");
    }
  }, [inputJson, indentation]);

  // Smart Repair JSON (Fix trailing commas, single quotes, unquoted keys, or JS object syntax)
  const handleSmartRepair = useCallback(() => {
    if (!inputJson.trim()) return;
    try {
      // 1. Convert single quotes to double quotes around string values & keys
      let fixed = inputJson
        .replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"') // single to double quotes
        .replace(/,\s*([\]}])/g, "$1"); // remove trailing commas

      // 2. Quote unquoted keys (e.g. { foo: 1 } -> { "foo": 1 })
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');

      const parsed = JSON.parse(fixed);
      const space = indentation === "tab" ? "\t" : Number(indentation);
      setInputJson(JSON.stringify(parsed, null, space));
      toast.success("Repaired single quotes, trailing commas & unquoted keys!");
    } catch (err) {
      toast.error("Could not auto-repair JSON syntax. Please check manual edits.");
    }
  }, [inputJson, indentation]);

  // Escape / Unescape Stringified JSON
  const handleEscapeToggle = useCallback(() => {
    if (!inputJson.trim()) return;
    if (inputJson.includes('\\"')) {
      // Unescape
      try {
        const unescaped = inputJson.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        const parsed = JSON.parse(unescaped);
        const space = indentation === "tab" ? "\t" : Number(indentation);
        setInputJson(JSON.stringify(parsed, null, space));
        toast.success("Unescaped stringified JSON!");
      } catch {
        setInputJson(inputJson.replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
        toast.info("Unescaped slash quotes");
      }
    } else {
      // Escape
      const escaped = JSON.stringify(inputJson);
      setInputJson(escaped);
      toast.success("Escaped JSON into serialized string!");
    }
  }, [inputJson, indentation]);

  // Clipboard Actions
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inputJson);
      setCopiedCode(true);
      toast.success("JSON copied to clipboard!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputJson(text);
        toast.success("Pasted text from clipboard!");
      }
    } catch {
      toast.error("Failed to read clipboard text");
    }
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(selectedPath);
      setCopiedPath(true);
      toast.success(`Copied JSONPath: ${selectedPath}`);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch {
      toast.error("Failed to copy JSONPath");
    }
  };

  // Upload File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || "";
      setInputJson(content);
      toast.success(`Loaded "${selected.name}" successfully!`);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(selected);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDropzone(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || "";
        setInputJson(content);
        toast.success(`Loaded dropped file "${droppedFile.name}"`);
      };
      reader.readAsText(droppedFile);
    }
  };

  // Download File
  const handleDownload = () => {
    if (!inputJson.trim()) return;
    const blob = new Blob([inputJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded formatted.json");
  };

  // Expand / Collapse All Paths
  const handleExpandAll = () => {
    if (!parsedData) return;
    const allPaths = new Set<string>();

    const collectPaths = (val: any, path: string) => {
      allPaths.add(path);
      if (Array.isArray(val)) {
        val.forEach((item, idx) => collectPaths(item, `${path}[${idx}]`));
      } else if (typeof val === "object" && val !== null) {
        Object.keys(val).forEach((k) => collectPaths(val[k], `${path}.${k}`));
      }
    };

    collectPaths(parsedData, "$");
    setExpandedPaths(allPaths);
  };

  const handleCollapseAll = () => {
    setExpandedPaths(new Set(["$"]));
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Drag handle for split view resizing
  const handleMouseDownSplit = () => {
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(25, Math.min(75, (x / rect.width) * 100));
      setSplitWidth(pct);
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    if (isDraggingSplit) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSplit]);

  // JSONPath Breadcrumb segments
  const pathSegments = useMemo(() => {
    if (!selectedPath || selectedPath === "$") return ["$"];
    return selectedPath.split(/(?=\.|\[)/);
  }, [selectedPath]);

  return (
    <>
      <Toaster position="top-center" richColors />

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/#developer"
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Developer Tools
          </Link>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <FileJson className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 leading-none">
                JSON Formatter & Visualizer
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Format, validate, repair syntax, inspect tree nodes & extract JSONPath
              </p>
            </div>
          </div>
        </div>

        {/* Validation Status Badge & Presets */}
        <div className="flex items-center gap-2">
          {error ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Syntax Error {error.line ? `(Line ${error.line})` : ""}
            </div>
          ) : parsedData !== null ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Valid JSON
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-500">
              Empty
            </div>
          )}

          {/* Quick Presets Dropdown Buttons */}
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="text-[10px] font-bold text-zinc-400 px-2">Presets:</span>
            <button
              onClick={() => setInputJson(PRESETS.apiResponse)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold hover:text-amber-500 transition cursor-pointer shadow-2xs"
            >
              <FileText className="h-3 w-3 text-amber-500" /> API
            </button>
            <button
              onClick={() => setInputJson(PRESETS.userList)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold hover:text-amber-500 transition cursor-pointer shadow-2xs"
            >
              <User className="h-3 w-3 text-blue-500" /> Users
            </button>
            <button
              onClick={() => setInputJson(PRESETS.configObj)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold hover:text-amber-500 transition cursor-pointer shadow-2xs"
            >
              <Settings className="h-3 w-3 text-emerald-500" /> Config
            </button>
          </div>
        </div>
      </div>

      {/* QUICK HELP / USER TIP BANNER */}
      {showHelpBanner && (
        <div className="mb-4 flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="font-medium">
              <strong className="font-bold">Pro Tip:</strong> Click any key in the Tree Viewer on the right to extract its exact <code className="font-bold font-mono bg-amber-500/20 px-1 py-0.5 rounded">JSONPath</code>! Use <strong className="font-bold">Fix JSON</strong> to fix trailing commas or single quotes automatically.
            </p>
          </div>
          <button
            onClick={() => setShowHelpBanner(false)}
            className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer shrink-0"
            title="Dismiss tip"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Workspace Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 mb-4 text-xs shadow-xs">
        
        {/* Left Formatting & Transform Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleFormat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer"
            title="Format & Beautify JSON with selected indentation"
          >
            <Code2 className="h-3.5 w-3.5" />
            Format / Beautify
          </button>

          <button
            onClick={handleMinify}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Minify JSON to compact single line"
          >
            <Minimize2 className="h-3.5 w-3.5 text-blue-500" />
            Minify
          </button>

          <button
            onClick={handleSortKeys}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Sort object keys alphabetically"
          >
            <SortAsc className="h-3.5 w-3.5 text-emerald-500" />
            Sort A-Z
          </button>

          <button
            onClick={handleSmartRepair}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Fix trailing commas, single quotes & unquoted keys"
          >
            <Wand2 className="h-3.5 w-3.5 text-violet-500" />
            Fix JSON
          </button>

          <button
            onClick={handleEscapeToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Escape / Unescape JSON quotes"
          >
            <Quote className="h-3.5 w-3.5 text-pink-500" />
            Escape/Unescape
          </button>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 hidden sm:block" />

          {/* Indentation Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl p-0.5 border border-zinc-200 dark:border-zinc-700">
            <span className="text-[11px] font-bold text-zinc-400 px-2">Indent:</span>
            {(["2", "4", "tab"] as const).map((space) => (
              <button
                key={space}
                onClick={() => setIndentation(space)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer",
                  indentation === space
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                {space === "tab" ? "Tabs" : `${space} Sp`}
              </button>
            ))}
          </div>
        </div>

        {/* Right I/O Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleExpandAll}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Expand All Tree Nodes"
          >
            <UnfoldVertical className="h-4 w-4" />
          </button>
          <button
            onClick={handleCollapseAll}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Collapse All Tree Nodes"
          >
            <FoldVertical className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 hidden sm:block" />

          <button
            onClick={handleCopyCode}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Copy JSON"
          >
            {copiedCode ? <Check className="h-4 w-4 text-amber-500" /> : <Copy className="h-4 w-4" />}
          </button>

          <button
            onClick={handlePasteCode}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Paste from Clipboard"
          >
            <Clipboard className="h-4 w-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Upload .json file"
          >
            <Upload className="h-4 w-4" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            title="Download formatted.json"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={() => setInputJson("")}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
            title="Clear Editor"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Main Split View Container */}
      <div
        ref={splitContainerRef}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOverDropzone(true);
        }}
        onDragLeave={() => setIsDragOverDropzone(false)}
        onDrop={handleFileDrop}
        className={cn(
          "relative flex flex-col md:flex-row w-full min-h-[600px] h-[660px] rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden transition-all",
          isDragOverDropzone
            ? "border-amber-500 ring-4 ring-amber-500/20"
            : "border-zinc-200 dark:border-zinc-800"
        )}
      >
        
        {/* Dropzone Overlay on Drag */}
        {isDragOverDropzone && (
          <div className="absolute inset-0 z-50 bg-amber-500/90 dark:bg-amber-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-6 space-y-2">
            <Upload className="h-12 w-12 animate-bounce" />
            <h3 className="text-lg font-extrabold">Drop your JSON file here</h3>
            <p className="text-xs font-semibold opacity-90">Content will load automatically into the code editor</p>
          </div>
        )}

        {/* LEFT PANE: Monaco Code Editor */}
        <div
          style={{ width: `${splitWidth}%` }}
          className="flex flex-col h-full border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                JSON Editor
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              {inputJson ? `${inputJson.split("\n").length} lines • ${(new Blob([inputJson]).size / 1024).toFixed(1)} KB` : "0 lines"}
            </span>
          </div>

          <div className="flex-1 relative overflow-hidden bg-zinc-950">
            <MonacoEditor
              height="100%"
              language="json"
              theme="vs-dark"
              value={inputJson}
              onChange={(val) => setInputJson(val || "")}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                tabSize: indentation === "tab" ? 2 : Number(indentation),
                insertSpaces: indentation !== "tab",
                wordWrap: "on",
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
                lineNumbers: "on",
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Syntax Error Diagnostics Banner */}
          {error && (
            <div className="border-t border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-red-600 dark:text-red-300">Syntax Error Detected</p>
                  {error.line && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-500">
                      Line {error.line}{error.column ? `, Col ${error.column}` : ""}
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11px] break-words text-red-700 dark:text-red-400">
                  {error.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Resizable Divider Handle (Desktop) */}
        <div
          onMouseDown={handleMouseDownSplit}
          className="hidden md:flex w-2.5 bg-zinc-100 hover:bg-amber-500 dark:bg-zinc-800 dark:hover:bg-amber-500 cursor-col-resize items-center justify-center transition-colors shrink-0 group z-10"
          title="Drag left or right to adjust split width"
        >
          <GripVertical className="h-4 w-3 text-zinc-400 group-hover:text-white" />
        </div>

        {/* RIGHT PANE: Interactive Tree Viewer, Path Extraction & Stats */}
        <div className="flex-1 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/40 overflow-hidden min-w-0">
          
          {/* Tree Header & Search */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2.5">
            
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Interactive Tree Visualizer
                </span>
              </div>

              {/* JSONPath Display */}
              <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                <span className="text-[10px] font-bold text-zinc-400 shrink-0">Selected Path:</span>
                <code className="text-[11px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded truncate max-w-[180px]">
                  {selectedPath}
                </code>
                <button
                  onClick={handleCopyPath}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition cursor-pointer shrink-0"
                  title="Copy JSONPath to clipboard"
                >
                  {copiedPath ? <Check className="h-3.5 w-3.5 text-amber-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Search Bar with Live Matches Badge */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search keys, values, or strings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:bg-zinc-950 pl-8 pr-16 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              {searchQuery.trim().length > 0 && (
                <span className="absolute right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
                  {searchMatchCount} {searchMatchCount === 1 ? "match" : "matches"}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Tree View Body */}
          <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed space-y-1">
            {parsedData !== null ? (
              <JsonTreeNode
                name="root"
                value={parsedData}
                path="$"
                depth={0}
                expandedPaths={expandedPaths}
                toggleExpand={toggleExpand}
                searchQuery={searchQuery}
                onSelectNode={(p) => setSelectedPath(p)}
                selectedPath={selectedPath}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-2">
                <FileCode className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">No valid JSON to display tree</p>
                <p className="text-[11px] text-zinc-500 max-w-xs">
                  Paste or type JSON into the code editor on the left to inspect the interactive tree.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Statistics Dashboard Card */}
          {stats && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-[11px] shadow-inner">
              <div className="flex items-center justify-between font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5 text-amber-500" />
                  JSON Structure Metrics
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Size: {(stats.fileSize / 1024).toFixed(1)} KB ({stats.fileSize} B)
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
                <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-medium">Keys</p>
                  <p className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-xs">{stats.totalKeys}</p>
                </div>
                <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-medium">Objects</p>
                  <p className="font-extrabold text-blue-600 dark:text-blue-400 font-mono text-xs">{stats.objectsCount}</p>
                </div>
                <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-medium">Arrays</p>
                  <p className="font-extrabold text-violet-600 dark:text-violet-400 font-mono text-xs">{stats.arraysCount}</p>
                </div>
                <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-medium">Strings</p>
                  <p className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-xs">{stats.stringsCount}</p>
                </div>
                <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-medium">Numbers</p>
                  <p className="font-extrabold text-cyan-600 dark:text-cyan-400 font-mono text-xs">{stats.numbersCount}</p>
                </div>
                <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-medium">Booleans</p>
                  <p className="font-extrabold text-pink-600 dark:text-pink-400 font-mono text-xs">{stats.booleansCount}</p>
                </div>
                <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-medium">Nulls</p>
                  <p className="font-extrabold text-red-500 font-mono text-xs">{stats.nullsCount}</p>
                </div>
                <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-medium">Depth</p>
                  <p className="font-extrabold text-zinc-800 dark:text-zinc-200 font-mono text-xs">{stats.maxDepth}</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </>
  );
}

// Recursive JSON Tree Node Component
interface JsonTreeNodeProps {
  name?: string;
  value: any;
  path: string;
  depth: number;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
  searchQuery: string;
  onSelectNode: (path: string) => void;
  selectedPath: string;
}

function JsonTreeNode({
  name,
  value,
  path,
  depth,
  expandedPaths,
  toggleExpand,
  searchQuery,
  onSelectNode,
  selectedPath,
}: JsonTreeNodeProps) {
  const isExpanded = expandedPaths.has(path);
  const isSelected = selectedPath === path;
  const isObject = typeof value === "object" && value !== null;
  const isArray = Array.isArray(value);

  // Search Highlight Helper
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-amber-400/40 text-amber-900 dark:text-amber-200 font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(path);
    if (isObject) {
      toggleExpand(path);
    }
  };

  if (isObject) {
    const keys = Object.keys(value);
    const count = keys.length;

    return (
      <div className="space-y-0.5 select-none" style={{ paddingLeft: depth > 0 ? "16px" : "0px" }}>
        <div
          onClick={handleNodeClick}
          className={cn(
            "flex items-center gap-1.5 py-0.5 px-2 rounded-lg cursor-pointer transition hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50",
            isSelected ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold shadow-2xs" : "text-zinc-800 dark:text-zinc-200"
          )}
        >
          <span className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>

          {name && (
            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">
              {highlightText(name)}:
            </span>
          )}

          <span className="text-zinc-500 font-mono text-[11px]">
            {isArray ? `Array(${count}) [` : `Object { ${count} ${count === 1 ? "key" : "keys"} }`}
          </span>

          {!isExpanded && (
            <span className="text-zinc-400 text-[10px]">
              {isArray ? "... ]" : " ... }"}
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="space-y-0.5">
            {keys.map((key) => {
              const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`;
              return (
                <JsonTreeNode
                  key={key}
                  name={isArray ? undefined : key}
                  value={value[key]}
                  path={childPath}
                  depth={depth + 1}
                  expandedPaths={expandedPaths}
                  toggleExpand={toggleExpand}
                  searchQuery={searchQuery}
                  onSelectNode={onSelectNode}
                  selectedPath={selectedPath}
                />
              );
            })}
            <div className="text-zinc-400 text-[11px] pl-4 font-mono">
              {isArray ? "]" : "}"}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Primitive Values Rendering
  let valColor = "text-emerald-600 dark:text-emerald-400"; // String default
  let displayValue = JSON.stringify(value);

  if (typeof value === "number") {
    valColor = "text-cyan-600 dark:text-cyan-400";
  } else if (typeof value === "boolean") {
    valColor = "text-pink-600 dark:text-pink-400";
  } else if (value === null) {
    valColor = "text-red-500 font-bold";
    displayValue = "null";
  }

  return (
    <div
      style={{ paddingLeft: depth > 0 ? "16px" : "0px" }}
      onClick={handleNodeClick}
      className={cn(
        "flex items-center gap-1.5 py-0.5 px-2 rounded-lg cursor-pointer transition hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50",
        isSelected ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold shadow-2xs" : ""
      )}
    >
      <span className="w-3.5 h-3.5 inline-block shrink-0" />

      {name && (
        <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">
          {highlightText(name)}:
        </span>
      )}

      <span className={cn("font-mono truncate max-w-md", valColor)}>
        {highlightText(displayValue)}
      </span>
    </div>
  );
}
