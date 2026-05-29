import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

/**
 * Validation rules for the newsletter subscription
 */
export const validateSubscribe = [
  body("email")
    .exists()
    .withMessage("Email address is required")
    .notEmpty()
    .withMessage("Email address cannot be empty")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail({
      gmail_remove_dots: false, // Keep dots in Gmail as people use them for tagging
      gmail_remove_subaddress: false, // Keep subaddressing (+tag) as it might be desired
    })
    .trim(),
  body("source")
    .optional()
    .isString()
    .withMessage("Source must be a string")
    .escape()
    .trim(),
];

/**
 * Middleware to intercept validation errors and return structured 400 response
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: errors.array()[0].msg, // Return the first error message to keep it simple and clean
      errors: errors.array(),
    });
    return;
  }
  next();
};
