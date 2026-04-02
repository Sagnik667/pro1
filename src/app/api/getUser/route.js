import { supabase, requireAuth } from "../../../lib/supabase";

export async function GET(req) {
  try {
    const user = await requireAuth(req);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return Response.json(data);

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 401 }
    );
  }
}