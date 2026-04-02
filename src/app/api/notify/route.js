export const runtime = "nodejs";
import { supabase } from "@/lib/supabase";
import nodemailer from "nodemailer";
import twilio from "twilio";

export async function POST(req) {
  const { userId, title, time, link, meetingId } = await req.json(); // ✅ add meetingId

  // fetch meeting owner
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  const ownerEmail = user?.email;
  const ownerPhone = user?.phone;

  // ✅ fetch all participants for this meeting
  const { data: participantLinks } = await supabase
    .from("meeting_participants")
    .select(`
      participant_id,
      participants_master (
        name,
        email,
        mobile
      )
    `)
    .eq("meeting_id", meetingId);

  const participants = participantLinks?.map(p => p.participants_master) || [];

  const message = `Meeting Reminder

Title: ${title}
Time: ${time}
Link: ${link || "No link provided"}
`;

  // ✅ collect all emails to notify (owner + participants)
  const allEmails = [];

  if (ownerEmail) allEmails.push(ownerEmail);

  participants.forEach(p => {
    if (p?.email && !allEmails.includes(p.email)) {
      allEmails.push(p.email);
    }
  });

  console.log("[notify] Sending to emails:", allEmails);

  // ---------- EMAIL ----------
  let emailStatus = "not_attempted";

  if (allEmails.length > 0) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: allEmails.join(", "),  // ✅ send to all at once
        subject: `Meeting Reminder: ${title}`,
        text: message
      });

      console.log("[email] sent to:", allEmails);
      emailStatus = "sent";
    } catch (err) {
      console.error("[email] failed:", err.message);
      emailStatus = "failed";
    }
  }

  // ---------- SMS ----------
  // collect all phone numbers (owner + participants)
  const allPhones = [];
  if (ownerPhone) allPhones.push(ownerPhone);
  participants.forEach(p => {
    if (p?.mobile && !allPhones.includes(p.mobile)) {
      allPhones.push(p.mobile);
    }
  });

  let smsStatus = "not_attempted";

  const hasTwilioConfig =
    Boolean(process.env.TWILIO_SID) &&
    Boolean(process.env.TWILIO_AUTH_TOKEN) &&
    Boolean(process.env.TWILIO_PHONE);

  if (allPhones.length > 0 && hasTwilioConfig) {
    try {
      const client = twilio(
        process.env.TWILIO_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      // ✅ send SMS to each phone individually (Twilio requires one at a time)
      await Promise.all(allPhones.map(phone =>
        client.messages.create({
          body: `Meeting Reminder: ${title}\n${time}\n${link}`,
          from: process.env.TWILIO_PHONE,
          to: phone
        })
      ));

      smsStatus = "sent";
    } catch (err) {
      console.error("[sms] failed:", err.message);
      smsStatus = "failed";
    }
  } else if (allPhones.length === 0) {
    smsStatus = "no_phones";
  } else {
    smsStatus = "skipped_no_config";
  }

  const success = emailStatus === "sent" || emailStatus === "not_attempted";

  return Response.json({ success, emailStatus, smsStatus });
}