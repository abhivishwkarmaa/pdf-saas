import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { User } from "../models/User";

export const planLimiter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  // Check limits: Free=10, Pro=unlimited
  if (user.plan === "free" && user.dailyConversions >= 10) {
    res.status(429).json({
      error: "Daily limit reached",
      limit: 10,
      upgradeUrl: "/pricing"
    });
    return;
  }

  next();
};

/**
 * Resets dailyConversions to 0 for all users at midnight UTC
 */
export function startDailyLimitResetScheduler() {
  const reset = async () => {
    try {
      await User.updateMany({}, { $set: { dailyConversions: 0 } });
      console.log("[Scheduler] Reset daily conversions count for all users.");
    } catch (err) {
      console.error("[Scheduler] Failed to reset daily conversions:", err);
    }
  };

  const scheduleNextReset = () => {
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    const delay = nextMidnight.getTime() - now.getTime();
    
    setTimeout(() => {
      reset();
      setInterval(reset, 24 * 60 * 60 * 1000);
    }, delay);
  };

  scheduleNextReset();
}
