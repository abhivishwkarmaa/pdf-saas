import nodemailer from "nodemailer";
import { Resend } from "resend";
import {
  getWelcomeEmailTemplate,
  getVerificationEmailTemplate,
  getContactAutoReplyTemplate,
  getContactAdminNotificationTemplate,
  getAdminReplyTemplate,
  getSuggestionAutoReplyTemplate,
  getSuggestionStatusUpdateTemplate,
  getFeedbackAutoReplyTemplate,
} from "../emails/templates";

// Initialize Resend if API key is provided
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Keep track of the nodemailer transporter (cached)
let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Creates or retrieves the Nodemailer transporter.
 * If SMTP settings are missing, creates an Ethereal mock account.
 */
const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If we have actual SMTP details (not default ethereal defaults with empty user/pass)
  if (host && user && pass) {
    console.log(`SMTP configured: ${host}:${port} (user: ${user})`);
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass },
    });
    return cachedTransporter;
  }

  // Local fallback: Create Ethereal SMTP test account
  console.log("SMTP host/user/pass not configured. Creating Ethereal mock SMTP account...");
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log("Ethereal test account created!");
    console.log(`User: ${testAccount.user}`);
    console.log(`Pass: ${testAccount.pass}`);

    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedTransporter;
  } catch (error) {
    console.error("Failed to create Ethereal SMTP test account. Falling back to log-only console mailer.", error);
    // Return dummy log-only transporter
    cachedTransporter = {
      sendMail: async (options: any) => {
        console.log("=== LOG MAIL SENDER ===");
        console.log(`From: ${options.from}`);
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`HTML: ${options.html.substring(0, 200)}...`);
        console.log("========================");
        return { messageId: "log-only-id" };
      },
    } as any;
    return cachedTransporter!;
  }
};

/**
 * Sends welcome email to subscriber
 */
export const sendWelcomeEmail = async (email: string, unsubscribeToken: string): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || "ConvertHub <noreply@converthub.com>";
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const apiUrl = process.env.API_URL || "http://localhost:5000";
  
  const unsubscribeUrl = `${apiUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
  const html = getWelcomeEmailTemplate(email, unsubscribeUrl);

  try {
    if (resend) {
      console.log(`Sending Welcome Email to ${email} via Resend...`);
      const { data, error } = await resend.emails.send({
        from,
        to: [email],
        subject: "Welcome to ConvertHub! ⚡",
        html,
      });
      if (error) {
        throw new Error(error.message);
      }
      console.log(`Resend welcome email sent. ID: ${data?.id}`);
      return true;
    } else {
      console.log(`Sending Welcome Email to ${email} via Nodemailer...`);
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from,
        to: email,
        subject: "Welcome to ConvertHub! ⚡",
        html,
      });
      console.log(`Nodemailer welcome email sent. Message ID: ${info.messageId}`);
      if (info.messageId.includes("ethereal")) {
        console.log(`Ethereal preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    }
  } catch (error) {
    console.error(`Failed to send Welcome Email to ${email}:`, error);
    return false;
  }
};

/**
 * Sends verification email for double opt-in
 */
export const sendVerificationEmail = async (
  email: string,
  verificationToken: string,
  unsubscribeToken: string
): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || "ConvertHub <noreply@converthub.com>";
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const apiUrl = process.env.API_URL || "http://localhost:5000";

  const verificationUrl = `${apiUrl}/api/newsletter/verify?token=${verificationToken}`;
  const unsubscribeUrl = `${apiUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
  const html = getVerificationEmailTemplate(email, verificationUrl, unsubscribeUrl);

  try {
    if (resend) {
      console.log(`Sending Verification Email to ${email} via Resend...`);
      const { data, error } = await resend.emails.send({
        from,
        to: [email],
        subject: "Confirm your ConvertHub subscription ⚡",
        html,
      });
      if (error) {
        throw new Error(error.message);
      }
      console.log(`Resend verification email sent. ID: ${data?.id}`);
      return true;
    } else {
      console.log(`Sending Verification Email to ${email} via Nodemailer...`);
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from,
        to: email,
        subject: "Confirm your ConvertHub subscription ⚡",
        html,
      });
      console.log(`Nodemailer verification email sent. Message ID: ${info.messageId}`);
      if (info.messageId.includes("ethereal")) {
        console.log(`Ethereal preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    }
  } catch (error) {
    console.error(`Failed to send Verification Email to ${email}:`, error);
    return false;
  }
};

/**
 * Sends contact confirmation auto-reply to user
 */
