import { supabase, requireAuth } from "../../../lib/supabase";

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { email, phone } = await req.json();

    const { error } = await supabase
      .from("users")
      .upsert({ id: user.id, email, phone }, { onConflict: "id" });

    if (error) throw error;

    return Response.json({ success: true });

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 401 }
    );
  }
}