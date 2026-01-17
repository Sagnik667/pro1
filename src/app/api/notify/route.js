import nodemailer from "nodemailer";
import twilio from "twilio";
import fs from "fs";
import path from "path";

const settingsPath = path.join(process.cwd(), "data", "settings.json");

export async function POST(req) {
  const { title, time, link } = await req.json();
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

  // EMAIL
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const emailMsg = `
Meeting Reminder

Title: ${title}
Time: ${time}
Link: ${link}
`;

  if (settings.defaultEmail) {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: settings.defaultEmail,
      subject: `Meeting Reminder: ${title}`,
      text: emailMsg
    });
  }

  // SMS
  if (settings.defaultPhone) {
    const client = twilio(
      process.env.TWILIO_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: `Meeting Reminder: ${title}\n${time}\n${link}`,
      from: process.env.TWILIO_PHONE,
      to: settings.defaultPhone
    });
  }

  return Response.json({ success: true });
}
