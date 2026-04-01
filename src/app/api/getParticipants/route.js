import { supabase } from "../../../lib/supabase";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meetingId");

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
      { status: 500 }
    );
  }
}