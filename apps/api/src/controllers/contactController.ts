import { Request, Response } from "express";
import { ContactMessage } from "../models/ContactMessage";
import {
  sendContactConfirmationEmail,
  sendContactAdminNotificationEmail,
} from "../services/emailService";

/**
 * Handle new contact form submission
 * POST /api/contact
 */
export const submitContact = async (req: Request, res: Response): Promise<void> => {
  const { name, email, subject, message } = req.body;
  const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress;

  try {
    // 1. Save contact message to database
    const newMessage = new ContactMessage({
      name,
      email,
      subject,
      message,
      ipAddress,
      status: "unread",
    });

    await newMessage.save();
    console.log(`Saved new contact message from: ${email} (ID: ${newMessage._id})`);

    // 2. Send confirmation email to user (asynchronous, do not block response)
    sendContactConfirmationEmail(name, email, subject, message).catch((err) =>
      console.error(`Error sending user confirmation email to ${email}:`, err)
    );

    // 3. Send notification email to admin
    sendContactAdminNotificationEmail(name, email, subject, message, newMessage._id.toString()).catch((err) =>
      console.error("Error sending admin contact notification email:", err)
    );

    // 4. Send success response
    res.status(201).json({
      success: true,
      message: "Message sent successfully! We will get back to you shortly.",
      data: newMessage,
    });
  } catch (error: any) {
    console.error("Error in submitContact controller:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while submitting your message. Please try again later.",
    });
  }
};
