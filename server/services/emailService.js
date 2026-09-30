import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Notification from "../Modals/Notification.js";
import User from "../Modals/Auth.js";

dotenv.config();

let cachedTransporter = null;

/**
 * Lazily configures and returns the SMTP transporter if environment variables are set.
 */
function getTransporter() {
  const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const emailPass =
    process.env.EMAIL_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.EMAIL_PASS;
  const emailHost = process.env.EMAIL_HOST;

  if (!emailUser || !emailPass) {
    return null;
  }

  // If already instantiated, reuse it
  if (cachedTransporter) {
    return cachedTransporter;
  }

  try {
    // 1. Gmail configuration (simplest and most reliable for Google App Passwords)
    if (
      process.env.EMAIL_SERVICE === "gmail" ||
      emailHost === "smtp.gmail.com" ||
      (!emailHost && emailUser.toLowerCase().includes("@gmail.com"))
    ) {
      cachedTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      console.log(`[Email Service] Gmail SMTP configured for ${emailUser}`);
      return cachedTransporter;
    }

    // 2. Custom SMTP Host configuration (Brevo, SendGrid, Amazon SES, Mailgun, etc.)
    if (emailHost) {
      cachedTransporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        secure: process.env.EMAIL_SECURE === "true" || process.env.EMAIL_PORT === "465",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      console.log(`[Email Service] Custom SMTP configured for ${emailHost}:${process.env.EMAIL_PORT || 587}`);
      return cachedTransporter;
    }
  } catch (err) {
    console.warn("[Email Service] Failed to initialize SMTP transporter:", err.message);
    cachedTransporter = null;
  }

  return null;
}

/**
 * Dispatches an email via Resend API or SMTP Transporter, with graceful simulation fallback.
 */
