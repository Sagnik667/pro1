import { supabase, requireAuth } from "../../../lib/supabase";

export async function GET(req) {
  try {
    const user = await requireAuth(req);

    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id);

    if (error) throw error;

    return Response.json(data);

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 401 }
    );
  }
}