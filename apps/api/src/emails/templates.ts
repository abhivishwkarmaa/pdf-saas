/**
 * Premium Dark SaaS HTML Email Templates for ConvertHub
 */

// Common header wrapper
const getHeader = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ConvertHub</title>
  <style>
    body {
      background-color: #09090b;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      color: #e4e4e7;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      background-color: #09090b;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px;
      text-align: center;
      background: linear-gradient(135deg, #1e1b4b 0%, #09090b 100%);
      border-bottom: 1px solid #27272a;
      position: relative;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .logo-icon {
      background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: inline-block;
      vertical-align: middle;
      line-height: 36px;
      text-align: center;
      font-weight: bold;
      color: #ffffff;
      font-size: 20px;
    }
    .logo-text {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      vertical-align: middle;
      display: inline-block;
    }
    .content {
      padding: 40px 32px;
    }
    h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #a1a1aa;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
      color: #ffffff !important;
      font-weight: 600;
      font-size: 15px;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 10px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      text-align: center;
    }
    .features {
      margin: 32px 0;
      border-top: 1px solid #27272a;
      border-bottom: 1px solid #27272a;
      padding: 24px 0;
    }
    .feature-item {
      margin-bottom: 16px;
    }
    .feature-title {
      color: #ffffff;
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 4px;
    }
    .feature-desc {
      color: #71717a;
      font-size: 13px;
      margin: 0;
    }
    .footer {
      padding: 32px;
      background-color: #111113;
      border-top: 1px solid #27272a;
      text-align: center;
    }
    .social-links {
      margin-bottom: 20px;
    }
    .social-link {
      color: #71717a;
      text-decoration: none;
      margin: 0 10px;
      font-size: 13px;
    }
    .social-link:hover {
      color: #a1a1aa;
    }
    .unsubscribe-text {
      color: #52525b;
      font-size: 12px;
      margin: 0;
    }
    .unsubscribe-link {
      color: #7c3aed;
      text-decoration: none;
    }
    .unsubscribe-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://converthub.com" class="logo-container">
          <div class="logo-icon">⚡</div>
          <span class="logo-text">CONVERTHUB</span>
        </a>
      </div>
`;

// Common footer wrapper
const getFooter = (unsubscribeUrl: string) => `
      <div class="footer">
        <div class="social-links">
          <a href="https://twitter.com" class="social-link">Twitter</a>
          <a href="https://github.com" class="social-link">GitHub</a>
          <a href="https://linkedin.com" class="social-link">LinkedIn</a>
          <a href="https://discord.com" class="social-link">Discord</a>
        </div>
        <p class="unsubscribe-text">
          &copy; ${new Date().getFullYear()} ConvertHub. All rights reserved.<br>
          You are receiving this because you subscribed to our newsletter. <br>
          <a href="${unsubscribeUrl}" class="unsubscribe-link">Unsubscribe instantly</a> at any time.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Returns the HTML content for the Welcome email
 */
export const getWelcomeEmailTemplate = (email: string, unsubscribeUrl: string): string => {
  return `
    ${getHeader()}
    <div class="content">
      <h1>Welcome to ConvertHub! ⚡</h1>
      <p>Hey there,</p>
      <p>Thanks for subscribing to the ConvertHub newsletter! We are thrilled to have you join our community of creators, developers, and professionals who convert files daily without compromise.</p>
      <p>At ConvertHub, our mission is to build the ultimate all-in-one web toolbox. 70+ completely free, high-performance tools right in your browser. No sign-up, no annoying ads, and no watermarks.</p>
      
      <div style="text-align: center;">
        <a href="https://converthub.com" class="cta-button">Explore ConvertHub</a>
      </div>

      <div class="features">
        <h2 style="color: #ffffff; font-size: 16px; margin-top: 0; margin-bottom: 16px;">What you get as a subscriber:</h2>
        
        <div class="feature-item">
          <div class="feature-title">🆕 Product updates & first access</div>
          <p class="feature-desc">Be the first to know when we ship new file conversion engines, productivity tools, and upgrades.</p>
        </div>
        
        <div class="feature-item">
          <div class="feature-title">💡 Pro conversion tips</div>
          <p class="feature-desc">Learn how to maximize file compression quality, batch process, and use advanced tools like OCR.</p>
        </div>
        
        <div class="feature-item">
          <div class="feature-title">🛡️ Absolute privacy</div>
          <p class="feature-desc">Your security is our absolute priority. All uploaded files are encrypted and auto-deleted after processing.</p>
        </div>
      </div>

      <p>If you ever have any feature requests, suggestions, or just want to say hi, simply reply to this email! We read and reply to every message.</p>
      <p>Best regards,<br><strong>The ConvertHub Team</strong></p>
    </div>
    ${getFooter(unsubscribeUrl)}
  `;
};

/**
 * Returns the HTML content for the Double Opt-in Verification email
 */
export const getVerificationEmailTemplate = (email: string, verificationUrl: string, unsubscribeUrl: string): string => {
  return `
    ${getHeader()}
    <div class="content">
      <h1>Confirm Your Subscription ⚡</h1>
      <p>Hello,</p>
      <p>Thank you for your interest in subscribing to the ConvertHub newsletter! Please click the button below to verify your email address and activate your subscription.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verificationUrl}" class="cta-button">Confirm Subscription</a>
      </div>

      <p style="font-size: 13px; color: #71717a;">
        If the button above doesn't work, copy and paste this URL into your browser:<br>
        <a href="${verificationUrl}" style="color: #7c3aed; word-break: break-all;">${verificationUrl}</a>
      </p>

      <p>If you did not request this subscription, you can safely ignore this email. You will not be subscribed, and no further action is required.</p>
      <p>Best regards,<br><strong>The ConvertHub Team</strong></p>
    </div>
    ${getFooter(unsubscribeUrl)}
  `;
};

/**
 * Returns the HTML content for Contact Auto-Reply
 */
export const getContactAutoReplyTemplate = (name: string, subject: string, message: string): string => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return `
    ${getHeader()}
    <div class="content">
      <h1>We've Received Your Message ⚡</h1>
      <p>Hi ${name},</p>
      <p>Thank you for reaching out to ConvertHub support. We have received your inquiry regarding <strong>"${subject}"</strong>, and our team is already looking into it.</p>
      
      <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #3f3f46;">
        <p style="color: #ffffff; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Your Message:</p>
        <p style="color: #d4d4d8; font-style: italic; font-size: 13.5px; margin: 0; white-space: pre-wrap;">${message}</p>
      </div>

      <p>We typically respond to all support requests within 2–4 business hours (Monday–Friday, 9am–6pm UTC).</p>
      <p>Best regards,<br><strong>The ConvertHub Support Team</strong></p>
    </div>
    ${getFooter(clientUrl + "/privacy")}
  `;
};

