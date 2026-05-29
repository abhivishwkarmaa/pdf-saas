import { body } from "express-validator";

const ALLOWED_CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "UI/UX Suggestion",
  "Performance Issue",
  "AI Tool Suggestion",
  "Video Tool Feedback",
  "Image Tool Feedback",
  "General Feedback",
];

export const validateFeedback = [
  body("userName")
    .exists()
    .withMessage("Name is required")
    .notEmpty()
    .withMessage("Name cannot be empty")
    .trim()
    .escape(),
  body("userEmail")
    .exists()
    .withMessage("Email address is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .trim(),
  body("category")
    .exists()
    .withMessage("Category is required")
    .isIn(ALLOWED_CATEGORIES)
    .withMessage(`Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`),
  body("title")
    .exists()
    .withMessage("Title is required")
    .notEmpty()
    .withMessage("Title cannot be empty")
    .trim()
    .escape(),
  body("message")
    .exists()
    .withMessage("Message is required")
    .notEmpty()
    .withMessage("Message cannot be empty")
    .trim()
    .escape(),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Priority must be: low, medium, high, or critical"),
];
