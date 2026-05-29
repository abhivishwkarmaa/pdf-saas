import { Schema, model, Document } from "mongoose";
import { IReply } from "./ContactMessage";

export interface IFeedback extends Document {
  userName: string;
  userEmail: string;
  category: "Bug Report" | "Feature Request" | "UI/UX Suggestion" | "Performance Issue" | "AI Tool Suggestion" | "Video Tool Feedback" | "Image Tool Feedback" | "General Feedback";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "under_review" | "planned" | "in_progress" | "completed" | "rejected";
  assignedDeveloper?: string;
  attachments: string[];
  adminNotes?: string;
  replies: IReply[];
  emailSent: boolean;
  sentAt?: Date;
  deliveryStatus: "pending" | "sent" | "failed";
  emailType: string;
  browserInfo?: string;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackReplySchema = new Schema<IReply>(
  {
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    replyText: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const feedbackSchema = new Schema<IFeedback>(
  {
    userName: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
    },
    userEmail: {
      type: String,
      required: [true, "User email is required"],
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      enum: [
        "Bug Report",
        "Feature Request",
        "UI/UX Suggestion",
        "Performance Issue",
        "AI Tool Suggestion",
        "Video Tool Feedback",
        "Image Tool Feedback",
        "General Feedback",
      ],
      required: [true, "Category is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "under_review", "planned", "in_progress", "completed", "rejected"],
      default: "pending",
      index: true,
    },
    assignedDeveloper: {
      type: String,
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    replies: [feedbackReplySchema],
    emailSent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    emailType: {
      type: String,
      default: "auto_reply",
    },
    browserInfo: {
      type: String,
      trim: true,
    },
    deviceInfo: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Format output in JSON
feedbackSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as any;
    delete r.__v;
    return r;
  },
});

export const Feedback = model<IFeedback>("Feedback", feedbackSchema);
