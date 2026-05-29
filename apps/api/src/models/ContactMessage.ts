import { Schema, model, Document } from "mongoose";

export interface IReply {
  senderId: string;
  senderName: string;
  replyText: string;
  createdAt: Date;
}

export interface IContactMessage extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "unread" | "read" | "replied" | "resolved";
  ipAddress?: string;
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IReply>(
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

const contactMessageSchema = new Schema<IContactMessage>(
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
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["unread", "read", "replied", "resolved"],
      default: "unread",
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    replies: [replySchema],
  },
  {
    timestamps: true,
  }
);

export const ContactMessage = model<IContactMessage>("ContactMessage", contactMessageSchema);
