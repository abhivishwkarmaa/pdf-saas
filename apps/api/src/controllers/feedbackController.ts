import { Request, Response } from "express";
import { Feedback } from "../models/Feedback";
import { sendFeedbackAutoReplyEmail } from "../services/emailService";

/**
 * Parses user agent string into browser and device info
 */
const parseUserAgent = (userAgent?: string) => {
  if (!userAgent) return { browser: "Unknown", device: "Unknown" };

  let browser = "Other";
  let device = "Desktop";

  const ua = userAgent.toLowerCase();

  // Browser detection
  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("chrome") && !ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";
  else if (ua.includes("chromium")) browser = "Chromium";

  // Device detection
  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) {
    device = "Mobile";
  } else if (ua.includes("ipad") || ua.includes("tablet")) {
    device = "Tablet";
  }

  return { browser, device };
};

/**
 * Handle new public feedback submission
 * POST /api/feedback
 */
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  const { userName, userEmail, category, title, message, priority } = req.body;
  const ipAddress =
    req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"];

  const { browser, device } = parseUserAgent(userAgent);

  try {
    // 1. Create feedback document
    const feedback = new Feedback({
      userName,
      userEmail,
      category,
      title,
      message,
      priority: priority || "medium",
      status: "pending",
      browserInfo: browser,
      deviceInfo: device,
      ipAddress,
    });

    await feedback.save();
    console.log(`Saved feedback ID: ${feedback._id} from ${userEmail}`);

    // 2. Dispatch thank you confirmation email asynchronously
    sendFeedbackAutoReplyEmail(userName, userEmail, category, title, message)
      .then(async (success) => {
        feedback.emailSent = success;
        feedback.sentAt = new Date();
        feedback.deliveryStatus = success ? "sent" : "failed";
        await feedback.save();
        console.log(
          `Auto-reply email status updated for feedback ${feedback._id}: ${feedback.deliveryStatus}`
        );
      })
      .catch((err) => {
        console.error(`Feedback auto-reply background job failed:`, err);
      });

    // 3. Respond immediately
    res.status(201).json({
      success: true,
      message: "Thank you! Your feedback has been received and logged.",
      data: feedback,
    });
  } catch (error: any) {
    console.error("Error in submitFeedback controller:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving your feedback. Please try again later.",
    });
  }
};
