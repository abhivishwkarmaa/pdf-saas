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
  Table as TableIcon,
  Eye,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  FolderPlus,
  FolderMinus,
  Maximize2,
  Braces,
  Binary,
  FileSpreadsheet,
  FileCode2,
  ArrowRight,
  Sliders,
  Filter,
  CheckSquare,
  Key,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CATEGORY_THEME } from "@/lib/category-theme";

// Dynamically import Monaco Editor to avoid SSR window issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-xs font-mono text-zinc-400 gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      Loading Code Editor...
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
      { "id": "usr_101", "name": "Alice Johnson", "role": "Administrator", "active": true, "skills": ["React", "Next.js", "TypeScript"] },
      { "id": "usr_102", "name": "Bob Smith", "role": "Developer", "active": true, "skills": ["Node.js", "Docker", "Python"] },
      { "id": "usr_103", "name": "Charlie Brown", "role": "Designer", "active": false, "skills": ["Figma", "UI/UX", "Tailwind"] }
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
    "version": "3.2.0",
    "environment": "production",
    "features": {
      "monacoEditor": true,
      "treeViewer": true,
      "jsonPathCopy": true,
      "smartRepair": true,
      "typeScriptExport": true
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
  // Main Tab State: "viewer" (Tree + Table Inspector) | "text" (Code Editor) | "export" (TypeScript/CSV/YAML)
  const [activeTab, setActiveTab] = useState<"viewer" | "text" | "export">("viewer");

  // Mobile / Tablet Sub-view mode in Viewer tab: "split" (Default) | "tree" (Full Tree) | "table" (Full Table)
  const [viewSubMode, setViewSubMode] = useState<"split" | "tree" | "table">("split");

  const [inputJson, setInputJson] = useState<string>(PRESETS.apiResponse);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<JsonError | null>(null);
  const [indentation, setIndentation] = useState<"2" | "4" | "tab">("2");

  // Interactive Tree & Selection
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(["$", "$[0]", "$[1]", "$.data", "$.data.items", "$.app"])
  );
  const [selectedPath, setSelectedPath] = useState<string>("$");
  const [selectedData, setSelectedData] = useState<any>(null);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);

  // Export mode: "ts" (TypeScript) | "yaml" (YAML) | "csv" (CSV)
  const [exportFormat, setExportFormat] = useState<"ts" | "yaml" | "csv">("ts");

  // Split View Resizing (Tree vs Inspector Table in Viewer Tab)
  const [viewerSplitPct, setViewerSplitPct] = useState<number>(55);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Copy status
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedSelectedValue, setCopiedSelectedValue] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse JSON and compute diagnostics
  useEffect(() => {
    if (!inputJson.trim()) {
      setParsedData(null);
      setError(null);
      setSelectedData(null);
      return;
    }

    try {
      const parsed = JSON.parse(inputJson);
      setParsedData(parsed);
      setError(null);
    } catch (err: any) {
      setParsedData(null);
      const errMsg = err.message || "Invalid JSON format";

      let line: number | undefined;
      let column: number | undefined;

      const posMatch = errMsg.match(/position\s+(\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const upToPos = inputJson.substring(0, pos);
        const lines = upToPos.split("\n");
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }

      const lineMatch = errMsg.match(/line\s+(\d+)/i);
      if (lineMatch && !line) {
        line = parseInt(lineMatch[1], 10);
      }

      setError({ message: errMsg, line, column });
    }
  }, [inputJson]);

  // Update selected data based on selectedPath
  useEffect(() => {
    if (!parsedData) {
      setSelectedData(null);
      return;
    }

    if (selectedPath === "$") {
      setSelectedData(parsedData);
      return;
    }

    try {
      const segments = selectedPath
        .replace(/^\$\.?/, "")
        .split(/(?:\.|\b(?=\[))/)
        .map((s) => s.replace(/^\[|\]$/g, ""))
        .filter(Boolean);

      let curr = parsedData;
      for (const seg of segments) {
        if (curr && typeof curr === "object" && seg in curr) {
          curr = curr[seg];
        } else {
          curr = undefined;
          break;
        }
      }
      setSelectedData(curr !== undefined ? curr : parsedData);
    } catch {
      setSelectedData(parsedData);
    }
  }, [selectedPath, parsedData]);

  // Search indexing
  useEffect(() => {
    if (!searchQuery.trim() || !parsedData) {
      setSearchMatches([]);
      setActiveMatchIndex(0);
      return;
    }

    const q = searchQuery.toLowerCase();
    const foundPaths: string[] = [];

    const traverse = (val: any, currentPath: string) => {
      if (currentPath.toLowerCase().includes(q)) {
        foundPaths.push(currentPath);
      }
      if (val !== null && typeof val !== "object") {
        if (String(val).toLowerCase().includes(q)) {
          foundPaths.push(currentPath);
        }
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => traverse(item, `${currentPath}[${idx}]`));
      } else if (typeof val === "object" && val !== null) {
        Object.keys(val).forEach((k) => {
          if (k.toLowerCase().includes(q)) {
            foundPaths.push(`${currentPath}.${k}`);
          }
          traverse(val[k], `${currentPath}.${k}`);
        });
      }
    };

    traverse(parsedData, "$");
    setSearchMatches(Array.from(new Set(foundPaths)));
    setActiveMatchIndex(0);

    if (foundPaths.length > 0) {
      // Auto expand to match
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        foundPaths.forEach((p) => {
          const parts = p.split(/(?=\.|\[)/);
          let sub = "$";
          parts.forEach((part) => {
            if (part !== "$") {
              sub += part;
              next.add(sub);
            }
          });
        });
        return next;
      });
    }
  }, [searchQuery, parsedData]);

  // Search Navigation
  const handleSearchNext = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % searchMatches.length;
    setActiveMatchIndex(nextIdx);
    setSelectedPath(searchMatches[nextIdx]);
  };

  const handleSearchPrev = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setActiveMatchIndex(prevIdx);
    setSelectedPath(searchMatches[prevIdx]);
  };

  const handleSearchGo = () => {
    if (searchMatches.length > 0) {
      setSelectedPath(searchMatches[activeMatchIndex]);
      toast.success(`Navigated to match ${activeMatchIndex + 1} of ${searchMatches.length}`);
    } else if (searchQuery.trim()) {
      toast.info("No matching keys or values found");
    }
  };

  // Format / Beautify
  const handleFormat = () => {
    if (!parsedData) {
      toast.error("Cannot format: invalid JSON syntax");
      return;
    }
    const space = indentation === "tab" ? "\t" : Number(indentation);
    const formatted = JSON.stringify(parsedData, null, space);
    setInputJson(formatted);
    toast.success(`Beautified JSON (${indentation === "tab" ? "Tabs" : `${indentation} Spaces`})`);
  };

  // Minify / Compact
  const handleMinify = () => {
    if (!parsedData) {
      toast.error("Cannot minify: invalid JSON syntax");
      return;
    }
    const minified = JSON.stringify(parsedData);
    setInputJson(minified);
    toast.success("Minified JSON (Single-line compact)");
  };

  // Sort Keys Alphabetically
  const handleSortKeys = (direction: "asc" | "desc" = "asc") => {
    if (!parsedData) {
      toast.error("Cannot sort: invalid JSON syntax");
      return;
    }

    const sortObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sortObject);
      }
      if (typeof obj === "object" && obj !== null) {
        const sortedKeys = Object.keys(obj).sort((a, b) =>
          direction === "asc" ? a.localeCompare(b) : b.localeCompare(a)
        );
        const result: Record<string, any> = {};
        for (const key of sortedKeys) {
          result[key] = sortObject(obj[key]);
        }
        return result;
      }
      return obj;
    };

    const sorted = sortObject(parsedData);
    const space = indentation === "tab" ? "\t" : Number(indentation);
    setInputJson(JSON.stringify(sorted, null, space));
    toast.success(`Sorted object keys (${direction.toUpperCase()})`);
  };

  // Smart Repair Invalid JSON
  const handleSmartRepair = () => {
    let raw = inputJson.trim();
    if (!raw) return;

    try {
      let repaired = raw
        .replace(/,\s*([\]}])/g, "$1") // Remove trailing commas
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // Quote unquoted keys
        .replace(/'([^']*)'/g, '"$1"') // Replace single quotes with double quotes
        .replace(/:\s*undefined/g, ": null") // Replace undefined with null
        .replace(/:\s*NaN/g, ': "NaN"') // Handle NaN
        .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, ""); // Strip comments

      const parsed = JSON.parse(repaired);
      const space = indentation === "tab" ? "\t" : Number(indentation);
      setInputJson(JSON.stringify(parsed, null, space));
      toast.success("Smart repair applied: syntax fixed & formatted!");
    } catch (e: any) {
      toast.error("Could not automatically repair JSON. Please check syntax manually.");
    }
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
    toast.success("Expanded all tree nodes");
  };

  const handleCollapseAll = () => {
    setExpandedPaths(new Set(["$"]));
    toast.success("Collapsed all tree nodes");
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

  // Copy helpers
  const handleCopyCode = async () => {
    if (!inputJson) return;
    await navigator.clipboard.writeText(inputJson);
    setCopiedCode(true);
    toast.success("JSON copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyPath = async () => {
    if (!selectedPath) return;
    await navigator.clipboard.writeText(selectedPath);
    setCopiedPath(true);
    toast.success(`Copied JSONPath: ${selectedPath}`);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopySelectedValue = async () => {
    if (selectedData === undefined) return;
    const text =
      typeof selectedData === "object" ? JSON.stringify(selectedData, null, 2) : String(selectedData);
    await navigator.clipboard.writeText(text);
    setCopiedSelectedValue(true);
    toast.success("Copied selected node value!");
    setTimeout(() => setCopiedSelectedValue(false), 2000);
  };

  // Upload & Download
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || "";
      setInputJson(content);
      toast.success(`Loaded "${selected.name}"`);
    };
    reader.readAsText(selected);
  };

  const handleDownload = () => {
    if (!inputJson.trim()) return;
    const blob = new Blob([inputJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded data.json");
  };

  // Resizing handler for Tree vs Inspector Table
  const handleMouseDownSplit = () => {
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(25, Math.min(75, (x / rect.width) * 100));
      setViewerSplitPct(pct);
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

  // Compute Inspector Table Rows for Selected Node
  const inspectorRows = useMemo(() => {
    if (selectedData === null || selectedData === undefined) return [];
    if (Array.isArray(selectedData)) {
      return selectedData.map((item, idx) => ({
        name: String(idx),
        value: item,
        type: Array.isArray(item) ? "array" : item === null ? "null" : typeof item,
        childPath: `${selectedPath}[${idx}]`,
      }));
    }
    if (typeof selectedData === "object") {
      return Object.keys(selectedData).map((key) => {
        const val = selectedData[key];
        return {
          name: key,
          value: val,
          type: Array.isArray(val) ? "array" : val === null ? "null" : typeof val,
          childPath: `${selectedPath}.${key}`,
        };
      });
    }
    // Primitive
    return [
      {
        name: "value",
        value: selectedData,
        type: typeof selectedData,
        childPath: selectedPath,
      },
    ];
  }, [selectedData, selectedPath]);

  // Generate TypeScript Interface
  const typeScriptCode = useMemo(() => {
    if (!parsedData) return "// Invalid JSON";

    const generateType = (val: any, indent: string = ""): string => {
      if (val === null) return "null";
      if (Array.isArray(val)) {
        if (val.length === 0) return "any[]";
        const inner = generateType(val[0], indent);
        return `${inner}[]`;
      }
      if (typeof val === "object") {
        const keys = Object.keys(val);
        if (keys.length === 0) return "Record<string, any>";
        const lines = keys.map((k) => {
          const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
          return `${indent}  ${safeKey}: ${generateType(val[k], indent + "  ")};`;
        });
        return `{\n${lines.join("\n")}\n${indent}}`;
      }
      return typeof val;
    };

    return `export interface RootObject ${generateType(parsedData)}`;
  }, [parsedData]);

  // Generate CSV from JSON Array
  const csvCode = useMemo(() => {
    if (!parsedData) return "";
    const arr = Array.isArray(parsedData)
      ? parsedData
      : typeof parsedData === "object" && parsedData !== null && Array.isArray((Object.values(parsedData) as any[])[0])
      ? (Object.values(parsedData) as any[])[0]
      : [parsedData];

    if (!Array.isArray(arr) || arr.length === 0) return "No array structure found to convert to CSV";

    const headers = Array.from(
      new Set(
        arr.flatMap((item) => (typeof item === "object" && item !== null ? Object.keys(item) : ["value"]))
      )
    );

    const escapeCsv = (str: any) => {
      const val = typeof str === "object" ? JSON.stringify(str) : String(str ?? "");
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const headerLine = headers.map(escapeCsv).join(",");
    const rows = arr.map((item) => {
      if (typeof item === "object" && item !== null) {
        return headers.map((h) => escapeCsv(item[h])).join(",");
      }
      return escapeCsv(item);
    });

    return [headerLine, ...rows].join("\n");
  }, [parsedData]);

  // Copy export code
  const handleCopyExport = async () => {
    const text = exportFormat === "ts" ? typeScriptCode : csvCode;
    await navigator.clipboard.writeText(text);
    setCopiedExport(true);
    toast.success(`Copied ${exportFormat.toUpperCase()} to clipboard!`);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  // Breadcrumbs calculation
  const breadcrumbSegments = useMemo(() => {
    if (!selectedPath || selectedPath === "$") return [{ label: "Root ($)", path: "$" }];
    const parts = selectedPath.split(/(?=\.|\[)/);
    let accum = "$";
    const result = [{ label: "Root", path: "$" }];

    for (const part of parts) {
      if (part !== "$") {
        accum += part;
        result.push({
          label: part.replace(/^\.|\b/, ""),
          path: accum,
        });
      }
    }
    return result;
  }, [selectedPath]);

  // Statistics
  const stats: JsonStats | null = useMemo(() => {
    if (!parsedData) return null;

    let totalKeys = 0;
    let objectsCount = 0;
    let arraysCount = 0;
    let stringsCount = 0;
    let numbersCount = 0;
    let booleansCount = 0;
    let nullsCount = 0;
    let maxDepth = 0;

    const traverse = (val: any, currentDepth: number) => {
      if (currentDepth > maxDepth) maxDepth = currentDepth;

      if (val === null) {
        nullsCount++;
      } else if (Array.isArray(val)) {
        arraysCount++;
        val.forEach((item) => traverse(item, currentDepth + 1));
      } else if (typeof val === "object") {
        objectsCount++;
        const keys = Object.keys(val);
        totalKeys += keys.length;
        keys.forEach((k) => traverse(val[k], currentDepth + 1));
      } else if (typeof val === "string") {
        stringsCount++;
      } else if (typeof val === "number") {
        numbersCount++;
      } else if (typeof val === "boolean") {
        booleansCount++;
      }
    };

    traverse(parsedData, 1);

    return {
      fileSize: new Blob([inputJson]).size,
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

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-4">
      <Toaster position="top-center" richColors />

      {/* TOP HEADER & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/#developer"
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Developer Tools
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FileJson className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
                JSON Viewer & Formatter
              </h1>
            </div>
          </div>
        </div>

        {/* Validation Status Badge & Sample Presets */}
        <div className="flex items-center gap-2">
          {error ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Syntax Error {error.line ? `(Line ${error.line})` : ""}</span>
            </div>
          ) : parsedData !== null ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Valid JSON</span>
            </div>
          ) : null}

          {/* Quick Presets */}
          <div className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="text-[10px] font-bold text-zinc-400 px-1.5">Presets:</span>
            <button
              onClick={() => {
                setInputJson(PRESETS.apiResponse);
                toast.success("Loaded API response preset");
              }}
              className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold hover:text-amber-500 transition text-[11px]"
            >
              API
            </button>
            <button
              onClick={() => {
                setInputJson(PRESETS.userList);
                toast.success("Loaded User List preset");
              }}
              className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold hover:text-amber-500 transition text-[11px]"
            >
              Users
            </button>
            <button
              onClick={() => {
                setInputJson(PRESETS.configObj);
                toast.success("Loaded Config preset");
              }}
              className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold hover:text-amber-500 transition text-[11px]"
            >
              Config
            </button>
          </div>
        </div>
      </div>

      {/* JSONVIEWER PRIMARY TABS & FORMAT TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-2 shadow-xs">
        {/* PRIMARY TABS: VIEWER vs TEXT vs EXPORT */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("viewer")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs",
              activeTab === "viewer"
                ? "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-amber-400 border border-zinc-200 dark:border-zinc-700"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <Eye className="h-3.5 w-3.5 text-amber-500" />
            <span>Viewer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs",
              activeTab === "text"
                ? "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-amber-400 border border-zinc-200 dark:border-zinc-700"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <Code2 className="h-3.5 w-3.5 text-amber-500" />
            <span>Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs",
              activeTab === "export"
                ? "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-amber-400 border border-zinc-200 dark:border-zinc-700"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <Braces className="h-3.5 w-3.5 text-amber-500" />
            <span>Schema / Types</span>
          </button>
        </div>

        {/* TOOLBAR ACTIONS */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Format / Beautify Options */}
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
            <button
              onClick={handleFormat}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-white font-bold hover:bg-amber-600 transition shadow-xs text-[11px]"
              title="Format JSON"
            >
              <Sparkles className="h-3 w-3" />
              <span>Format</span>
            </button>

            <select
              value={indentation}
              onChange={(e) => setIndentation(e.target.value as any)}
              className="bg-transparent text-[11px] font-bold text-zinc-700 dark:text-zinc-300 px-1 py-1 focus:outline-none cursor-pointer"
            >
              <option value="2">2 Spaces</option>
              <option value="4">4 Spaces</option>
              <option value="tab">Tabs</option>
            </select>
          </div>

          <button
            onClick={handleMinify}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition"
            title="Minify / Compact into single line"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compact</span>
          </button>

          <button
            onClick={() => handleSortKeys("asc")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition"
            title="Sort Keys Alphabetically A-Z"
          >
            <SortAsc className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sort A-Z</span>
          </button>

          {error && (
            <button
              onClick={handleSmartRepair}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 font-bold text-xs transition animate-pulse"
              title="Smart fix syntax errors"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Smart Fix</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5 hidden sm:block" />

          {/* Tree Expand / Collapse (Only when in Viewer mode) */}
          {activeTab === "viewer" && (
            <>
              <button
                onClick={handleExpandAll}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                title="Expand All Nodes"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCollapseAll}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                title="Collapse All Nodes"
              >
                <FolderMinus className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5 hidden sm:block" />
            </>
          )}

          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            title="Copy JSON"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            title="Upload JSON File"
          >
            <Upload className="h-3.5 w-3.5" />
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
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            title="Download JSON File"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setInputJson("")}
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
            title="Clear"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* JSONPATH BREADCRUMB BAR */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 text-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 shrink-0 font-mono text-[11px]">
          <span className="font-bold text-zinc-400">Path:</span>
          {breadcrumbSegments.map((seg, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-zinc-400">›</span>}
              <button
                type="button"
                onClick={() => setSelectedPath(seg.path)}
                className={cn(
                  "hover:underline hover:text-amber-500 transition cursor-pointer font-bold",
                  selectedPath === seg.path
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-700 dark:text-zinc-300"
                )}
              >
                {seg.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        <button
          onClick={handleCopyPath}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold hover:border-amber-500 transition shrink-0"
        >
          {copiedPath ? <Check className="h-3 w-3 text-amber-500" /> : <Copy className="h-3 w-3" />}
          <span>Copy JSONPath</span>
        </button>
      </div>

      {/* VIEW 1: "VIEWER" MODE (COLLAPSIBLE TREE + NAME/VALUE TABLE INSPECTOR) */}
      {activeTab === "viewer" && (
        <div className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden min-h-[580px]">
          {/* Mobile sub-toggle bar (Tree vs Table vs Split) */}
          <div className="flex md:hidden items-center justify-between border-b border-zinc-200 bg-zinc-100 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
            <span className="font-bold text-zinc-500">View layout:</span>
            <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setViewSubMode("tree")}
                className={cn(
                  "px-2 py-0.5 rounded font-semibold transition",
                  viewSubMode === "tree" ? "bg-white dark:bg-zinc-950 text-amber-600 font-bold shadow-xs" : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                Tree View
              </button>
              <button
                onClick={() => setViewSubMode("table")}
                className={cn(
                  "px-2 py-0.5 rounded font-semibold transition",
                  viewSubMode === "table" ? "bg-white dark:bg-zinc-950 text-amber-600 font-bold shadow-xs" : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                Inspector Table
              </button>
              <button
                onClick={() => setViewSubMode("split")}
                className={cn(
                  "px-2 py-0.5 rounded font-semibold transition",
                  viewSubMode === "split" ? "bg-white dark:bg-zinc-950 text-amber-600 font-bold shadow-xs" : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                Split
              </button>
            </div>
          </div>

          {/* Main Dual-Pane Viewer Area */}
          <div
            ref={splitContainerRef}
            className="flex-1 flex flex-col md:flex-row min-h-[500px] h-[540px] overflow-hidden"
          >
            {/* LEFT SIDE: HIERARCHICAL TREE VIEWER */}
            {(viewSubMode === "split" || viewSubMode === "tree") && (
              <div
                style={{
                  width: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : `${viewerSplitPct}%`,
                }}
                className="flex flex-col h-full border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0 bg-zinc-50/40 dark:bg-zinc-950/40"
              >
                {/* Tree Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                    <span>JSON Tree Hierarchy</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <span>Selected:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold truncate max-w-[140px]">
                      {selectedPath}
                    </span>
                  </div>
                </div>

                {/* Tree Body */}
                <div className="flex-1 p-3 overflow-auto font-mono text-xs leading-relaxed space-y-0.5 select-none">
                  {parsedData !== null ? (
                    <JsonTreeNode
                      name="JSON"
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
                      <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        {error ? "JSON contains syntax error" : "Empty JSON"}
                      </p>
                      <p className="text-[11px] text-zinc-400 max-w-xs">
                        Switch to the &quot;Text&quot; tab to type or paste valid JSON.
                      </p>
                      <button
                        onClick={() => setActiveTab("text")}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold text-xs"
                      >
                        Open Text Editor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Split Resizer Divider (Visible only on desktop in split mode) */}
            <div
              onMouseDown={handleMouseDownSplit}
              className="hidden md:flex w-2 bg-zinc-200 hover:bg-amber-500 dark:bg-zinc-800 dark:hover:bg-amber-500 cursor-col-resize items-center justify-center transition-colors shrink-0 group z-10"
              title="Drag to resize tree and table panes"
            >
              <GripVertical className="h-4 w-3 text-zinc-400 group-hover:text-white" />
            </div>

            {/* RIGHT SIDE: NAME & VALUE INSPECTOR TABLE */}
            {(viewSubMode === "split" || viewSubMode === "table") && (
              <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden min-w-0">
                {/* Table Inspector Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                    <TableIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span>Properties Inspector</span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      ({inspectorRows.length} {inspectorRows.length === 1 ? "entry" : "entries"})
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopySelectedValue}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-200/70 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold transition"
                      title="Copy selected node value"
                    >
                      {copiedSelectedValue ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>Copy Value</span>
                    </button>
                  </div>
                </div>

                {/* Table Body (Name | Value | Type) */}
                <div className="flex-1 overflow-auto">
                  {inspectorRows.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 sticky top-0 z-10">
                          <th className="py-2 px-3 w-1/3 border-r border-zinc-200 dark:border-zinc-800">
                            Name
                          </th>
                          <th className="py-2 px-3 border-r border-zinc-200 dark:border-zinc-800">
                            Value
                          </th>
                          <th className="py-2 px-3 w-20 text-center">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                        {inspectorRows.map((row, idx) => {
                          const isObjOrArr = row.type === "object" || row.type === "array";
                          return (
                            <tr
                              key={idx}
                              onClick={() => {
                                setSelectedPath(row.childPath);
                                if (isObjOrArr) {
                                  toggleExpand(row.childPath);
                                }
                              }}
                              className={cn(
                                "hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition cursor-pointer group",
                                selectedPath === row.childPath && "bg-amber-50 dark:bg-amber-950/30"
                              )}
                            >
                              {/* Name */}
                              <td className="py-1.5 px-3 font-bold text-zinc-800 dark:text-zinc-200 border-r border-zinc-100 dark:border-zinc-900 truncate max-w-[150px]">
                                {row.name}
                              </td>

                              {/* Value */}
                              <td className="py-1.5 px-3 border-r border-zinc-100 dark:border-zinc-900 truncate max-w-[280px]">
                                {isObjOrArr ? (
                                  <span className="text-zinc-400 italic">
                                    {row.type === "array"
                                      ? `[ Array (${(row.value as any[]).length}) ]`
                                      : `{ Object (${Object.keys(row.value).length}) }`}
                                  </span>
                                ) : row.type === "string" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    &quot;{String(row.value)}&quot;
                                  </span>
                                ) : row.type === "number" ? (
                                  <span className="text-blue-600 dark:text-cyan-400 font-bold">
                                    {String(row.value)}
                                  </span>
                                ) : row.type === "boolean" ? (
                                  <span className="text-pink-600 dark:text-pink-400 font-bold">
                                    {String(row.value)}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 italic">null</span>
                                )}
                              </td>

                              {/* Type Badge */}
                              <td className="py-1.5 px-3 text-center">
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                    row.type === "string" &&
                                      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                                    row.type === "number" &&
                                      "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                    row.type === "boolean" &&
                                      "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
                                    row.type === "object" &&
                                      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                                    row.type === "array" &&
                                      "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
                                    row.type === "null" &&
                                      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                  )}
                                >
                                  {row.type}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-1">
                      <p className="text-xs">Select a node in the tree on the left to view properties</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM SEARCH TOOLBAR */}
          <div className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="font-bold text-zinc-600 dark:text-zinc-400 shrink-0 font-sans">
                Search:
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchNext()}
                  placeholder="Find key, string, or number..."
                  className="w-full rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
                {searchMatches.length > 0 && (
                  <span className="absolute right-2 top-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {activeMatchIndex + 1}/{searchMatches.length}
                  </span>
                )}
              </div>

              <button
                onClick={handleSearchGo}
                className="px-2.5 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold text-zinc-800 dark:text-zinc-200 text-xs transition"
              >
                GO!
              </button>

              <button
                onClick={handleSearchNext}
                disabled={searchMatches.length === 0}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200 text-xs transition disabled:opacity-40"
                title="Next match"
              >
                <ArrowDown className="h-3 w-3" />
                <span>Next</span>
              </button>

              <button
                onClick={handleSearchPrev}
                disabled={searchMatches.length === 0}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200 text-xs transition disabled:opacity-40"
                title="Previous match"
              >
                <ArrowUp className="h-3 w-3" />
                <span>Previous</span>
              </button>
            </div>

            {/* Metrics quick counter */}
            {stats && (
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                <span>
                  Total Keys: <b className="text-amber-600 dark:text-amber-400">{stats.totalKeys}</b>
                </span>
                <span>•</span>
                <span>
                  Depth: <b className="text-zinc-800 dark:text-zinc-200">{stats.maxDepth}</b>
                </span>
                <span>•</span>
                <span>
                  Size:{" "}
                  <b className="text-zinc-800 dark:text-zinc-200">
                    {(stats.fileSize / 1024).toFixed(1)} KB
                  </b>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: "TEXT" MODE (MONACO CODE EDITOR) */}
      {activeTab === "text" && (
        <div className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 shadow-sm overflow-hidden min-h-[580px] h-[600px]">
          {/* Code Editor Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-2.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-zinc-200">JSON Text Editor</span>
            </div>
            <span className="font-mono text-[11px]">
              {inputJson
                ? `${inputJson.split("\n").length} lines • ${(new Blob([inputJson]).size / 1024).toFixed(1)} KB`
                : "0 lines"}
            </span>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative overflow-hidden">
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
            <div className="border-t border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-300">Syntax Error Detected</span>
                  {error.line && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                      Line {error.line}
                      {error.column ? `, Col ${error.column}` : ""}
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11px] text-red-300">{error.message}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: "EXPORT / SCHEMA" MODE (TYPESCRIPT INTERFACE & CSV CONVERTER) */}
      {activeTab === "export" && (
        <div className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden min-h-[580px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-100/70 p-3 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Target Schema:</span>
              <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setExportFormat("ts")}
                  className={cn(
                    "px-3 py-1 rounded font-bold transition",
                    exportFormat === "ts"
                      ? "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-amber-400 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  )}
                >
                  TypeScript Interface
                </button>
                <button
                  onClick={() => setExportFormat("csv")}
                  className={cn(
                    "px-3 py-1 rounded font-bold transition",
                    exportFormat === "csv"
                      ? "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-amber-400 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  )}
                >
                  CSV Table
                </button>
              </div>
            </div>

            <button
              onClick={handleCopyExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-xs"
            >
              {copiedExport ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>Copy {exportFormat.toUpperCase()}</span>
            </button>
          </div>

          <div className="flex-1 p-4 bg-zinc-950 text-zinc-100 font-mono text-xs overflow-auto whitespace-pre leading-relaxed">
            {exportFormat === "ts" ? typeScriptCode : csvCode}
          </div>
        </div>
      )}

      {/* SUMMARY METRICS DASHBOARD */}
      {stats && (
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 text-[11px] shadow-xs">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
            <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">Keys</p>
              <p className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-xs">
                {stats.totalKeys}
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">Objects</p>
              <p className="font-extrabold text-blue-600 dark:text-blue-400 font-mono text-xs">
                {stats.objectsCount}
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">Arrays</p>
              <p className="font-extrabold text-violet-600 dark:text-violet-400 font-mono text-xs">
                {stats.arraysCount}
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">Strings</p>
              <p className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                {stats.stringsCount}
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">Numbers</p>
              <p className="font-extrabold text-cyan-600 dark:text-cyan-400 font-mono text-xs">
                {stats.numbersCount}
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">Booleans</p>
              <p className="font-extrabold text-pink-600 dark:text-pink-400 font-mono text-xs">
                {stats.booleansCount}
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">Nulls</p>
              <p className="font-extrabold text-red-500 font-mono text-xs">{stats.nullsCount}</p>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">Depth</p>
              <p className="font-extrabold text-zinc-800 dark:text-zinc-200 font-mono text-xs">
                {stats.maxDepth}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RECURSIVE JSON TREE NODE (MATCHING JSONVIEWER.STACK.HU WITH [+] / [-] AND ARRAY/OBJECT ICONS) ───
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

  // Search match highlight
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark
          key={i}
          className="bg-amber-400/40 text-amber-900 dark:text-amber-200 font-bold px-0.5 rounded"
        >
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

    return (
      <div className="space-y-0.5 select-none" style={{ paddingLeft: depth > 0 ? "16px" : "0px" }}>
        <div
          onClick={handleNodeClick}
          className={cn(
            "flex items-center gap-1.5 py-0.5 px-2 rounded-lg cursor-pointer transition hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50",
            isSelected
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
              : "text-zinc-800 dark:text-zinc-200"
          )}
        >
          {/* [+] or [-] Expand Box Button */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(path);
            }}
            className="flex items-center justify-center h-3.5 w-3.5 rounded border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 hover:border-amber-500 shrink-0 cursor-pointer leading-none"
          >
            {isExpanded ? "−" : "+"}
          </span>

          {/* Array [ ] or Object { } Icon */}
          <span className="text-zinc-500 dark:text-zinc-400 font-bold shrink-0">
            {isArray ? "[ ]" : "{ }"}
          </span>

          {/* Node Name */}
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {name ? highlightText(name) : ""}
          </span>

          {/* Count Badge */}
          <span className="text-[10px] text-zinc-400 font-normal">
            ({keys.length})
          </span>
        </div>

        {/* Children (When expanded) */}
        {isExpanded && (
          <div className="border-l border-zinc-200 dark:border-zinc-800 ml-1.5 pl-1 space-y-0.5">
            {keys.map((key) => {
              const childVal = value[key];
              const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`;
              return (
                <JsonTreeNode
                  key={key}
                  name={key}
                  value={childVal}
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
          </div>
        )}
      </div>
    );
  }

  // Primitive Leaf Node
  return (
    <div
      onClick={handleNodeClick}
      className={cn(
        "flex items-center gap-1.5 py-0.5 px-2 rounded-lg cursor-pointer transition hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 select-none",
        isSelected
          ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
          : "text-zinc-700 dark:text-zinc-300"
      )}
      style={{ paddingLeft: depth > 0 ? "16px" : "0px" }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
      {name && (
        <span className="font-bold text-zinc-900 dark:text-zinc-100">
          {highlightText(name)}:
        </span>
      )}

      {typeof value === "string" ? (
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
          &quot;{highlightText(String(value))}&quot;
        </span>
      ) : typeof value === "number" ? (
        <span className="text-blue-600 dark:text-cyan-400 font-bold">
          {highlightText(String(value))}
        </span>
      ) : typeof value === "boolean" ? (
        <span className="text-pink-600 dark:text-pink-400 font-bold">
          {highlightText(String(value))}
        </span>
      ) : (
        <span className="text-zinc-400 italic">null</span>
      )}
    </div>
  );
}
