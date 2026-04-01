import { supabase } from "../../../lib/supabase";

export async function POST(req) {
  try {
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

    const { error } = await supabase
      .from("meetings")
      .upsert(meetingRow);

    if (error) {
      throw new Error(error.message);
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("[meetings] error:", err.message);

    return Response.json(
      {
        success: false,
        error: err.message
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();

    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return Response.json({ success: true });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}