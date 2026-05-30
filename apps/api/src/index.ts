import "dotenv/config";

// Validate environment variables immediately
import "./env";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db";
import { errorHandler } from "./middlewares/errorHandler";
import { startDailyLimitResetScheduler } from "./middlewares/planLimiter";

// Original Routes
import newsletterRoutes from "./routes/newsletterRoutes";
import authRoutes from "./routes/authRoutes";
import contactRoutes from "./routes/contactRoutes";
import suggestionRoutes from "./routes/suggestionRoutes";
import adminRoutes from "./routes/adminRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";

// New SaaS & Job Routes
import jobRoutes from "./routes/jobRoutes";
import stripeRoutes from "./routes/stripeRoutes";
import tusUploadRouter from "./routes/tusUpload";
import apiRoutes from "./routes/apiRoutes";
import aiToolsRoutes from "./routes/aiToolsRoutes";

import { User } from "./models/User";

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Configure middleware
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or direct tool requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        "http://localhost:3000",
        CLIENT_URL,
        process.env.FRONTEND_URL ?? "",
      ].filter(Boolean);
      
      // Allow localhost in development
      if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error("Blocked by CORS policy"), false);
      }
    },
    credentials: true,
  })
);

// Mount Tus chunked upload before express.json() to prevent body parsing issues
app.use("/upload/tus", tusUploadRouter);

app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });
  next();
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/billing", stripeRoutes);
app.use("/api/v1", apiRoutes);
app.use("/api/ai-tools", aiToolsRoutes);

// Catch-all route for unhandled paths
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start database and server
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Start daily conversions limit reset scheduler
  startDailyLimitResetScheduler();

  // Seed default admin if no users exist
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@converthub.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "adminpassword123";

      const defaultAdmin = new User({
        name: "Administrator",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });

      await defaultAdmin.save();
      console.log(`========================================`);
      console.log(` SEED: Default Administrator Account Created!`);
      console.log(` Email: ${adminEmail}`);
      console.log(` Password: ${adminPassword}`);
      console.log(` Note: Change password or delete in production!`);
      console.log(`========================================`);
    }
  } catch (err) {
    console.error("Failed to seed default administrator user:", err);
  }

  const startListen = () => {
    const server = app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(` ConvertHub API Server Running...`);
      console.log(` Port: ${PORT}`);
      console.log(` Env: ${process.env.NODE_ENV || "development"}`);
      console.log(` Client URL: ${CLIENT_URL}`);
      console.log(`========================================`);
    });

    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        console.warn(`[EADDRINUSE] Port ${PORT} is busy. The old process might still be releasing it. Retrying in 1.5s...`);
        setTimeout(() => {
          server.close();
          startListen();
        }, 1500);
      } else {
        console.error("Server startup error:", error);
      }
    });
  };

  startListen();
};

startServer().catch((error) => {
  console.error("Critical server startup failure:", error);
  process.exit(1);
});
