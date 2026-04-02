import { supabase, requireAuth } from "../../../lib/supabase";

export async function POST(req) {
  const user = await requireAuth(req);
  const { meetingId, name, email, mobile } = await req.json();

  try {
    // Verify the meeting belongs to the authenticated user
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("user_id")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
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

    // 1. Check if participant exists
    let { data: existing, error: fetchError } = await supabase
      .from("participants_master")
      .select("*")
      .eq("email", email)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    // 2. If not exists → create
    if (!existing) {
      const { data: newUser, error: insertError } = await supabase
        .from("participants_master")
        .insert({ name, email, mobile })
        .select()
        .single();

      if (insertError) throw insertError;

      existing = newUser;
    }

    // 3. Link to meeting
    const { error: linkError } = await supabase
      .from("meeting_participants")
      .insert({
        meeting_id: meetingId,
        participant_id: existing.id
      });

    if (linkError) throw linkError;

    return Response.json({ success: true });

  } catch (err) {
    console.error("[participants] error:", err.message);

    return Response.json(
      { success: false, error: err.message },
      { status: 401 }
    );
  }
}