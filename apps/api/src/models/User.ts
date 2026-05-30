import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "developer" | "user";
  plan: "free" | "pro";
  stripeCustomerId?: string;
  stripePriceId?: string;
  planExpiresAt?: Date;
  dailyConversions: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["admin", "developer", "user"],
      default: "user",
    },
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    stripeCustomerId: {
      type: String,
    },
    stripePriceId: {
      type: String,
    },
    planExpiresAt: {
      type: Date,
    },
    dailyConversions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving to database
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Helper method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Format JSON response to exclude sensitive fields
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as any;
    delete r.password;
    delete r.__v;
    return r;
  },
});

export const User = model<IUser>("User", userSchema);