async function dispatchEmail({ to, subject, html, from }) {
  const sender = from || process.env.EMAIL_FROM || '"YourTube" <noreply@yourtube.app>';

  // 1. Resend API support (if API key provided)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender.includes("<") ? sender : `YourTube <${sender}>`,
          to: [to],
          subject,
          html,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[Email Service] Email dispatched via Resend API to ${to} (ID: ${data.id})`);
        return { sent: true, mode: "resend", details: `Resend ID: ${data.id}` };
      }
      console.warn("[Email Service] Resend API error:", data);
    } catch (apiErr) {
      console.warn("[Email Service] Resend dispatch failed:", apiErr.message);
    }
  }

  // 2. Nodemailer SMTP (Gmail or custom SMTP)
  const transporter = getTransporter();
  if (transporter && to) {
    try {
      const info = await transporter.sendMail({
        from: sender,
        to,
        subject,
        html,
      });
      console.log(`[Email Service] Live SMTP email delivered to ${to} (MessageId: ${info.messageId})`);
      return { sent: true, mode: "smtp", details: `MessageId: ${info.messageId}` };
    } catch (smtpErr) {
      console.warn("[Email Service] Live SMTP delivery failed:", smtpErr.message);
      return {
        sent: false,
        mode: "failed",
        error: smtpErr.message,
        details: `SMTP error: ${smtpErr.message}`,
      };
    }
  }

  // 3. Simulation mode (no credentials provided in environment)
  console.log(
    `[Email Service] Simulated email generated for ${to} — Subject: "${subject}". Note: To deliver live emails to inbox, configure EMAIL_USER and EMAIL_PASSWORD (or Gmail App Password) in server environment variables.`
  );
  return {
    sent: false,
    mode: "simulation",
    details:
      "Server SMTP credentials (EMAIL_USER / EMAIL_PASSWORD) not configured in environment variables. Email preview is stored in In-App Notification Center.",
  };
}

/**
 * Finds target userId for notifications
 */
async function resolveUserId(userId, toEmail) {
  if (userId) return userId;
  if (!toEmail) return null;
  try {
    const userDoc = await User.findOne({ email: toEmail }).select("_id");
    return userDoc?._id || null;
  } catch {
    return null;
  }
}

/**
 * Generates and sends a branded subscription confirmation email + stores in Notification Center
 */
export async function sendSubscriptionConfirmationEmail({
  userId,
  toEmail,
  userName,
  planName,
  planTier,
  amount,
  currency,
  paymentId,
  orderId,
  invoiceNumber,
  startDate,
  expiryDate,
  features = [],
}) {
  const formattedStart = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedExpiry = new Date(expiryDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const numVal = amount > 1000 ? amount / 100 : Number(amount);
  const displayAmount = numVal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const currencySymbol = currency === "INR" ? "₹" : currency;

  const featureItemsHtml = features
    .map(
      (f) =>
        `<li style="margin-bottom: 6px; color: #374151;">✓ <strong style="color: #111827;">${f}</strong></li>`
    )
    .join("");

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Subscription Payment Successful — YourTube</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #dc2626; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800;">YourTube Subscription</h1>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Payment Verified & Activated</p>
        </div>

        <div style="padding: 32px 24px;">
          <h2 style="font-size: 18px; color: #111827; margin-top: 0;">Hello ${userName || "Subscriber"},</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
            Thank you for subscribing! Your payment for the <strong>${planName}</strong> plan has been successfully verified. Your premium benefits are active immediately.
          </p>

          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Invoice Number:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Plan Tier:</td>
                <td style="padding: 6px 0; color: #dc2626; font-weight: 700; text-align: right;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Amount Paid:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right;">${currencySymbol} ${displayAmount}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Payment ID:</td>
                <td style="padding: 6px 0; color: #111827; font-family: monospace; text-align: right;">${paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Order ID:</td>
                <td style="padding: 6px 0; color: #111827; font-family: monospace; text-align: right;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Valid From:</td>
                <td style="padding: 6px 0; color: #111827; text-align: right;">${formattedStart}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Valid Until:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right;">${formattedExpiry}</td>
              </tr>
            </table>
          </div>

          <h3 style="font-size: 14px; color: #111827; margin-bottom: 12px;">Active Benefits:</h3>
          <ul style="padding-left: 20px; font-size: 13px; line-height: 1.6; margin: 0 0 24px 0;">
            ${featureItemsHtml}
          </ul>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
            <p style="margin: 0;">Need help with your subscription? Reach us at support@yourtube.app</p>
            <p style="margin: 4px 0 0 0;">YourTube Subscription Management System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `Subscription Payment Successful — YourTube (${planName})`;
  const dispatchResult = await dispatchEmail({
    to: toEmail,
    subject,
    html: emailHtml,
  });

  const deliveryStatus = dispatchResult.sent ? "DELIVERED_SMTP" : "SIMULATED";

  // Record notification in database
  try {
    const targetUserId = await resolveUserId(userId, toEmail);
    if (targetUserId) {
      await Notification.create({
        userId: targetUserId,
        userEmail: toEmail,
        type: "SUBSCRIPTION_PURCHASE",
        title: `🎉 ${planName} Plan Activated`,
        subject,
        previewText: `Your payment of ${currencySymbol} ${displayAmount} for ${planName} was confirmed. Invoice #${invoiceNumber}`,
        htmlContent: emailHtml,
        deliveryStatus,
        deliveryDetails: dispatchResult.details || "",
        metadata: {
          invoiceNumber,
          planName,
          amount: displayAmount,
          currency,
          paymentId,
          orderId,
          startDate: formattedStart,
          expiryDate: formattedExpiry,
        },
      });
    }
  } catch (notifErr) {
    console.warn("[Email Service] Could not store in-app notification:", notifErr.message);
  }

  return {
    sent: true,
    mode: dispatchResult.mode,
    deliveryStatus,
    previewHtml: emailHtml,
    details: dispatchResult.details,
  };
}

/**
 * Generates and sends a branded subscription cancellation notification email + stores in Notification Center
 */
