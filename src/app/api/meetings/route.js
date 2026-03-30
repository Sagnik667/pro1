import fs from "fs";
import path from "path";
import { supabase } from "@/lib/supabase";

const localMeetingsPath = path.join(process.cwd(), "data", "meetings.json");

function readLocalMeetings() {
  try {
    const raw = fs.readFileSync(localMeetingsPath, "utf-8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalMeetings(meetings) {
  fs.writeFileSync(localMeetingsPath, JSON.stringify(meetings, null, 2));
}

export async function POST(req) {
  const data = await req.json();

  const meetingRow = {
    id: data.id,
    user_id: data.userId,
    title: data.title,
    start_time: data.startTime,
    end_time: data.endTime,
    meeting_link: data.meetingLink,
    reminder_minutes: data.reminderMinutes,
    importance: data.importance,
    recurrence: data.recurrence
  };

  try {
    const { error } = await supabase.from("meetings").upsert(meetingRow);
    if (error) {
      throw new Error(error.message);
    }
    return Response.json({ success: true, storage: "supabase" });
  } catch (err) {
    const localMeetings = readLocalMeetings();
    const localMeeting = {
      id: data.id,
      userId: data.userId,
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      meetingLink: data.meetingLink,
      reminderMinutes: data.reminderMinutes,
      importance: data.importance,
      recurrence: data.recurrence,
      notified: false
    };

    const idx = localMeetings.findIndex((m) => m.id === localMeeting.id);
    if (idx >= 0) {
      localMeetings[idx] = { ...localMeetings[idx], ...localMeeting };
    } else {
      localMeetings.push(localMeeting);
    }
    writeLocalMeetings(localMeetings);

    console.error("[meetings] Supabase save failed, used local fallback:", err);
    return Response.json({
      success: true,
      storage: "local_fallback",
      warning: "Supabase unavailable. Saved locally."
    });
  }
}
