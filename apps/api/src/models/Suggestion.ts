import { Schema, model, Document } from "mongoose";
import { IReply } from "./ContactMessage";

export interface ISuggestion extends Document {
  name: string;
  email: string;
  suggestion: string;
  category: "New Tool Request" | "UI Improvement" | "Bug Report" | "AI Feature Suggestion" | "Performance Issue" | "General Feedback";
  priority: "low" | "medium" | "high";
  status: "pending" | "reviewed" | "planned" | "in_progress" | "completed" | "rejected";
  internalNotes?: string;
  ipAddress?: string;
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

const suggestionReplySchema = new Schema<IReply>(
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

const suggestionSchema = new Schema<ISuggestion>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    suggestion: {
      type: String,
      required: [true, "Suggestion content is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["New Tool Request", "UI Improvement", "Bug Report", "AI Feature Suggestion", "Performance Issue", "General Feedback"],
      required: [true, "Category is required"],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "planned", "in_progress", "completed", "rejected"],
      default: "pending",
      index: true,
    },
    internalNotes: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    replies: [suggestionReplySchema],
  },
  {
    timestamps: true,
  }
);

export const Suggestion = model<ISuggestion>("Suggestion", suggestionSchema);
