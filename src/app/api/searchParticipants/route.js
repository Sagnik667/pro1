import { supabase, requireAuth } from "../../../lib/supabase";

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) return Response.json([]);

    // Get current user's meeting IDs
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select("id")
      .eq("user_id", user.id);

    if (meetingsError) throw meetingsError;

    const meetingIds = meetings.map((m) => m.id);
    if (!meetingIds.length) return Response.json([]);

    // Get participant IDs linked to user's meetings
    const { data: mpLinks, error: linksError } = await supabase
      .from("meeting_participants")
      .select("participant_id")
      .in("meeting_id", meetingIds);

    if (linksError) throw linksError;

    const participantIds = mpLinks.map((link) => link.participant_id);
    if (!participantIds.length) return Response.json([]);

    // Search those participants by name (case-insensitive)
    const { data: results, error: searchError } = await supabase
      .from("participants_master")
      .select("id, name, email, mobile")
      .in("id", participantIds)
      .ilike("name", `%${query}%`)
      .limit(5);

    if (searchError) throw searchError;

    // Dedupe by email
    const deduped = (results || []).filter(
      (v, i, arr) => arr.findIndex((x) => x.email === v.email) === i
    );

    return Response.json(deduped);

  } catch (err) {
    console.error('[searchParticipants] error:', err.message);
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