/**
 * Returns the HTML content for Admin Contact Notifications
 */
export const getContactAdminNotificationTemplate = (
  name: string,
  email: string,
  subject: string,
  message: string,
  viewUrl: string
): string => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return `
    ${getHeader()}
    <div class="content">
      <h1 style="color: #f43f5e;">New Support Message Received ⚡</h1>
      <p>An inquiry has been submitted through the ConvertHub contact form:</p>
      
      <table style="width: 100%; margin-bottom: 24px; border-bottom: 1px solid #27272a; padding-bottom: 16px;">
        <tr>
          <td style="padding: 6px 0; color: #a1a1aa; font-size: 13.5px; width: 80px;"><strong>From:</strong></td>
          <td style="padding: 6px 0; color: #ffffff; font-size: 13.5px;">${name} (&lt;${email}&gt;)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #a1a1aa; font-size: 13.5px;"><strong>Subject:</strong></td>
          <td style="padding: 6px 0; color: #ffffff; font-size: 13.5px;">${subject}</td>
        </tr>
      </table>

      <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #3f3f46;">
        <p style="color: #d4d4d8; font-size: 13.5px; margin: 0; white-space: pre-wrap;">${message}</p>
      </div>

      <div style="text-align: center;">
        <a href="${viewUrl}" class="cta-button" style="background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%); box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);">View in Admin Panel</a>
      </div>
    </div>
    ${getFooter(clientUrl + "/privacy")}
  `;
};

/**
 * Returns the HTML content for Admin Replies
 */
export const getAdminReplyTemplate = (name: string, originalMessage: string, replyText: string): string => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return `
    ${getHeader()}
    <div class="content">
      <h1>New Reply from ConvertHub ⚡</h1>
      <p>Hi ${name},</p>
      <p>Our team has replied to your support message:</p>

      <div style="background-color: #2e1065; padding: 20px; border-radius: 12px; border: 1px solid #581c87; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(88, 28, 135, 0.15);">
        <p style="color: #ffffff; font-size: 14.5px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${replyText}</p>
      </div>

      <div style="border-top: 1px dashed #3f3f46; padding-top: 16px; margin-top: 24px;">
        <p style="color: #71717a; font-size: 12.5px; margin-bottom: 8px;">Original message sent by you:</p>
        <p style="color: #71717a; font-style: italic; font-size: 12.5px; margin: 0; white-space: pre-wrap;">"${originalMessage}"</p>
      </div>

      <p style="margin-top: 24px;">If you have any further questions, you can reply directly to this email.</p>
      <p>Best regards,<br><strong>The ConvertHub Support Team</strong></p>
    </div>
    ${getFooter(clientUrl + "/privacy")}
  `;
};

/**
 * Returns the HTML content for Suggestion Auto-Reply
 */
