import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const meetingsPath = path.join(process.cwd(), "data", "meetings.json");
const settingsPath = path.join(process.cwd(), "data", "settings.json");

console.log("====================================");
console.log("📅 Scheduler process started");
console.log("⏰ Checking every 60 seconds");
console.log("====================================");

async function runScheduler() {
  try {
    const meetings = JSON.parse(fs.readFileSync(meetingsPath, "utf-8"));
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    let hasUpdates = false;

    for (const m of meetings) {
      if (m.notified) continue;

      const startTime = new Date(m.startTime);
      const notifyAt =
        startTime.getTime() - (m.reminderMinutes || 10) * 60 * 1000;

      if (Date.now() >= notifyAt && Date.now() <= startTime.getTime()) {
        const user = settings[m.userId];
        if (!user) {
          console.warn("⚠️ No settings for user:", m.userId);
          continue;
        }

        const response = await fetch("http://localhost:3000/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            phone: user.phone,
            title: m.title,
            time: startTime.toLocaleString(),
            link: m.meetingLink || "https://meet.google.com/new"
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `❌ Notify API failed for "${m.title}" (status ${response.status}):`,
            errorText
          );
          continue;
        }

        const result = await response.json();
        const emailDelivered = user.email ? result.emailStatus === "sent" : true;
        const smsDelivered = user.phone ? result.smsStatus === "sent" : true;

        if (emailDelivered && smsDelivered) {
          m.notified = true;
          hasUpdates = true;
          console.log("✅ Notification sent:", m.title);
        } else {
          console.warn(
            `⚠️ Notification not fully delivered for "${m.title}".`,
            result
          );
        }
      }
    }

    if (hasUpdates) {
      fs.writeFileSync(meetingsPath, JSON.stringify(meetings, null, 2));
    }
  } catch (err) {
    console.error("❌ Scheduler error:", err.message);
  }
}

setInterval(runScheduler, 60 * 1000);
runScheduler(); // run immediately on start
