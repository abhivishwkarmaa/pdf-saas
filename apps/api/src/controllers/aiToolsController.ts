import { Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { PDFDocument } from "pdf-lib";
import { ParsedCommand, ValidationError } from "@pdf-saas/shared";
import { saveUpload, getSignedUrl } from "@pdf-saas/storage";
import { prisma } from "../config/prisma";
import { addJobToQueue } from "../config/queue";
import { parseAICommand } from "../lib/aiCommandParser";
import { ruleBasedParse } from "../lib/ruleBasedParser";
import { AuthenticatedRequest } from "../middlewares/auth";

const IS_DEV = process.env.NODE_ENV === "development";
const SKIP_DB = process.env.SKIP_DB === "true" || IS_DEV;

// In-memory states for database-less fallback dev mode
const memoryJobs = new Map<string, any>();
const guestJobTracker = new Map<string, number>();

// Validation schemas
const parseCommandSchema = z.object({
  command: z.string().min(1, "Command is required"),
  totalPages: z.number().int().min(1, "Total pages must be at least 1"),
});

/**
 * Validates the parsed command against PDF page constraints
 */
function validateCommandConstraints(
  command: ParsedCommand,
  totalPages: number
): string | null {
  if (command.action === "remove_pages") {
    const pages = [...(command.pages || [])];
    if (command.pageRange) {
      for (let i = command.pageRange.from; i <= command.pageRange.to; i++) {
        pages.push(i);
      }
    }
    const uniquePages = Array.from(new Set(pages));
    for (const p of uniquePages) {
      if (p < 1 || p > totalPages) {
        return `Page ${p} does not exist. This PDF has ${totalPages} pages.`;
      }
    }
    if (uniquePages.length === totalPages) {
      return "Cannot remove all pages — result would be empty PDF";
    }
  }

  if (command.action === "extract_pages") {
    const pages: number[] = [];
    if (command.pageRange) {
      for (let i = command.pageRange.from; i <= command.pageRange.to; i++) {
        pages.push(i);
      }
    } else if (command.pages) {
      pages.push(...command.pages);
    }
    for (const p of pages) {
      if (p < 1 || p > totalPages) {
        return `Page ${p} does not exist. This PDF has ${totalPages} pages.`;
      }
    }
  }

  if (command.action === "rotate_pages") {
    const pages = command.pages || [];
    for (const p of pages) {
      if (p < 1 || p > totalPages) {
        return `Page ${p} does not exist. This PDF has ${totalPages} pages.`;
      }
    }
  }

  if (command.action === "split") {
    const splitAfterPage = command.splitAfterPage;
    if (splitAfterPage !== undefined && (splitAfterPage < 1 || splitAfterPage >= totalPages)) {
      return `Cannot split after page ${splitAfterPage}. PDF only has ${totalPages} pages.`;
    }
  }

  if (command.action === "reorder_pages") {
    const reorderMap = command.reorderMap || [];
    for (const p of reorderMap) {
      if (p < 1 || p > totalPages) {
        return `Page ${p} in reorder map does not exist. This PDF has ${totalPages} pages.`;
      }
    }
  }

  return null;
}

/**
 * POST /api/ai-tools/parse
 * Parse a natural language command into a structured JSON action.
 */
export async function parseCommand(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const validationResult = parseCommandSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.flatten(),
      });
    }

    const { command, totalPages } = validationResult.data;

    // Use rule-based parser first, fall back to OpenAI
    let parsed = ruleBasedParse(command, totalPages);

    if (!parsed) {
      try {
        parsed = await parseAICommand(command, totalPages);
      } catch (err: any) {
        // If OpenAI fails, return 500
        console.error("AI Parser failed:", err);
        return res.status(500).json({
          error: "AI parsing unavailable, using basic mode",
          details: err.message,
        });
      }
    }

    // Check constraints
    const constraintError = validateCommandConstraints(parsed, totalPages);
    if (constraintError) {
      return res.status(400).json({ error: constraintError });
    }

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error("parseCommand Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

/**
 * POST /api/ai-tools/execute
 * Upload files and enqueue an AI-PDF job.
 */
export async function executeCommand(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const user = req.user;

    // Enforce authentication in production environment
    if (!user && process.env.NODE_ENV === "production") {
      return res.status(401).json({
        error: "Authentication required",
        message: "Please log in to execute AI commands.",
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = files?.["file"]?.[0];

    if (!file) {
      return res.status(400).json({ error: "Please upload a PDF file" });
    }

    // Enforce PDF format validation
    if (
      file.mimetype !== "application/pdf" &&
      !file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      return res.status(400).json({ error: "Please upload a PDF file" });
    }

    const rawCommand = req.body.command as string | undefined;
    const parsedCommandRaw = req.body.parsedCommand as string | undefined;

    let parsedCommand: ParsedCommand | undefined;
    if (parsedCommandRaw) {
      try {
        parsedCommand = JSON.parse(parsedCommandRaw) as ParsedCommand;
      } catch {
        return res.status(400).json({ error: "Invalid parsedCommand JSON format" });
      }
    }

    // Load PDF to determine total pages and encrypt status
    let totalPages = 0;
    let isEncrypted = false;

    try {
      const pdfDoc = await PDFDocument.load(file.buffer);
      totalPages = pdfDoc.getPageCount();
    } catch (err) {
      isEncrypted = true;
    }

    // If only raw command is given, parse it on the fly
    if (!parsedCommand && rawCommand) {
      let parsed = ruleBasedParse(rawCommand, isEncrypted ? 1 : totalPages);
      if (!parsed) {
        try {
          parsed = await parseAICommand(rawCommand, isEncrypted ? 1 : totalPages);
        } catch (err: any) {
          return res.status(400).json({
            error: "Failed to parse command. AI parsing is unavailable.",
            details: err.message,
          });
        }
      }
      parsedCommand = parsed;
    }

    if (!parsedCommand) {
      return res.status(400).json({
        error: "Either a valid command or parsedCommand must be provided.",
      });
    }

    // Check encryption constraint
    if (isEncrypted && parsedCommand.action !== "decrypt") {
      return res.status(400).json({
        error: "This PDF is password protected. Use Decrypt PDF tool first.",
      });
    }

    // Check page constraints if not encrypted
    if (!isEncrypted) {
      const constraintError = validateCommandConstraints(parsedCommand, totalPages);
      if (constraintError) {
        return res.status(400).json({ error: constraintError });
      }
    }

    const userId = user ? String(user._id) : `guest_${(req.ip || "unknown").replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const userPlan = user ? user.plan : "free";

    // Guest usage limit (only 3 jobs per hour)
    if (!user) {
      const guestKey = `guest_${userId}`;
      let guestJobCount = 0;

      if (SKIP_DB) {
        guestJobCount = guestJobTracker.get(guestKey) ?? 0;
      } else {
        try {
          guestJobCount = await prisma.job.count({
            where: {
              userId: userId,
              createdAt: {
                gte: new Date(Date.now() - 60 * 60 * 1000), // last hour
              },
            },
          });
        } catch (dbErr) {
          console.warn("Prisma count failed, falling back to in-memory rate limit:", dbErr);
          guestJobCount = guestJobTracker.get(guestKey) ?? 0;
        }
      }

      if (guestJobCount >= 3) {
        return res.status(429).json({
          error: "Guest limit reached",
          message: "You have reached the guest limit of 3 jobs per hour. Sign up free to process unlimited files.",
          signupUrl: "/signup",
        });
      }

      // Update in-memory tracker
      guestJobTracker.set(guestKey, guestJobCount + 1);
      setTimeout(() => guestJobTracker.delete(guestKey), 60 * 60 * 1000);
    }

    // Save main file to storage
    const mainUpload = await saveUpload(file.buffer, file.originalname);

    // Save additional files if present
    const additionalFiles = files?.["additionalFiles"] || [];
    const additionalKeys: string[] = [];
    for (const addFile of additionalFiles) {
      const uploadRes = await saveUpload(addFile.buffer, addFile.originalname);
      additionalKeys.push(uploadRes.key);
    }

    const jobId = uuidv4();
    const toolSlug = "ai-pdf";

    const jobRecord = {
      id: jobId,
      userId: userId,
      toolSlug,
      status: "queued",
      progress: 0,
      inputKeys: [mainUpload.key],
      logs: [`Job submitted via AI Tools API: ${parsedCommand.explanation}`],
      fileName: file.originalname,
      createdAt: new Date(),
    };

    let savedToDb = false;
    if (!SKIP_DB) {
      try {
        await prisma.job.create({
          data: {
            id: jobId,
            userId: userId,
            toolSlug,
            status: "queued",
            progress: 0,
            inputKeys: [mainUpload.key],
            logs: [`Job submitted via AI Tools API: ${parsedCommand.explanation}`],
            fileName: file.originalname,
          },
        });
        savedToDb = true;
      } catch (dbErr) {
        console.warn("Failed to create job in Prisma, falling back to in-memory store:", dbErr);
      }
    }

    if (!savedToDb) {
      memoryJobs.set(jobId, jobRecord);
    }

    // Enqueue job in BullMQ
    let queued = false;
    if (!SKIP_DB) {
      try {
        const queueResult = await addJobToQueue({
          jobId,
          toolSlug,
          inputKeys: [mainUpload.key],
          additionalKeys,
          aiCommand: rawCommand,
          parsedAiCommand: parsedCommand,
          options: {
            _fileNames: [
              file.originalname,
              ...additionalFiles.map((f) => f.originalname),
            ],
            plan: userPlan,
          },
        });
        queued = !!queueResult;
      } catch (queueErr) {
        console.warn("Failed to queue job via BullMQ, falling back to in-process execution:", queueErr);
      }
    }

    if (!queued) {
      // If SKIP_DB is true, or Prisma/BullMQ is down, process the job in-process synchronously in a background promise.
      // This enables complete standalone execution in local dev with zero Docker/Postgres/Redis dependencies!
      (async () => {
        try {
          const currentJob = memoryJobs.get(jobId) || jobRecord;
          currentJob.status = "processing";
          currentJob.progress = 30;
          memoryJobs.set(jobId, currentJob);

          // Dynamic import of compiled worker handler to run in-process.
          // Must point to the compiled dist/ JS, not the .ts source.
          const workerPath = "../../../../worker/dist/handlers/aiPdf.js";
          const { executeAICommand } = await import(workerPath) as any;

          currentJob.progress = 60;
          memoryJobs.set(jobId, currentJob);

          const additionalBuffers = (files?.["additionalFiles"] || []).map((f) => f.buffer);
          const result = await executeAICommand(file.buffer, parsedCommand!, additionalBuffers);

          // Upload the processed PDF to storage
          const uploadRes = await saveUpload(result.buffer, result.fileName);

          currentJob.status = "completed";
          currentJob.progress = 100;
          currentJob.outputKey = uploadRes.key;
          currentJob.fileName = result.fileName;
          currentJob.mimeType = result.mimeType;
          memoryJobs.set(jobId, currentJob);
        } catch (execErr: any) {
          console.error("In-process PDF execution failed:", execErr);
          const currentJob = memoryJobs.get(jobId) || jobRecord;
          currentJob.status = "failed";
          currentJob.error = execErr.message || "Internal processing error";
          memoryJobs.set(jobId, currentJob);
        }
      })();
    }

    return res.status(202).json({ jobId });
  } catch (err: any) {
    console.error("executeCommand Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

/**
 * GET /api/ai-tools/jobs/:jobId
 * Returns the job status and final download URL.
 */
export async function getJob(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const user = req.user;
    const { jobId } = req.params;

    let job = memoryJobs.get(jobId);
    if (!job) {
      try {
        job = await prisma.job.findUnique({
          where: { id: jobId },
        });
      } catch (dbErr) {
        console.warn("Failed to find job via Prisma:", dbErr);
      }
    }

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const expectedUserId = user ? String(user._id) : `guest_${(req.ip || "unknown").replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    if (job.userId !== expectedUserId) {
      return res.status(403).json({
        error: "Access forbidden. This job does not belong to you.",
      });
    }

    let downloadUrl: string | null = null;
    if (job.status === "completed" && job.outputKey) {
      downloadUrl = await getSignedUrl(job.outputKey);
    }

    return res.status(200).json({
      id: job.id,
      toolSlug: job.toolSlug,
      status: job.status,
      progress: job.progress,
      error: job.error,
      fileName: job.fileName,
      mimeType: job.mimeType,
      downloadUrl,
    });
  } catch (err: any) {
    console.error("getJob Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