export const getSuggestionAutoReplyTemplate = (name: string, category: string, suggestion: string): string => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return `
    ${getHeader()}
    <div class="content">
      <h1>Awesome Idea! Thanks for the Feedback ⚡</h1>
      <p>Hi ${name},</p>
      <p>Thanks for sharing your suggestion with us! We love building ConvertHub alongside our community. Your feedback has been logged in our internal feature requests backlog.</p>

      <table style="width: 100%; margin-bottom: 20px; border-bottom: 1px solid #27272a; padding-bottom: 12px;">
        <tr>
          <td style="padding: 6px 0; color: #a1a1aa; font-size: 13.5px; width: 80px;"><strong>Category:</strong></td>
          <td style="padding: 6px 0; color: #7c3aed; font-size: 13.5px; font-weight: 600;">${category}</td>
        </tr>
      </table>

      <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #3f3f46;">
        <p style="color: #d4d4d8; font-size: 13.5px; margin: 0; white-space: pre-wrap;">${suggestion}</p>
      </div>

      <p>Our developers review the suggestions dashboard weekly. We'll send you an email alert if we decide to plan or start developing this idea!</p>
      <p>Best regards,<br><strong>The ConvertHub Product Team</strong></p>
    </div>
    ${getFooter(clientUrl + "/privacy")}
  `;
};

/**
 * Returns the HTML content for Suggestion Status Updates
 */
export const getSuggestionStatusUpdateTemplate = (
  name: string,
  suggestionText: string,
  status: string,
  category: string
): string => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  
  // Custom styling for different statuses
  let statusColor = "#7c3aed";
  let statusLabel = status.toUpperCase().replace("_", " ");
  let statusMessage = "We updated the status of your suggestion.";

  if (status === "planned") {
    statusColor = "#3b82f6";
    statusMessage = "Excellent news! We have added your suggestion to our official product roadmap.";
  } else if (status === "in_progress") {
    statusColor = "#f59e0b";
    statusMessage = "Our engineering team has started working on this suggestion! Stay tuned.";
  } else if (status === "completed") {
    statusColor = "#10b981";
    statusMessage = "🎉 Success! We have shipped this feature/fix in our latest update. Check it out on ConvertHub now!";
  } else if (status === "rejected") {
    statusColor = "#ef4444";
    statusMessage = "We reviewed your suggestion but have decided not to pursue it at this time.";
  }

  return `
    ${getHeader()}
    <div class="content">
      <h1>Suggestion Status Update ⚡</h1>
      <p>Hi ${name},</p>
      <p>${statusMessage}</p>

      <div style="margin: 24px 0; text-align: center;">
        <span style="display: inline-block; background-color: ${statusColor}1A; border: 1px solid ${statusColor}; color: ${statusColor}; font-weight: 800; font-size: 14px; padding: 10px 24px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
          Status: ${statusLabel}
        </span>
      </div>

      <div style="border-top: 1px dashed #3f3f46; padding-top: 16px; margin-top: 24px;">
        <p style="color: #71717a; font-size: 12.5px; margin-bottom: 8px;">Your original suggestion in <strong>${category}</strong>:</p>
        <p style="color: #71717a; font-style: italic; font-size: 12.5px; margin: 0; white-space: pre-wrap;">"${suggestionText}"</p>
      </div>

      <p style="margin-top: 24px;">Thanks again for helping us make ConvertHub better for everyone.</p>
      <p>Best regards,<br><strong>The ConvertHub Product Team</strong></p>
    </div>
    ${getFooter(clientUrl + "/privacy")}
  `;
};

/**
 * Returns the HTML content for User Feedback Thank You Auto-Reply
 */
export const getFeedbackAutoReplyTemplate = (
  userName: string,
  category: string,
  title: string,
  message: string
): string => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return `
    ${getHeader()}
    <div class="content">
      <h1>Thank You for Your Feedback! ⚡</h1>
      <p>Hello ${userName},</p>
      <p>Thank you for reaching out to ConvertHub.</p>
      <p>We’ve successfully received your feedback/suggestion and our team will review it carefully. Your ideas and reports help us improve the platform and build better tools for everyone.</p>

      <div style="background-color: #1e1b4b; border: 1px solid #312e81; padding: 20px; border-radius: 12px; margin: 24px 0;">
        <p style="color: #a78bfa; font-weight: 700; margin-top: 0; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Feedback details logged:</p>
        <p style="color: #ffffff; font-weight: 600; margin-top: 0; margin-bottom: 6px; font-size: 14px;">[${category}] ${title}</p>
        <p style="color: #cbd5e1; font-style: italic; font-size: 13px; margin: 0; white-space: pre-wrap;">"${message}"</p>
      </div>

      <p>Our developers may contact you if additional information is required.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${clientUrl}" class="cta-button">Explore Tools</a>
      </div>

      <p>We appreciate your support and thank you for being connected with ConvertHub.</p>
      <p>Best regards,<br><strong>The ConvertHub Team</strong></p>
    </div>
    ${getFooter(clientUrl + "/privacy")}
  `;
};
