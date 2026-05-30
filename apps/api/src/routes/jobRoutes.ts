import { Router, Response } from "express";
import multer from "multer";
import archiver from "archiver";
import { v4 as uuidv4 } from "uuid";
import { auth, AuthenticatedRequest } from "../middlewares/auth";
import { planLimiter } from "../middlewares/planLimiter";
import { prisma } from "../config/prisma";
import { addJobToQueue } from "../config/queue";
import { saveUpload, deleteObject, getSignedUrl, getObjectBuffer } from "@pdf-saas/storage";
import { VideoOptionsSchema, ValidationError, AuthError } from "@pdf-saas/shared";
import { User } from "../models/User";

const router = Router();

// Setup Multer for memory storage with file size validation limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

const uploadFields = upload.fields([
  { name: "files", maxCount: 10 },
  { name: "audio_file", maxCount: 1 },
]);

/**
 * @route   POST /api/jobs
 * @desc    Submit conversion job
 * @access  Protected (User)
 */
router.post(
  "/",
  auth,
  planLimiter,
  (req, res, next) => {
    uploadFields(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large (limit 500MB)" });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const mediaFiles = files?.["files"] || [];

      if (mediaFiles.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      // Check file size manually to be extra safe
      for (const file of mediaFiles) {
        if (file.size > 500 * 1024 * 1024) {
          return res.status(413).json({ error: "File too large (limit 500MB)" });
        }
      }

      // Parse options
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

      // Validate VideoOptions schema
      const toolSlug = options.task === "slideshow" ? "video-converter" : (options.toolSlug || "video-converter");
      if (toolSlug === "video-converter") {
        try {
          VideoOptionsSchema.parse(options);
        } catch (err: any) {
          return res.status(400).json({
            error: "Invalid video options",
            details: err.errors || err.message,
          });
        }
      }

      // Pro Plan Gates check
      const isPro = user.plan === "pro";
      const hasWatermark = !!options.watermarkText;
      const hasAiCaptions = !!options.aiCaptions;
      const hasAiUpscale = !!options.aiUpscale;
      const isBatch = mediaFiles.length > 1;

      if (!isPro) {
        if (hasWatermark || hasAiCaptions || hasAiUpscale || isBatch) {
          let reason = "This action requires a Pro subscription.";
          if (hasWatermark) reason = "Watermark customization is a Pro feature.";
          if (hasAiCaptions) reason = "AI captions is a Pro feature.";
          if (hasAiUpscale) reason = "AI Video upscaling is a Pro feature.";
          if (isBatch) reason = "Batch conversions are limited to Pro subscribers.";

          return res.status(403).json({
            error: "Premium feature locked",
            message: reason,
            upgradeUrl: "/pricing"
          });
        }
      }

      // Increment User dailyConversions count
      await User.findByIdAndUpdate(user._id, { $inc: { dailyConversions: 1 } });

      // Save files to storage
      const uploadResults = await Promise.all(
        mediaFiles.map((f) => saveUpload(f.buffer, f.originalname))
      );
      const inputKeys = uploadResults.map((r) => r.key);
      const jobId = uuidv4();

      // Audio file handling
      const audioFiles = files?.["audio_file"] || [];
      if (audioFiles.length > 0) {
        const audioFile = audioFiles[0];
        const audioResult = await saveUpload(audioFile.buffer, audioFile.originalname);
        options.audioKey = audioResult.key;
      }

      options._fileNames = mediaFiles.map((f) => f.originalname);
      options.plan = user.plan; // Pass user's plan to worker

      // Create Prisma Job
      const job = await prisma.job.create({
        data: {
          id: jobId,
          userId: String(user._id),
          toolSlug,
          status: "queued",
          progress: 0,
          inputKeys,
          logs: ["Job received and queued via Express API"],
        },
      });

      // Submit to BullMQ
      const queued = await addJobToQueue({
        jobId,
        toolSlug,
        inputKeys,
        options,
      });

      if (!queued) {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "failed", error: "Failed to queue job in Redis" },
        });
        return res.status(500).json({ error: "Failed to queue job in Redis" });
      }

      return res.status(202).json({ jobId, status: "queued" });
    } catch (err: any) {
      console.error("Job submit error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  }
);

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs for logged-in user
 * @access  Protected (User)
 */
router.get("/", auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: String(user._id),
    };

    if (status && status !== "all") {
      whereClause.status = status;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.job.count({
        where: whereClause,
      }),
    ]);

    // Attach download & thumbnail URLs
    const formattedJobs = await Promise.all(
      jobs.map(async (job) => {
        let downloadUrl = null;
        if (job.status === "completed" && job.outputKey) {
          downloadUrl = await getSignedUrl(job.outputKey);
        }
        let thumbnailUrl = null;
        if (job.thumbnailKey) {
          thumbnailUrl = await getSignedUrl(job.thumbnailKey);
        }
        return {
          ...job,
          downloadUrl,
          thumbnailUrl,
        };
      })
    );

    return res.status(200).json({
      jobs: formattedJobs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job by ID
 * @access  Protected (User)
 */
router.get("/:id", auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.userId !== String(user._id)) {
      throw new AuthError("Access forbidden. This job does not belong to you.", 403, "Access forbidden", "FORBIDDEN");
    }

    let downloadUrl: string | null = null;
    if (job.status === "completed" && job.outputKey) {
      downloadUrl = await getSignedUrl(job.outputKey);
    }

    let downloadUrls: { name: string; url: string }[] = [];
    if (job.status === "completed" && job.outputKeys && job.outputKeys.length > 0) {
      downloadUrls = await Promise.all(
        job.outputKeys.map(async (key: string) => {
          const parts = key.split("/");
          const name = parts[parts.length - 1];
          const url = await getSignedUrl(key);
          return { name, url };
        })
      );
    }

    return res.status(200).json({
      ...job,
      downloadUrl,
      downloadUrls,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.userMessage || err.message });
  }
});

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete single job and its files
 * @access  Protected (User)
 */
