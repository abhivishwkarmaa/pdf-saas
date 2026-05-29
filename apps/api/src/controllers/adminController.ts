import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/adminAuth";
import { Subscriber } from "../models/Subscriber";
import { ContactMessage } from "../models/ContactMessage";
import { Suggestion } from "../models/Suggestion";
import { sendAdminReplyEmail, sendSuggestionStatusUpdateEmail } from "../services/emailService";

/**
 * Get dashboard summary stats
 * GET /api/admin/stats
 */
export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Newsletter stats
    const totalSubscribers = await Subscriber.countDocuments();
    const activeSubscribers = await Subscriber.countDocuments({ status: "active" });
    const unsubscribedSubscribers = await Subscriber.countDocuments({ status: "unsubscribed" });
    const pendingSubscribers = await Subscriber.countDocuments({ status: "pending" });

    // 2. Message stats
    const totalMessages = await ContactMessage.countDocuments();
    const unreadMessages = await ContactMessage.countDocuments({ status: "unread" });
    const resolvedMessages = await ContactMessage.countDocuments({ status: "resolved" });

    // 3. Suggestions stats
    const totalSuggestions = await Suggestion.countDocuments();
    const pendingSuggestions = await Suggestion.countDocuments({ status: "pending" });
    const plannedSuggestions = await Suggestion.countDocuments({ status: "planned" });
    const inProgressSuggestions = await Suggestion.countDocuments({ status: "in_progress" });
    const completedSuggestions = await Suggestion.countDocuments({ status: "completed" });

    // 4. Group by category suggestions
    const suggestionCategoryBreakdown = await Suggestion.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    // 5. Group by source newsletter
    const subscriberSourceBreakdown = await Subscriber.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        subscribers: {
          total: totalSubscribers,
          active: activeSubscribers,
          unsubscribed: unsubscribedSubscribers,
          pending: pendingSubscribers,
        },
        messages: {
          total: totalMessages,
          unread: unreadMessages,
          resolved: resolvedMessages,
        },
        suggestions: {
          total: totalSuggestions,
          pending: pendingSuggestions,
          planned: plannedSuggestions,
          inProgress: inProgressSuggestions,
          completed: completedSuggestions,
        },
        breakdowns: {
          suggestionsByCategory: suggestionCategoryBreakdown,
          subscribersBySource: subscriberSourceBreakdown,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ success: false, message: "Error fetching stats." });
  }
};

/**
 * Get contact messages with search, filter, pagination
 * GET /api/admin/messages
 */
export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  const status = req.query.status as string;
  const subject = req.query.subject as string;

  const skip = (page - 1) * limit;

  try {
    const query: any = {};

    if (status) query.status = status;
    if (subject) query.subject = subject;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ContactMessage.countDocuments(query);

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Error fetching messages." });
  }
};

/**
 * Update message status
 * PUT /api/admin/messages/:id/status
 */
export const updateMessageStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["unread", "read", "replied", "resolved"].includes(status)) {
    res.status(400).json({ success: false, message: "Invalid status value." });
    return;
  }

  try {
    const message = await ContactMessage.findById(id);
    if (!message) {
      res.status(404).json({ success: false, message: "Message not found." });
      return;
    }

    message.status = status;
    await message.save();

    res.status(200).json({ success: true, message: `Status updated to ${status}.`, data: message });
  } catch (error: any) {
    console.error("Error updating message status:", error);
    res.status(500).json({ success: false, message: "Error updating message status." });
  }
};

/**
 * Delete support message (spam filter)
 * DELETE /api/admin/messages/:id
 */
export const deleteMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const message = await ContactMessage.findByIdAndDelete(id);
    if (!message) {
      res.status(404).json({ success: false, message: "Message not found." });
      return;
    }

    res.status(200).json({ success: true, message: "Message deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    res.status(500).json({ success: false, message: "Error deleting message." });
  }
};

/**
 * Reply directly to a support message
 * POST /api/admin/reply
 */
export const adminReply = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { messageId, replyText } = req.body;
  const adminUser = req.user; // populated by adminAuth middleware

  if (!messageId || !replyText) {
    res.status(400).json({ success: false, message: "Please provide messageId and replyText." });
    return;
  }

  try {
    const message = await ContactMessage.findById(messageId);
    if (!message) {
      res.status(404).json({ success: false, message: "Contact message not found." });
      return;
    }

    // Add reply to the thread
    message.replies.push({
      senderId: adminUser!._id.toString(),
      senderName: adminUser!.name,
      replyText,
      createdAt: new Date(),
    });

    // Update status to replied
    message.status = "replied";
    await message.save();

    // Send email reply to user
    await sendAdminReplyEmail(message.name, message.email, message.message, replyText);

    res.status(200).json({
      success: true,
      message: "Reply sent and conversation updated.",
      data: message,
    });
  } catch (error: any) {
    console.error("Error sending admin reply:", error);
    res.status(500).json({ success: false, message: "Error sending admin reply." });
  }
};

