// 
// Load env vars FIRST using dynamic import to beat ES module hoisting
import { readFileSync } from "fs";
import { resolve } from "path";

// Manually parse .env.local before anything else
const envPath = resolve(process.cwd(), ".env.local");
try {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
  console.log("✅ .env.local loaded");
} catch (e) {
  console.error("❌ Failed to load .env.local:", e.message);
}

// NOW safe to import supabase (env vars are already set)
const { createClient } = await import("@supabase/supabase-js");
const { default: fetch } = await import("node-fetch");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("====================================");
console.log("📅 Scheduler process started");
console.log("⏰ Checking every 60 seconds");
console.log("====================================");

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

async function runScheduler() {
  try {
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("*");

    console.log("🔍 Total meetings found:", meetings?.length, "at", new Date().toLocaleTimeString());

    if (error) throw error;

    for (const m of meetings) {
      console.log("📋 Meeting:", m.title);
      console.log("   start_time:", m.start_time);
      console.log("   notified:", m.notified);
      console.log("   user_id:", m.user_id);
      console.log("   reminder_minutes:", m.reminder_minutes);

      if (m.notified) {
        console.log("   ⏭️ Skipped - already notified");
        continue;
      }

      // REMOVE the +05:30, just use:
      const startTime = new Date(m.start_time);
      const notifyAt = startTime.getTime() - (m.reminder_minutes || 10) * 60 * 1000;

      console.log("   notifyAt:", new Date(notifyAt).toLocaleTimeString());
      console.log("   startTime:", new Date(startTime).toLocaleTimeString());
      console.log("   now:", new Date().toLocaleTimeString());
      console.log("   should fire?", Date.now() >= notifyAt && Date.now() <= startTime.getTime());

      if (Date.now() >= notifyAt && Date.now() <= startTime.getTime()) {
        const response = await fetch(`${BASE_URL}/api/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
  userId: m.user_id,
  title: m.title,
  time: startTime.toISOString(),
  link: m.meeting_link,
  meetingId: m.id        // ✅ ADD THIS
})
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Notify failed:", errorText);
          continue;
        }

        console.log("✅ Reminder sent:", m.title);

        await supabase
          .from("meetings")
          .update({ notified: true })
          .eq("id", m.id);
      }
    }

  } catch (err) {
    console.error("❌ Scheduler error:", err.message);
  }
}

 
setInterval(runScheduler, 60 * 1000);
runScheduler();