export async function sendSubscriptionCancellationEmail({
  userId,
  toEmail,
  userName,
  planName,
  expiryDate,
  immediate = false,
}) {
  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "end of current billing cycle";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Subscription Cancelled — YourTube</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #1f2937; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800;">YourTube Subscription</h1>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Cancellation Notice</p>
        </div>

        <div style="padding: 32px 24px;">
          <h2 style="font-size: 18px; color: #111827; margin-top: 0;">Hello ${userName || "Subscriber"},</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
            ${
              immediate
                ? `Your <strong>${planName}</strong> subscription has been cancelled immediately, and your account has been reverted to the Free plan.`
                : `We received your request to cancel auto-renewal for your <strong>${planName}</strong> subscription. No further recurring charges will be made to your account.`
            }
          </p>

          <div style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Cancelled Plan:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Benefits Active Until:</td>
                <td style="padding: 6px 0; color: #dc2626; font-weight: 700; text-align: right;">${immediate ? "Immediately expired" : formattedExpiry}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Subsequent Tier:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right;">Free (Standard)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Future Invoices:</td>
                <td style="padding: 6px 0; color: #059669; font-weight: 700; text-align: right;">None (Cancelled)</td>
              </tr>
            </table>
          </div>

          <p style="color: #4b5563; font-size: 13px; line-height: 1.6;">
            <strong>Important Note:</strong> Your account, watch history, offline downloads, and past billing receipts remain safely preserved. You can rejoin or upgrade to any plan whenever you are ready.
          </p>

          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="https://youtube-frontend-dc7c.onrender.com/subscriptions" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
              Explore Subscription Plans
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
            <p style="margin: 0;">Have questions or feedback? Contact us at support@yourtube.app</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `Subscription Cancelled — YourTube (${planName})`;
  const dispatchResult = await dispatchEmail({
    to: toEmail,
    subject,
    html: emailHtml,
  });

  const deliveryStatus = dispatchResult.sent ? "DELIVERED_SMTP" : "SIMULATED";

  try {
    const targetUserId = await resolveUserId(userId, toEmail);
    if (targetUserId) {
      await Notification.create({
        userId: targetUserId,
        userEmail: toEmail,
        type: "SUBSCRIPTION_CANCEL",
        title: `⚠️ ${planName} Subscription Cancelled`,
        subject,
        previewText: immediate
          ? `Your ${planName} subscription was cancelled immediately and reverted to Free.`
          : `Auto-renewal disabled. Your ${planName} benefits remain active until ${formattedExpiry}.`,
        htmlContent: emailHtml,
        deliveryStatus,
        deliveryDetails: dispatchResult.details || "",
        metadata: {
          planName,
          expiryDate: formattedExpiry,
          immediate,
        },
      });
    }
  } catch (notifErr) {
    console.warn("[Email Service] Could not store in-app cancellation notification:", notifErr.message);
  }

  return {
    sent: true,
    mode: dispatchResult.mode,
    deliveryStatus,
    previewHtml: emailHtml,
    details: dispatchResult.details,
  };
}

/**
 * Diagnostic test tool to verify SMTP connection or environment setup
 */
export async function verifyEmailSetup(targetEmail) {
  const transporter = getTransporter();
  const resendKey = Boolean(process.env.RESEND_API_KEY);

  if (!transporter && !resendKey) {
    return {
      configured: false,
      message:
        "No SMTP credentials found in server environment variables. To receive real emails in your inbox, set EMAIL_USER and EMAIL_PASSWORD (or Gmail App Password) in your Render environment variables.",
      variablesFound: {
        EMAIL_USER: Boolean(process.env.EMAIL_USER || process.env.GMAIL_USER),
        EMAIL_PASSWORD: Boolean(process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD),
        EMAIL_HOST: Boolean(process.env.EMAIL_HOST),
        RESEND_API_KEY: resendKey,
      },
    };
  }

  try {
    if (transporter) {
      await transporter.verify();
      return {
        configured: true,
        provider: "smtp",
        message: "SMTP transporter connected and verified successfully!",
      };
    }
    return {
      configured: true,
      provider: "resend",
      message: "Resend API key configured.",
    };
  } catch (err) {
    return {
      configured: false,
      error: err.message,
      message: `SMTP verification failed: ${err.message}`,
    };
  }
}