/**
 * Get subscribers with search, pagination
 * GET /api/admin/subscribers
 */
export const getSubscribers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;

  const skip = (page - 1) * limit;

  try {
    const query: any = {};

    if (search) {
      query.email = { $regex: search, $options: "i" };
    }

    const subscribers = await Subscriber.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Subscriber.countDocuments(query);

    res.status(200).json({
      success: true,
      data: subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching subscribers:", error);
    res.status(500).json({ success: false, message: "Error fetching subscribers." });
  }
};

/**
 * Export subscribers list as CSV
 * GET /api/admin/subscribers/export
 */
export const exportSubscribers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const subscribers = await Subscriber.find({}).sort({ createdAt: -1 });

    let csv = "Email,Status,Verified,Source,SubscribedAt\n";
    for (const sub of subscribers) {
      csv += `"${sub.email}","${sub.status}",${sub.verified},"${sub.source}","${sub.createdAt.toISOString()}"\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=subscribers-${new Date().toISOString().split("T")[0]}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    console.error("Error exporting subscribers:", error);
    res.status(500).json({ success: false, message: "Error exporting subscribers." });
  }
};

/**
 * Unsubscribe/delete a subscriber manually
 * DELETE /api/admin/subscribers/:id
 */
export const deleteSubscriber = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const sub = await Subscriber.findByIdAndDelete(id);
    if (!sub) {
      res.status(404).json({ success: false, message: "Subscriber not found." });
      return;
    }

    res.status(200).json({ success: true, message: "Subscriber removed successfully." });
  } catch (error: any) {
    console.error("Error deleting subscriber:", error);
    res.status(500).json({ success: false, message: "Error removing subscriber." });
  }
};

/**
 * Get suggestions list with filter and pagination
 * GET /api/admin/suggestions
 */
export const getSuggestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string;
  const priority = req.query.priority as string;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const skip = (page - 1) * limit;

  try {
    const query: any = {};

    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { suggestion: { $regex: search, $options: "i" } },
      ];
    }

    const suggestions = await Suggestion.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Suggestion.countDocuments(query);

    res.status(200).json({
      success: true,
      data: suggestions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ success: false, message: "Error fetching suggestions." });
  }
};

/**
 * Update suggestion status, priority, or internal notes
 * PUT /api/admin/suggestions/:id
 */
export const updateSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, priority, internalNotes } = req.body;

  try {
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      res.status(404).json({ success: false, message: "Suggestion not found." });
      return;
    }

    const oldStatus = suggestion.status;

    if (status) {
      if (!["pending", "reviewed", "planned", "in_progress", "completed", "rejected"].includes(status)) {
        res.status(400).json({ success: false, message: "Invalid status value." });
        return;
      }
      suggestion.status = status;
    }

    if (priority) {
      if (!["low", "medium", "high"].includes(priority)) {
        res.status(400).json({ success: false, message: "Invalid priority value." });
        return;
      }
      suggestion.priority = priority;
    }

    if (internalNotes !== undefined) {
      suggestion.internalNotes = internalNotes;
    }

    await suggestion.save();

    // Trigger status update email to user if status has changed
    if (status && status !== oldStatus) {
      sendSuggestionStatusUpdateEmail(
        suggestion.name,
        suggestion.email,
        suggestion.suggestion,
        status,
        suggestion.category
      ).catch((err) => console.error("Error sending status update notification:", err));
    }

    res.status(200).json({
      success: true,
      message: "Suggestion updated successfully.",
      data: suggestion,
    });
  } catch (error: any) {
    console.error("Error updating suggestion:", error);
    res.status(500).json({ success: false, message: "Error updating suggestion." });
  }
};
export const replyToSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { replyText } = req.body;
  const adminUser = req.user;

  if (!replyText) {
    res.status(400).json({ success: false, message: "Reply text is required." });
    return;
  }

  try {
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      res.status(404).json({ success: false, message: "Suggestion not found." });
      return;
    }

    suggestion.replies.push({
      senderId: adminUser!._id.toString(),
      senderName: adminUser!.name,
      replyText,
      createdAt: new Date(),
    });

    if (suggestion.status === "pending") {
      suggestion.status = "reviewed";
    }

    await suggestion.save();

    // Reuse admin reply email template
    await sendAdminReplyEmail(
      suggestion.name,
      suggestion.email,
      suggestion.suggestion,
      replyText
    );

    res.status(200).json({
      success: true,
      message: "Reply sent to suggester successfully.",
      data: suggestion,
    });
  } catch (error: any) {
    console.error("Error replying to suggestion:", error);
    res.status(500).json({ success: false, message: "Error sending reply." });
  }
};
