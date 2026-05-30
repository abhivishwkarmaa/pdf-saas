export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface ParsedCommand {
  action:
    | "remove_pages"
    | "replace_page"
    | "extract_pages"
    | "rotate_pages"
    | "merge"
    | "split"
    | "compress"
    | "watermark"
    | "convert_to_word"
    | "reorder_pages"
    | "delete_blank_pages"
    | "add_page_numbers"
    | "encrypt"
    | "decrypt"
    | "resize_pages"
    | "unknown";
  pages?: number[]; // specific page numbers
  pageRange?: { from: number; to: number };
  rotationDegrees?: number;
  splitAfterPage?: number;
  watermarkText?: string;
  watermarkPosition?: "center" | "top" | "bottom";
  watermarkOpacity?: number;
  password?: string;
  outputFormat?: string;
  targetSize?: string;
  reorderMap?: number[]; // new order of pages e.g. [3,1,2] means page3 first
  confidence: number; // 0-1 how confident AI is
  explanation: string; // human readable explanation of what will happen
}

export interface JobPayload {
  jobId: string;
  toolSlug: string;
  inputKeys: string[];
  options?: Record<string, unknown>;
  sessionId?: string;
  aiCommand?: string; // raw natural language command
  parsedAiCommand?: ParsedCommand; // pre-parsed command
  additionalKeys?: string[]; // storage keys for additional files (merge)
}

export interface JobResult {
  outputKey?: string;
  outputKeys?: string[];
  mimeType?: string;
  fileName?: string;
  error?: string;
}
