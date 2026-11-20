import { Router } from "express";
import { submitFeedback } from "../controllers/feedbackController";
import { validateFeedback } from "../validators/feedbackValidator";
import { handleValidationErrors } from "../validators/newsletterValidator";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

/**
 * @route   POST /api/feedback
 * @desc    Submit user feedback/bug report/suggestion (public)
 * @access  Public
 */
router.post(
  "/",
  validateFeedback,
  handleValidationErrors,
  asyncHandler(submitFeedback)
);

export default router;
