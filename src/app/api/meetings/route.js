import { supabase } from "@/lib/supabase";

export async function POST(req) {
  const data = await req.json();

  const { error } = await supabase
    .from("meetings")
    .upsert({
      id: data.id,
      user_id: data.userId,
      title: data.title,
      start_time: data.startTime,
      end_time: data.endTime,
      meeting_link: data.meetingLink,
      reminder_minutes: data.reminderMinutes,
      importance: data.importance,
      recurrence: data.recurrence
    });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
