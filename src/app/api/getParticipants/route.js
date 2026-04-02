import { supabase, requireAuth } from "../../../lib/supabase";

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meetingId");

    // Verify the meeting belongs to the user
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("user_id")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      return Response.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    if (meeting.user_id !== user.id) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
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

    if (error) throw error;

    return Response.json(data);

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 401 }
    );
  }
}