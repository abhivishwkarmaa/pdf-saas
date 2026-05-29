import { Router } from "express";
import { adminAuth } from "../middlewares/adminAuth";
import {
  submitFeedback,
  getFeedbackStats,
  getFeedbackList,
  updateFeedback,
  replyFeedback,
  resendConfirmation,
} from "../controllers/feedbackController";
import { validateFeedback } from "../validators/feedbackValidator";
import { handleValidationErrors } from "../validators/newsletterValidator";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

/**
 * @route   POST /api/feedback
 * @desc    Submit user feedback/bug report/suggestion (public)
 * @access  Public
 */
router.post("/", validateFeedback, handleValidationErrors, asyncHandler(submitFeedback));

// --- Admin Section (JWT-Protected) ---
router.use(adminAuth);

/**
 * @route   GET /api/feedback/admin/stats
 * @desc    Get metrics tallies for dashboard
 * @access  Private (Admin/Dev)
 */
router.get("/admin/stats", asyncHandler(getFeedbackStats));

/**
 * @route   GET /api/feedback/admin
 * @desc    Get feedback backlog with search, filters and pagination
 * @access  Private (Admin/Dev)
 */
router.get("/admin", asyncHandler(getFeedbackList));

/**
 * @route   PUT /api/feedback/admin/:id
 * @desc    Update priorities, assignee developers, notes, status
 * @access  Private (Admin/Dev)
 */
router.put("/admin/:id", asyncHandler(updateFeedback));

/**
 * @route   POST /api/feedback/admin/reply
 * @desc    Send support answer thread back to user
 * @access  Private (Admin/Dev)
 */
router.post("/admin/reply", asyncHandler(replyFeedback));

/**
 * @route   POST /api/feedback/admin/:id/resend-confirmation
 * @desc    Trigger auto-reply email dispatcher resend manually
 * @access  Private (Admin/Dev)
 */
router.post("/admin/:id/resend-confirmation", asyncHandler(resendConfirmation));

export default router;
