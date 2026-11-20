import dotenv from "dotenv";
// Load environment variables as early as possible
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db";
import { errorHandler } from "./middlewares/errorHandler";
import newsletterRoutes from "./routes/newsletterRoutes";
import contactRoutes from "./routes/contactRoutes";
import suggestionRoutes from "./routes/suggestionRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Configure security middleware
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or direct tool requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [CLIENT_URL];

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

app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - IP: ${req.ip}`
    );
  });
  next();
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public API Routes (100% open, zero authentication required)
app.use("/api/contact", contactRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/newsletter", newsletterRoutes);

// Catch-all route for unhandled paths
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start database and server
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(` ConvertHub Public API Server Running...`);
    console.log(` Port: ${PORT}`);
    console.log(` Env: ${process.env.NODE_ENV || "development"}`);
    console.log(` Client URL: ${CLIENT_URL}`);
    console.log(` Mode: 100% Open Access Platform`);
    console.log(`========================================`);
  });
};

startServer().catch((error) => {
  console.error("Critical server startup failure:", error);
  process.exit(1);
});
