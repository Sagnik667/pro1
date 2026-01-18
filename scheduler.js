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
    let meetings = JSON.parse(fs.readFileSync(meetingsPath, "utf-8"));
    let settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

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

        await fetch("http://localhost:3000/api/notify", {
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

        m.notified = true;
        fs.writeFileSync(meetingsPath, JSON.stringify(meetings, null, 2));

        console.log("✅ Notification sent:", m.title);
      }
    }
  } catch (err) {
    console.error("❌ Scheduler error:", err.message);
  }
}

setInterval(runScheduler, 60 * 1000);
runScheduler(); // run immediately on start