export const sendContactConfirmationEmail = async (
  name: string,
  email: string,
  subject: string,
  message: string
): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || "ConvertHub Support <support@converthub.com>";
  const html = getContactAutoReplyTemplate(name, subject, message);

  try {
    if (resend) {
      await resend.emails.send({
        from,
        to: [email],
        subject: `We've received your support request: ${subject}`,
        html,
      });
      return true;
    } else {
      const transporter = await getTransporter();
      await transporter.sendMail({
        from,
        to: email,
        subject: `We've received your support request: ${subject}`,
        html,
      });
      return true;
    }
  } catch (error) {
    console.error(`Failed to send contact confirmation email to ${email}:`, error);
    return false;
  }
};

/**
 * Sends contact notification alert to admin
 */
export const sendContactAdminNotificationEmail = async (
  name: string,
  email: string,
  subject: string,
  message: string,
  messageId: string
): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || "ConvertHub Support <support@converthub.com>";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@converthub.com";
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const viewUrl = `${clientUrl}/admin/messages?id=${messageId}`;
  
  const html = getContactAdminNotificationTemplate(name, email, subject, message, viewUrl);

  try {
    if (resend) {
      await resend.emails.send({
        from,
        to: [adminEmail],
        subject: `[New Contact Message] ${subject} from ${name}`,
        html,
      });
      return true;
    } else {
      const transporter = await getTransporter();
      await transporter.sendMail({
        from,
        to: adminEmail,
        subject: `[New Contact Message] ${subject} from ${name}`,
        html,
      });
      return true;
    }
  } catch (error) {
    console.error(`Failed to send admin contact notification:`, error);
    return false;
  }
};

/**
 * Sends admin reply email to user
 */
export const sendAdminReplyEmail = async (
  name: string,
  email: string,
  originalMessage: string,
  replyText: string
): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || "ConvertHub Support <support@converthub.com>";
  const html = getAdminReplyTemplate(name, originalMessage, replyText);

  try {
    if (resend) {
      await resend.emails.send({
        from,
        to: [email],
        subject: "New reply to your ConvertHub support request",
        html,
      });
      return true;
    } else {
      const transporter = await getTransporter();
      await transporter.sendMail({
        from,
        to: email,
        subject: "New reply to your ConvertHub support request",
        html,
      });
      return true;
    }
  } catch (error) {
    console.error(`Failed to send admin reply email to ${email}:`, error);
    return false;
  }
};

/**
 * Sends suggestion confirmation auto-reply to user
 */
export const sendSuggestionConfirmationEmail = async (
  name: string,
  email: string,
  category: string,
  suggestion: string
): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || "ConvertHub Product Team <feedback@converthub.com>";
  const html = getSuggestionAutoReplyTemplate(name, category, suggestion);

  try {
    if (resend) {
      await resend.emails.send({
        from,
        to: [email],
        subject: "ConvertHub: Thanks for your feedback/suggestion! ⚡",
        html,
      });
      return true;
    } else {
      const transporter = await getTransporter();
      await transporter.sendMail({
        from,
        to: email,
        subject: "ConvertHub: Thanks for your feedback/suggestion! ⚡",
        html,
      });
      return true;
    }
  } catch (error) {
    console.error(`Failed to send suggestion confirmation email to ${email}:`, error);
    return false;
  }
};

/**
 * Sends suggestion progress/status update alert to user
 */
export const sendSuggestionStatusUpdateEmail = async (
  name: string,
  email: string,
  suggestionText: string,
  status: string,
  category: string
): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || "ConvertHub Product Team <feedback@converthub.com>";
  const html = getSuggestionStatusUpdateTemplate(name, suggestionText, status, category);

  try {
    if (resend) {
      await resend.emails.send({
        from,
        to: [email],
        subject: `ConvertHub Suggestion Update: Status changed to ${status.toUpperCase().replace("_", " ")}`,
        html,
      });
      return true;
    } else {
      const transporter = await getTransporter();
      await transporter.sendMail({
        from,
        to: email,
        subject: `ConvertHub Suggestion Update: Status changed to ${status.toUpperCase().replace("_", " ")}`,
        html,
      });
      return true;
    }
  } catch (error) {
    console.error(`Failed to send suggestion status update email to ${email}:`, error);
    return false;
  }
};

/**
 * Sends branded thank you auto-reply email for user feedback
 */
export const sendFeedbackAutoReplyEmail = async (
  userName: string,
  userEmail: string,
  category: string,
  title: string,
  message: string
): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || "ConvertHub Team <support@converthub.com>";
  const html = getFeedbackAutoReplyTemplate(userName, category, title, message);

  try {
    if (resend) {
      await resend.emails.send({
        from,
        to: [userEmail],
        subject: "Thank You for Your Feedback — ConvertHub",
        html,
      });
      return true;
    } else {
      const transporter = await getTransporter();
      await transporter.sendMail({
        from,
        to: userEmail,
        subject: "Thank You for Your Feedback — ConvertHub",
        html,
      });
      return true;
    }
  } catch (error) {
    console.error(`Failed to send feedback confirmation email to ${userEmail}:`, error);
    return false;
  }
};
