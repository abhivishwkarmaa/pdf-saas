import { Request, Response } from "express";
import { Subscriber } from "../models/Subscriber";
import { sendWelcomeEmail, sendVerificationEmail } from "../services/emailService";

/**
 * Handle new newsletter subscriptions
 * POST /api/newsletter/subscribe
 */
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  const { email, source } = req.body;
  const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress;

  // Check if subscriber already exists
  const existingSubscriber = await Subscriber.findOne({ email });

  const doubleOptInEnabled = process.env.DOUBLE_OPT_IN === "true";

  if (existingSubscriber) {
    // If they are active
    if (existingSubscriber.status === "active") {
      res.status(400).json({
        success: false,
        message: "Email already subscribed.",
      });
      return;
    }

    // If they are unsubscribed or pending, allow them to re-subscribe/verify
    if (existingSubscriber.status === "unsubscribed" || existingSubscriber.status === "pending") {
      existingSubscriber.status = doubleOptInEnabled ? "pending" : "active";
      existingSubscriber.verified = !doubleOptInEnabled;
      existingSubscriber.ipAddress = ipAddress;
      existingSubscriber.source = source || existingSubscriber.source || "website";
      
      // Regenerate tokens
      const crypto = require("crypto");
      existingSubscriber.unsubscribeToken = crypto.randomBytes(32).toString("hex");
      if (doubleOptInEnabled) {
        existingSubscriber.verificationToken = crypto.randomBytes(32).toString("hex");
      }

      await existingSubscriber.save();

      let emailSent = false;
      if (doubleOptInEnabled) {
        emailSent = await sendVerificationEmail(
          existingSubscriber.email,
          existingSubscriber.verificationToken!,
          existingSubscriber.unsubscribeToken
        );
      } else {
        emailSent = await sendWelcomeEmail(existingSubscriber.email, existingSubscriber.unsubscribeToken);
      }

      console.log(`Re-subscription process completed for ${email}. Email sent: ${emailSent}`);

      res.status(200).json({
        success: true,
        message: doubleOptInEnabled 
          ? "Successfully subscribed! Please check your email to confirm."
          : "Successfully subscribed!",
      });
      return;
    }
  }

  // Create a brand new subscriber
  const newSubscriber = new Subscriber({
    email,
    source: source || "website",
    ipAddress,
    status: doubleOptInEnabled ? "pending" : "active",
    verified: !doubleOptInEnabled,
  });

  await newSubscriber.save();

  let emailSent = false;
  if (doubleOptInEnabled) {
    emailSent = await sendVerificationEmail(
      newSubscriber.email,
      newSubscriber.verificationToken!,
      newSubscriber.unsubscribeToken
    );
  } else {
    emailSent = await sendWelcomeEmail(newSubscriber.email, newSubscriber.unsubscribeToken);
  }

  console.log(`New subscription saved for ${email}. Email sent: ${emailSent}`);

  res.status(200).json({
    success: true,
    message: doubleOptInEnabled
      ? "Successfully subscribed! Please check your email to confirm."
      : "Successfully subscribed!",
  });
};

/**
 * Handle verification of double opt-in email links
 * GET /api/newsletter/verify
 */
export const verify = async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  if (!token) {
    res.redirect(`${clientUrl}/?newsletter=error&message=Verification token is missing`);
    return;
  }

  const subscriber = await Subscriber.findOne({ verificationToken: token });

  if (!subscriber) {
    res.redirect(`${clientUrl}/?newsletter=error&message=Invalid or expired verification token`);
    return;
  }

  // Update subscriber details
  subscriber.status = "active";
  subscriber.verified = true;
  subscriber.verificationToken = undefined; // Clear the token once verified
  await subscriber.save();

  // Send the official welcome onboarding email now that they have confirmed
  await sendWelcomeEmail(subscriber.email, subscriber.unsubscribeToken);

  console.log(`Subscriber verified successfully: ${subscriber.email}`);
  
  // Redirect back to the frontend with success query parameter
  res.redirect(`${clientUrl}/?newsletter=verified`);
};

/**
 * Handle unsubscribe requests
 * GET /api/newsletter/unsubscribe
 */
export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  if (!token) {
    res.redirect(`${clientUrl}/?newsletter=error&message=Unsubscribe token is missing`);
    return;
  }

  const subscriber = await Subscriber.findOne({ unsubscribeToken: token });

  if (!subscriber) {
    res.redirect(`${clientUrl}/?newsletter=error&message=Invalid unsubscribe token`);
    return;
  }

  // Update status to unsubscribed
  subscriber.status = "unsubscribed";
  subscriber.verified = false;
  await subscriber.save();

  console.log(`Subscriber unsubscribed: ${subscriber.email}`);

  // Redirect back to the frontend with unsubscribed status
  res.redirect(`${clientUrl}/?newsletter=unsubscribed`);
};
