import { Schema, model, Document } from "mongoose";
import crypto from "crypto";

export interface ISubscriber extends Document {
  email: string;
  subscribedAt: Date;
  status: "active" | "unsubscribed" | "pending";
  source: string;
  ipAddress?: string;
  verified: boolean;
  unsubscribeToken: string;
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriberSchema = new Schema<ISubscriber>(
  {
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "unsubscribed", "pending"],
      default: "active",
    },
    source: {
      type: String,
      default: "website",
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    unsubscribeToken: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    verificationToken: {
      type: String,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
  },
  {
    timestamps: true,
  }
);

// Format output to hide database details if returned
subscriberSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as any;
    delete r.__v;
    delete r._id;
    delete r.ipAddress;
    delete r.verificationToken;
    return r;
  },
});

export const Subscriber = model<ISubscriber>("Subscriber", subscriberSchema);
