import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/prisma";
import { User } from "../models/User";
import { addJobToQueue } from "../config/queue";
import { saveUpload, getSignedUrl } from "@pdf-saas/storage";
import { VideoOptionsSchema } from "@pdf-saas/shared";
import { auth, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

export interface ApiRequest extends Request {
  user?: any;
  apiKeyId?: string;
}

// API Key authentication and daily rate limit check middleware
export const apiKeyAuth = async (
  req: ApiRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const key = req.headers["x-api-key"] as string;
  if (!key) {
    res.status(401).json({ error: "Missing X-API-Key header" });
    return;
  }

  try {
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key, active: true },
    });

    if (!apiKeyRecord) {
      res.status(401).json({ error: "Invalid or inactive API key" });
      return;
    }

    const now = new Date();
    const lastUsed = apiKeyRecord.lastUsed;
    const isSameDay = lastUsed &&
      lastUsed.getUTCDate() === now.getUTCDate() &&
      lastUsed.getUTCMonth() === now.getUTCMonth() &&
      lastUsed.getUTCFullYear() === now.getUTCFullYear();

    let requests = apiKeyRecord.requests;
    if (!isSameDay) {
      requests = 0; // reset for a new day
    }

    if (requests >= apiKeyRecord.rateLimit) {
      res.status(429).json({ error: "API Key daily limit reached", limit: apiKeyRecord.rateLimit });
      return;
    }

    // Update last used time and request count
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsed: now,
        requests: requests + 1,
      },
    });

    const user = await User.findById(apiKeyRecord.userId);
    if (!user) {
      res.status(404).json({ error: "API key owner not found" });
      return;
    }

    // Check Pro plan requirement for API access
    if (user.plan !== "pro") {
      res.status(403).json({ error: "API access requires a Pro subscription", upgradeUrl: "/pricing" });
      return;
    }

    req.user = user;
    req.apiKeyId = apiKeyRecord.id;
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Authentication error" });
  }
};

/**
 * @route   POST /api/v1/convert
 * @desc    Submit conversion job via Developer API
 * @access  Public (API Key auth)
 */
router.post(
  "/convert",
  apiKeyAuth,
  upload.single("file"),
  async (req: ApiRequest, res: Response) => {
    try {
      const user = req.user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file provided. Use form field 'file'." });
      }

      let options: Record<string, any> = {};
      const optionsRaw = req.body.options;
      if (typeof optionsRaw === "string" && optionsRaw) {
        try {
          options = JSON.parse(optionsRaw);
        } catch {
          return res.status(400).json({ error: "Invalid options JSON string" });
        }
      } else if (req.body.options && typeof req.body.options === "object") {
        options = req.body.options;
      }

      const toolSlug = options.task === "slideshow" ? "video-converter" : (options.toolSlug || "video-converter");
      if (toolSlug === "video-converter") {
        try {
          VideoOptionsSchema.parse(options);
        } catch (err: any) {
          return res.status(400).json({ error: "Invalid video options", details: err.errors });
        }
      }

      // Save file to storage
      const saved = await saveUpload(file.buffer, file.originalname);
      const jobId = uuidv4();

      options._fileNames = [file.originalname];
      options.plan = user.plan;

      // Create database Job record
      await prisma.job.create({
        data: {
          id: jobId,
          userId: String(user._id),
          toolSlug,
          status: "queued",
          progress: 0,
          inputKeys: [saved.key],
          logs: ["Job submitted via developer API key"],
        },
      });

      // Submit to BullMQ
      const queued = await addJobToQueue({
        jobId,
        toolSlug,
        inputKeys: [saved.key],
        options,
      });

      if (!queued) {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "failed", error: "Failed to queue job in Redis" },
        });
        return res.status(500).json({ error: "Failed to queue job in Redis" });
      }

      const appUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const pollingUrl = `${appUrl}/api/v1/jobs/${jobId}`;

      return res.status(202).json({
        jobId,
        status: "queued",
        pollingUrl,
      });
    } catch (err: any) {
      console.error("Developer API submission failure:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  }
);

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get job status and download link via Developer API
 * @access  Public (API Key auth)
 */
router.get("/jobs/:id", apiKeyAuth, async (req: ApiRequest, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.userId !== String(user._id)) {
      return res.status(403).json({ error: "Access forbidden. This job does not belong to you." });
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
      speed: job.speed,
      eta: job.eta,
      error: job.error,
      fileName: job.fileName,
      mimeType: job.mimeType,
      downloadUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

/**
 * @route   GET /api/v1/keys
 * @desc    Get all developer API keys for the authenticated user
 * @access  Protected (User)
 */
router.get("/keys/list", auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const keys = await prisma.apiKey.findMany({
      where: { userId: String(user._id) },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ keys });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/v1/keys
 * @desc    Create a new developer API key
 * @access  Protected (User)
 */
router.post("/keys/create", auth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, rateLimit } = req.body;
  const user = req.user!;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const key = `ch_${crypto.randomBytes(24).toString("hex")}`;
    const newKey = await prisma.apiKey.create({
      data: {
        userId: String(user._id),
        key,
        name,
        rateLimit: rateLimit ? parseInt(rateLimit, 10) : 100,
      },
    });

    return res.status(201).json({ key: newKey });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/v1/keys/:id
 * @desc    Revoke/Delete a developer API key
 * @access  Protected (User)
 */
router.delete("/keys/:id", auth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey || apiKey.userId !== String(user._id)) {
      return res.status(404).json({ error: "API key not found" });
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return res.status(200).json({ success: true, message: "API key revoked successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
