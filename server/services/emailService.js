import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    console.log("[Email Service] SMTP Transporter configured successfully.");
  } catch (err) {
    console.warn("[Email Service] Could not initialize SMTP transporter:", err.message);
  }
}

/**
 * Generates and sends a branded subscription confirmation email
 */
export async function sendSubscriptionConfirmationEmail({
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
            Thank you for subscribing! Your test payment for the <strong>${planName}</strong> plan has been successfully verified. Your premium benefits are active immediately.
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
                <td style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right;">${currency} ${amount}</td>
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
            <p style="margin: 4px 0 0 0;">Razorpay Test Mode Payment Receipt</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter && toEmail) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"YourTube" <noreply@yourtube.app>',
        to: toEmail,
        subject: `Subscription Payment Successful — YourTube (${planName})`,
        html: emailHtml,
      });
      console.log(`[Email Service] Confirmation email sent to ${toEmail}`);
      return { sent: true, mode: "smtp" };
    } catch (err) {
      console.warn("[Email Service] Failed to send SMTP email:", err.message);
    }
  }

  // Simulation mode: logged and saved
  console.log(`[Email Service] Simulated purchase confirmation email generated for ${toEmail} (${invoiceNumber})`);
  return { sent: true, mode: "simulation", previewHtml: emailHtml };
}
