import { Router } from "express";
import { submitSuggestion } from "../controllers/suggestionController";
import { validateSuggestion } from "../validators/suggestionValidator";
import { handleValidationErrors } from "../validators/newsletterValidator";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

/**
 * @route   POST /api/suggestions
 * @desc    Submit a feature suggestion or feedback
 * @access  Public
 */
router.post(
  "/",
  validateSuggestion,
  handleValidationErrors,
  asyncHandler(submitSuggestion)
);

export default router;
