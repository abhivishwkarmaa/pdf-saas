import { Router } from "express";
import { login } from "../controllers/authController";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin/developer and return token
 * @access  Public
 */
router.post("/login", asyncHandler(login));

export default router;
