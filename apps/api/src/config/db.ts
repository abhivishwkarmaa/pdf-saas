import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("CRITICAL: MONGODB_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.connection.on("connected", () => {
      console.log("Successfully connected to MongoDB.");
    });

    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB connection disconnected. Retrying...");
    });

    await mongoose.connect(uri, {
      autoIndex: true, // Build indexes automatically in development/production
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};
