import { Router } from "express";
import { login, register } from "../controllers/authController";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return token
 * @access  Public
 */
router.post("/login", asyncHandler(login));

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post("/register", asyncHandler(register));

export default router;
