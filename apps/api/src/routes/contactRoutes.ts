import { Router } from "express";
import { submitContact } from "../controllers/contactController";
import { validateContact } from "../validators/contactValidator";
import { handleValidationErrors } from "../validators/newsletterValidator";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

/**
 * @route   POST /api/contact
 * @desc    Submit a contact/support message
 * @access  Public
 */
router.post(
  "/",
  validateContact,
  handleValidationErrors,
  asyncHandler(submitContact)
);

export default router;
