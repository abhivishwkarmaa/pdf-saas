import { Router } from "express";
import { subscribe, verify, unsubscribe } from "../controllers/newsletterController";
import { validateSubscribe, handleValidationErrors } from "../validators/newsletterValidator";
import { subscribeRateLimiter } from "../middlewares/rateLimiter";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

/**
 * @route   POST /api/newsletter/subscribe
 * @desc    Subscribe to the ConvertHub newsletter
 * @access  Public
 */
router.post(
  "/subscribe",
  subscribeRateLimiter,
  validateSubscribe,
  handleValidationErrors,
  asyncHandler(subscribe)
);

/**
 * @route   GET /api/newsletter/verify
 * @desc    Verify newsletter subscription via double opt-in link
 * @access  Public
 */
router.get("/verify", asyncHandler(verify));

/**
 * @route   GET /api/newsletter/unsubscribe
 * @desc    Unsubscribe from the ConvertHub newsletter
 * @access  Public
 */
router.get("/unsubscribe", asyncHandler(unsubscribe));

export default router;
