export type ToolCategory =
  | "pdf"
  | "image"
  | "text"
  | "developer"
  | "calculator";

export type ToolTier = "sync" | "async";

/** file = upload-based; utility = in-browser text/calculator */
export type ToolKind = "file" | "utility";

export interface ToolDefinition {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  tier: ToolTier;
  kind: ToolKind;
  maxFiles: number;
  maxMb: number;
  accept: string[];
  enabled: boolean;
  popular?: boolean;
  phase: number;
}
