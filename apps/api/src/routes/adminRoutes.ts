import { Router } from "express";
import { adminAuth } from "../middlewares/adminAuth";
import {
  getStats,
  getMessages,
  updateMessageStatus,
  deleteMessage,
  adminReply,
  getSubscribers,
  exportSubscribers,
  deleteSubscriber,
  getSuggestions,
  updateSuggestion,
  replyToSuggestion,
} from "../controllers/adminController";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

// Mount authentication protection to all administration routes
router.use(adminAuth);

/**
 * @route   GET /api/admin/stats
 * @desc    Get counts and breakdowns for dashboard charts
 * @access  Private (Admin/Dev)
 */
router.get("/stats", asyncHandler(getStats));

/**
 * @route   GET /api/admin/messages
 * @desc    Get support messages with filters
 * @access  Private (Admin/Dev)
 */
router.get("/messages", asyncHandler(getMessages));

/**
 * @route   PUT /api/admin/messages/:id/status
 * @desc    Update status badge of a message
 * @access  Private (Admin/Dev)
 */
router.put("/messages/:id/status", asyncHandler(updateMessageStatus));

/**
 * @route   DELETE /api/admin/messages/:id
 * @desc    Delete support ticket (spam filtration)
 * @access  Private (Admin/Dev)
 */
router.delete("/messages/:id", asyncHandler(deleteMessage));

/**
 * @route   POST /api/admin/reply
 * @desc    Submit email response to user message thread
 * @access  Private (Admin/Dev)
 */
router.post("/reply", asyncHandler(adminReply));

/**
 * @route   GET /api/admin/subscribers
 * @desc    Get list of newsletter signups
 * @access  Private (Admin/Dev)
 */
router.get("/subscribers", asyncHandler(getSubscribers));

/**
 * @route   GET /api/admin/subscribers/export
 * @desc    Download subscriber list as a CSV attachment
 * @access  Private (Admin/Dev)
 */
router.get("/subscribers/export", asyncHandler(exportSubscribers));

/**
 * @route   DELETE /api/admin/subscribers/:id
 * @desc    Remove/Unsubscribe email manually
 * @access  Private (Admin/Dev)
 */
router.delete("/subscribers/:id", asyncHandler(deleteSubscriber));

/**
 * @route   GET /api/admin/suggestions
 * @desc    Get suggestions with categorization/status filters
 * @access  Private (Admin/Dev)
 */
router.get("/suggestions", asyncHandler(getSuggestions));

/**
 * @route   PUT /api/admin/suggestions/:id
 * @desc    Update progress, priorities, or notes on a suggestion
 * @access  Private (Admin/Dev)
 */
router.put("/suggestions/:id", asyncHandler(updateSuggestion));

/**
 * @route   POST /api/admin/suggestions/:id/reply
 * @desc    Submit email response and review a user suggestion
 * @access  Private (Admin/Dev)
 */
router.post("/suggestions/:id/reply", asyncHandler(replyToSuggestion));

export default router;
