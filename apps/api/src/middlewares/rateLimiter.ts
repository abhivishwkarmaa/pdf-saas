import rateLimit from "express-rate-limit";

/**
 * Rate limiter specifically for newsletter subscription requests.
 * Limits IP to 5 subscription requests per 15 minutes.
 */
export const subscribeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many subscription requests from this IP. Please try again after 15 minutes.",
  },
});
