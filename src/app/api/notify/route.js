export const runtime = "nodejs";

import nodemailer from "nodemailer";
import twilio from "twilio";

export async function POST(req) {
  // ✅ MUST destructure email and phone from request
  const { email, phone, title, time, link } = await req.json();

  let emailStatus = "not_attempted";
  let smsStatus = "not_attempted";

  const message = `Meeting Reminder

Title: ${title}
Time: ${time}
Link: ${link}
`;

  // ---------- EMAIL ----------
  if (email) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER, // FROM = server (env)
        to: email,                    // TO = user (settings)
        subject: `Meeting Reminder: ${title}`,
        text: message
      });

      console.log("[email] sent:", info.response);
      emailStatus = "sent";
    } catch (err) {
      console.error("[email] failed:", err.message);
      emailStatus = "failed";
    }
  }

  // ---------- SMS ----------
  if (phone) {
    const hasTwilioConfig =
      Boolean(process.env.TWILIO_SID) &&
      Boolean(process.env.TWILIO_AUTH_TOKEN) &&
      Boolean(process.env.TWILIO_PHONE);

    if (!hasTwilioConfig) {
      smsStatus = "skipped_no_config";
      console.warn("[sms] skipped: missing Twilio env configuration");
    } else {
      try {
        const client = twilio(
          process.env.TWILIO_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        await client.messages.create({
          body: `Meeting Reminder: ${title}\n${time}\n${link}`,
          from: process.env.TWILIO_PHONE, // Twilio number
          to: phone                      // User phone
        });

        console.log("[sms] sent");
        smsStatus = "sent";
      } catch (err) {
        console.error("[sms] failed:", err.message);
        smsStatus = "failed";
      }
    }
  }

  const emailRequested = Boolean(email);
  const smsRequested = Boolean(phone);
  const emailOk = !emailRequested || emailStatus === "sent";
  const smsOk =
    !smsRequested || smsStatus === "sent" || smsStatus === "skipped_no_config";
  const success = emailOk && smsOk;

  return Response.json(
    {
      success,
      emailStatus,
      smsStatus
    },
    { status: success ? 200 : 500 }
  );
}