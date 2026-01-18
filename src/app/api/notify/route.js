const DEFAULT_EMAIL = "nunnun5805@gmail.com";
const DEFAULT_PHONE = "+917044061918";

export const runtime = "nodejs";

import nodemailer from "nodemailer";
import twilio from "twilio";

export async function POST(req) {
  const { title, time, link } = await req.json();
const email = DEFAULT_EMAIL;
const phone = DEFAULT_PHONE;


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
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Meeting Reminder: ${title}`,
        text: message
      });

      console.log("[email] sent:", info.response);
    } catch (err) {
      console.error("[email] failed:", err);
    }
  }

  // ---------- SMS ----------
  /* if (phone) {
    try {
      const client = twilio(
        process.env.TWILIO_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      await client.messages.create({
        body: `Meeting Reminder: ${title}\n${time}\n${link}`,
        from: process.env.TWILIO_PHONE,
        to: phone
      });

      console.log("[sms] sent");
    } catch (err) {
      console.error("[sms] failed:", err);
    }
  } */

  return Response.json({ success: true });
}
