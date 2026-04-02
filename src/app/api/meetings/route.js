import { supabase, requireAuth } from "../../../lib/supabase";

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const data = await req.json();

    // Always tie meeting to auth user to prevent spoofing
    const meetingRow = {
      id: data.id,
      user_id: user.id,
      title: data.title,
      start_time: data.startTime,
      end_time: data.endTime,
      meeting_link: data.meetingLink,
      reminder_minutes: data.reminderMinutes,
      importance: data.importance,
      recurrence: data.recurrence,
      notified: data.notified ?? false
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
    const user = await requireAuth(req);
    const { id } = await req.json();

    // First check if the meeting belongs to the user
    const { data: meeting, error: fetchError } = await supabase
      .from("meetings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !meeting) {
      return Response.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      );
    }

    if (meeting.user_id !== user.id) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

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