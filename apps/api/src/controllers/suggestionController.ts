import { Request, Response } from "express";
import { Suggestion } from "../models/Suggestion";
import { sendSuggestionConfirmationEmail } from "../services/emailService";

/**
 * Handle new user feature suggestion/feedback
 * POST /api/suggestions
 */
export const submitSuggestion = async (req: Request, res: Response): Promise<void> => {
  const { name, email, suggestion, category } = req.body;
  const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress;

  try {
    const newSuggestion = new Suggestion({
      name,
      email,
      suggestion,
      category,
      ipAddress,
      status: "pending",
      priority: "medium", // default priority
    });

    await newSuggestion.save();
    console.log(`Saved new suggestion from: ${email} in category: ${category}`);

    // Send auto-acknowledgement email
    sendSuggestionConfirmationEmail(name, email, category, suggestion).catch((err) =>
      console.error(`Error sending suggestion auto-reply email to ${email}:`, err)
    );

    res.status(201).json({
      success: true,
      message: "Thank you! Your feedback has been received and logged.",
      data: newSuggestion,
    });
  } catch (error: any) {
    console.error("Error in submitSuggestion controller:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving your suggestion. Please try again later.",
    });
  }
};
