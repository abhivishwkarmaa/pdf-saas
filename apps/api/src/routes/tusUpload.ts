import { Router } from "express";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { saveUpload } from "@pdf-saas/storage";
import { prisma } from "../config/prisma";
import { addJobToQueue } from "../config/queue";
import { User } from "../models/User";

const router = Router();

const uploadDir = path.join(os.tmpdir(), "tus-uploads");
// Ensure directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

const tusServer = new Server({
  path: "/upload/tus",
  datastore: new FileStore({
    directory: uploadDir,
  }),
});

// Listen for upload completion to save the buffer and queue the BullMQ task
tusServer.on("upload-complete", async (event) => {
  const fileId = event.file.id;
  const filePath = path.join(uploadDir, fileId);
  const metadata = event.file.metadata || {};

  const originalName = metadata.filename || "upload.mp4";
  const userId = metadata.userId;
  const jobId = metadata.jobId || uuidv4();
  const optionsRaw = metadata.options || "{}";

  try {
    const fileBuffer = await fs.readFile(filePath);
    const saved = await saveUpload(fileBuffer, originalName);

    // Clean up temporary tus chunks
    await fs.unlink(filePath).catch(() => {});

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        // Increment conversions count
        await User.findByIdAndUpdate(userId, { $inc: { dailyConversions: 1 } });

        let options: Record<string, any> = {};
        try {
          options = JSON.parse(optionsRaw);
        } catch {}

        const toolSlug = options.task === "slideshow" ? "video-converter" : (options.toolSlug || "video-converter");

        options._fileNames = [originalName];
        options.plan = user.plan;

        // Create database record
        await prisma.job.create({
          data: {
            id: jobId,
            userId,
            toolSlug,
            status: "queued",
            progress: 0,
            inputKeys: [saved.key],
            logs: ["Job submitted via Tus chunked upload completion"],
          },
        });

        // Emit to background worker
        await addJobToQueue({
          jobId,
          toolSlug,
          inputKeys: [saved.key],
          options,
        });

        console.log(`[Tus Upload] Successfully queued job ${jobId} for user ${userId}.`);
      }
    }
  } catch (err) {
    console.error("[Tus Upload] Failed to process completed upload:", err);
  }
});

// Forward all requests matching /upload/tus to Tus server
router.all("*", (req, res) => {
  tusServer.handle(req, res);
});

export default router;
