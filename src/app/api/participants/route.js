import { supabase } from "@/lib/supabase";

export async function POST(req) {
  const { meetingId, email, mobile } = await req.json();

  const { error } = await supabase
    .from("participants")
    .insert({
      meeting_id: meetingId,
      email,
      mobile
    });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
