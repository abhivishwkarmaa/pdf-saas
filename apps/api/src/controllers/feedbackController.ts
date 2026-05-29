import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/adminAuth";
import { Feedback } from "../models/Feedback";
import {
  sendFeedbackAutoReplyEmail,
  sendAdminReplyEmail,
  sendSuggestionStatusUpdateEmail,
} from "../services/emailService";

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
  const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress;
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
        console.log(`Auto-reply email status updated for feedback ${feedback._id}: ${feedback.deliveryStatus}`);
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

/**
 * Get dashboard stats for feedback board
 * GET /api/admin/feedback/stats
 */
export const getFeedbackStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const total = await Feedback.countDocuments();
    const pending = await Feedback.countDocuments({ status: "pending" });
    const underReview = await Feedback.countDocuments({ status: "under_review" });
    const planned = await Feedback.countDocuments({ status: "planned" });
    const inProgress = await Feedback.countDocuments({ status: "in_progress" });
    const completed = await Feedback.countDocuments({ status: "completed" });
    const rejected = await Feedback.countDocuments({ status: "rejected" });

    const critical = await Feedback.countDocuments({ priority: "critical" });
    const high = await Feedback.countDocuments({ priority: "high" });

    // Breakdowns
    const categoryBreakdown = await Feedback.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const priorityBreakdown = await Feedback.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    const statusBreakdown = await Feedback.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        status: {
          pending,
          underReview,
          planned,
          inProgress,
          completed,
          rejected,
        },
        priority: {
          critical,
          high,
        },
        breakdowns: {
          byCategory: categoryBreakdown,
          byPriority: priorityBreakdown,
          byStatus: statusBreakdown,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching feedback stats:", error);
    res.status(500).json({ success: false, message: "Error fetching feedback stats." });
  }
};

/**
 * Get feedback list with search, filter, pagination
 * GET /api/admin/feedback
 */
export const getFeedbackList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  const category = req.query.category as string;
  const status = req.query.status as string;
  const priority = req.query.priority as string;
  const assignee = req.query.assignee as string;
  const unresolved = req.query.unresolved === "true";
  const sortBy = req.query.sortBy as string; // 'newest' | 'oldest'

  const skip = (page - 1) * limit;

  try {
    const query: any = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignedDeveloper = assignee;

    if (unresolved) {
      query.status = { $nin: ["completed", "rejected"] };
    }

    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const sortOrder = sortBy === "oldest" ? 1 : -1;

    const items = await Feedback.find(query)
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Feedback.countDocuments(query);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching feedback list:", error);
    res.status(500).json({ success: false, message: "Error fetching feedback." });
  }
};

/**
 * Update feedback status, notes, assignee, priority
 * PUT /api/admin/feedback/:id
 */
export const updateFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, priority, assignedDeveloper, adminNotes } = req.body;

  try {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      res.status(404).json({ success: false, message: "Feedback not found." });
      return;
    }

    const oldStatus = feedback.status;

    if (status) {
      if (!["pending", "under_review", "planned", "in_progress", "completed", "rejected"].includes(status)) {
        res.status(400).json({ success: false, message: "Invalid status value." });
        return;
      }
      feedback.status = status;
    }

    if (priority) {
      if (!["low", "medium", "high", "critical"].includes(priority)) {
        res.status(400).json({ success: false, message: "Invalid priority value." });
        return;
      }
      feedback.priority = priority;
    }

    if (assignedDeveloper !== undefined) {
      feedback.assignedDeveloper = assignedDeveloper;
    }

    if (adminNotes !== undefined) {
      feedback.adminNotes = adminNotes;
    }

    await feedback.save();

    // Trigger email alert to user on status updates (Planned, In Progress, Completed, Rejected)
    if (status && status !== oldStatus) {
      sendSuggestionStatusUpdateEmail(
        feedback.userName,
        feedback.userEmail,
        feedback.message,
        status,
        feedback.category
      ).catch((err) => console.error("Error triggering status update email:", err));
    }

    res.status(200).json({
      success: true,
      message: "Feedback updated successfully.",
      data: feedback,
    });
  } catch (error: any) {
    console.error("Error updating feedback:", error);
    res.status(500).json({ success: false, message: "Error updating feedback." });
  }
};

/**
 * Developer replies to user feedback
 * POST /api/admin/feedback/reply
 */
export const replyFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { feedbackId, replyText } = req.body;
  const adminUser = req.user;

  if (!feedbackId || !replyText) {
    res.status(400).json({ success: false, message: "Please provide feedbackId and replyText." });
    return;
  }

  try {
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      res.status(404).json({ success: false, message: "Feedback not found." });
      return;
    }

    // Add reply to thread
    feedback.replies.push({
      senderId: adminUser!._id.toString(),
      senderName: adminUser!.name,
      replyText,
      createdAt: new Date(),
    });

    // Update status
    feedback.status = "under_review";
    await feedback.save();

    // Send email reply to user
    await sendAdminReplyEmail(feedback.userName, feedback.userEmail, feedback.message, replyText);

    res.status(200).json({
      success: true,
      message: "Response email sent to user.",
      data: feedback,
    });
  } catch (error: any) {
    console.error("Error sending feedback reply:", error);
    res.status(500).json({ success: false, message: "Error sending reply." });
  }
};

/**
 * Resend the thank-you confirmation email manually
 * POST /api/admin/feedback/:id/resend-confirmation
 */
export const resendConfirmation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      res.status(404).json({ success: false, message: "Feedback not found." });
      return;
    }

    const success = await sendFeedbackAutoReplyEmail(
      feedback.userName,
      feedback.userEmail,
      feedback.category,
      feedback.title,
      feedback.message
    );

    feedback.emailSent = success;
    feedback.sentAt = new Date();
    feedback.deliveryStatus = success ? "sent" : "failed";
    await feedback.save();

    if (success) {
      res.status(200).json({ success: true, message: "Confirmation email resent successfully." });
    } else {
      res.status(500).json({ success: false, message: "Failed to deliver email. Check SMTP logs." });
    }
  } catch (error: any) {
    console.error("Error resending confirmation:", error);
    res.status(500).json({ success: false, message: "Error resending email." });
  }
};
