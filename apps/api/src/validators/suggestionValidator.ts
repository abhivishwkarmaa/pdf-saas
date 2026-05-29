import { body } from "express-validator";

const ALLOWED_CATEGORIES = [
  "New Tool Request",
  "UI Improvement",
  "Bug Report",
  "AI Feature Suggestion",
  "Performance Issue",
  "General Feedback",
];

export const validateSuggestion = [
  body("name")
    .exists()
    .withMessage("Name is required")
    .notEmpty()
    .withMessage("Name cannot be empty")
    .trim()
    .escape(),
  body("email")
    .exists()
    .withMessage("Email address is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .trim(),
  body("suggestion")
    .exists()
    .withMessage("Suggestion is required")
    .notEmpty()
    .withMessage("Suggestion cannot be empty")
    .trim()
    .escape(),
  body("category")
    .exists()
    .withMessage("Category is required")
    .isIn(ALLOWED_CATEGORIES)
    .withMessage(`Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`),
];
