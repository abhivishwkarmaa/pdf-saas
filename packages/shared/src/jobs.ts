export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface JobPayload {
  jobId: string;
  toolSlug: string;
  inputKeys: string[];
  options?: Record<string, unknown>;
  sessionId?: string;
}

export interface JobResult {
  outputKey?: string;
  outputKeys?: string[];
  mimeType?: string;
  fileName?: string;
  error?: string;
}
