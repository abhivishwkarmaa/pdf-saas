import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";
import { AuthError } from "@pdf-saas/shared";

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const auth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = "";

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new AuthError("Access denied. No authentication token provided.", 401, "No auth token provided", "MISSING_TOKEN");
    }

    const jwtSecret = process.env.JWT_SECRET || "super_secret_jwt_key_change_me_in_production";
    const decoded = jwt.verify(token, jwtSecret) as { id: string };

    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AuthError("Invalid token. User not found.", 401, "User not found", "USER_NOT_FOUND");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AuthError) {
      next(error);
    } else {
      next(new AuthError("Session expired or invalid token. Please log in again.", 401, "Session expired or invalid token", "INVALID_TOKEN"));
    }
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = "";

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const jwtSecret = process.env.JWT_SECRET || "super_secret_jwt_key_change_me_in_production";
      const decoded = jwt.verify(token, jwtSecret) as { id: string };
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // If the token is invalid or expired, proceed without attaching user (guest mode)
    next();
  }
};