router.delete("/:id", auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.userId !== String(user._id)) {
      throw new AuthError("Access forbidden. This job does not belong to you.", 403, "Access forbidden", "FORBIDDEN");
    }

    // Delete output files from storage
    if (job.outputKey) {
      await deleteObject(job.outputKey);
    }
    if (job.outputKeys && job.outputKeys.length > 0) {
      await Promise.all(job.outputKeys.map(deleteObject));
    }
    if (job.thumbnailKey) {
      await deleteObject(job.thumbnailKey);
    }

    // Delete job record
    await prisma.job.delete({
      where: { id },
    });

    return res.status(200).json({ success: true, message: "Job deleted successfully" });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.userMessage || err.message });
  }
});

/**
 * @route   POST /api/jobs/:id/share
 * @desc    Generate shareable link for a job
 * @access  Protected (User)
 */
router.post("/:id/share", auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.userId !== String(user._id)) {
      throw new AuthError("Access forbidden. This job does not belong to you.", 403, "Access forbidden", "FORBIDDEN");
    }

    if (job.status !== "completed") {
      return res.status(400).json({ error: "Job is not completed yet" });
    }

    // Check if share token already exists
    let shareToken = await prisma.shareToken.findUnique({
      where: { jobId: id },
    });

    if (!shareToken) {
      shareToken = await prisma.shareToken.create({
        data: {
          jobId: id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
          maxDownloads: 10,
        },
      });
    }

    const appUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const shareUrl = `${appUrl}/share/${shareToken.token}`;

    return res.status(200).json({ shareUrl, token: shareToken.token });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.userMessage || err.message });
  }
});

/**
 * @route   POST /api/jobs/batch
 * @desc    Submit batch of conversion jobs
 * @access  Protected (User)
 */
router.post(
  "/batch",
  auth,
  planLimiter,
  (req, res, next) => {
    uploadFields(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large (limit 500MB)" });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const mediaFiles = files?.["files"] || [];

      if (mediaFiles.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      // Check Pro limit
      if (user.plan !== "pro") {
        return res.status(403).json({
          error: "Premium feature locked",
          message: "Batch conversions are limited to Pro subscribers.",
          upgradeUrl: "/pricing"
        });
      }

      // Parse options
      let options: Record<string, any> = {};
      const optionsRaw = req.body.options;
      if (typeof optionsRaw === "string" && optionsRaw) {
        try {
          options = JSON.parse(optionsRaw);
        } catch {}
      } else if (req.body.options && typeof req.body.options === "object") {
        options = req.body.options;
      }

      const batchId = uuidv4();
      const jobIds: string[] = [];

      for (const file of mediaFiles) {
        if (file.size > 500 * 1024 * 1024) {
          return res.status(413).json({ error: `File ${file.originalname} exceeds 500MB limit` });
        }

        const saved = await saveUpload(file.buffer, file.originalname);
        const jobId = uuidv4();
        
        const fileOptions = {
          ...options,
          _fileNames: [file.originalname],
          plan: user.plan,
        };

        const toolSlug = options.task === "slideshow" ? "video-converter" : (options.toolSlug || "video-converter");

        await prisma.job.create({
          data: {
            id: jobId,
            userId: String(user._id),
            batchId,
            toolSlug,
            status: "queued",
            progress: 0,
            inputKeys: [saved.key],
            logs: ["Job submitted via Batch API"],
          },
        });

        await addJobToQueue({
          jobId,
          toolSlug,
          inputKeys: [saved.key],
          options: fileOptions,
        });

        // Increment daily conversions per file in the batch
        await User.findByIdAndUpdate(user._id, { $inc: { dailyConversions: 1 } });
        jobIds.push(jobId);
      }

      return res.status(202).json({ batchId, jobIds });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  }
);

/**
 * @route   GET /api/jobs/batch/:batchId/zip
 * @desc    Download all completed jobs in a batch as a ZIP
 * @access  Protected (User)
 */
router.get("/batch/:batchId/zip", auth, async (req: AuthenticatedRequest, res: Response) => {
  const { batchId } = req.params;
  const user = req.user!;

  try {
    const jobs = await prisma.job.findMany({
      where: {
        batchId,
        userId: String(user._id),
        status: "completed",
      },
    });

    if (jobs.length === 0) {
      return res.status(404).json({ error: "No completed jobs found for this batch" });
    }

    const archive = archiver("zip", { zlib: { level: 9 } });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="batch_${batchId}.zip"`);

    archive.pipe(res);

    for (const job of jobs) {
      if (job.outputKey && job.fileName) {
        try {
          const buffer = await getObjectBuffer(job.outputKey);
          archive.append(buffer, { name: job.fileName });
        } catch (err) {
          console.error(`Failed to append ${job.fileName} to zip:`, err);
        }
      }
    }

    await archive.finalize();
  } catch (err: any) {
    console.error("Batch zip streaming failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
