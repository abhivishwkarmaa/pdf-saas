import { body } from "express-validator";

export const validateContact = [
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
  body("subject")
    .exists()
    .withMessage("Subject is required")
    .notEmpty()
    .withMessage("Subject cannot be empty")
    .trim()
    .escape(),
  body("message")
    .exists()
    .withMessage("Message is required")
    .notEmpty()
    .withMessage("Message cannot be empty")
    .trim()
    .escape(),
];
