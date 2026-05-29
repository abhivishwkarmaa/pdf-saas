import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Middleware to protect admin-only routes via JWT authentication
 */
export const adminAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = "";

    // Check for Authorization header (Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access denied. No authentication token provided.",
      });
      return;
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || "super_secret_jwt_key_change_me_in_production";
    const decoded = jwt.verify(token, jwtSecret) as { id: string };

    // Find the user associated with this token
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
      return;
    }

    // Enforce admin/developer role
    if (user.role !== "admin" && user.role !== "developer") {
      res.status(403).json({
        success: false,
        message: "Access forbidden. Administrative privileges required.",
      });
      return;
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification error:", error);
    res.status(401).json({
      success: false,
      message: "Session expired or invalid token. Please log in again.",
    });
  }
};
