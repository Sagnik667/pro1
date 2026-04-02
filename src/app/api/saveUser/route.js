import { supabase } from "../../../lib/supabase";

export async function POST(req) {
  try {
    const { userId, email, phone } = await req.json();

    const { error } = await supabase
  .from("users")
  .upsert({ id: userId, email, phone }, { onConflict: "id" });

    if (error) throw error;

    return Response.json({ success: true });

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}