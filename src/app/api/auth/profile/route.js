import { supabase } from "../../../../lib/supabase";

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json(
        { error: 'No authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Find user by token
    const { data: user, error } = await supabase
      .from('auth_users')
      .select('id, username, created_at')
      .eq('auth_token', token)
      .single();

    if (error || !user) {
      return Response.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return Response.json({
      id: user.id,
      username: user.username,
      created_at: user.created_at
    });

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 401 }
    );
  }
}
