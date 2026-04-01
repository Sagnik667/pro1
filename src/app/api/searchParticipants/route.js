import { supabase } from "../../../lib/supabase";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) return Response.json([]);

    const { data, error } = await supabase
      .from("participants_master")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(5);

    if (error) throw error;

    return Response.json(data);

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}