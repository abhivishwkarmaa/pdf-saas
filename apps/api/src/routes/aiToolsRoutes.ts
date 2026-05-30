import { Router } from "express";
import multer from "multer";
import { optionalAuth } from "../middlewares/auth";
import {
  parseCommand,
  executeCommand,
  getJob,
} from "../controllers/aiToolsController";

const router = Router();

// Configure Multer memory storage with 500MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

const uploadFields = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "additionalFiles", maxCount: 10 },
]);

router.post("/parse", optionalAuth, parseCommand);
router.post("/execute", optionalAuth, uploadFields, executeCommand);
router.get("/jobs/:jobId", optionalAuth, getJob);

export default router;
