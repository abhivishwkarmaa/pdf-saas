import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

/**
 * Admin/User Login controller
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "Please provide email and password.",
    });
    return;
  }

  try {
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || "super_secret_jwt_key_change_me_in_production";
    const token = jwt.sign({ id: user._id }, jwtSecret, {
      expiresIn: "1d",
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (error: any) {
    console.error("Login controller error:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred during login.",
    });
  }
};

/**
 * User Registration controller
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({
      success: false,
      message: "Please provide name, email, and password.",
    });
    return;
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "A user with this email already exists.",
      });
      return;
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: "user",
      plan: "free",
    });

    await user.save();

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || "super_secret_jwt_key_change_me_in_production";
    const token = jwt.sign({ id: user._id }, jwtSecret, {
      expiresIn: "1d",
    });

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (error: any) {
    console.error("Register controller error:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred during registration.",
    });
  }
};
