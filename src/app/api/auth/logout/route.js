import { supabase } from "../../../../lib/supabase";

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return Response.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    // Clear the token from database
    const { error } = await supabase
      .from('auth_users')
      .update({ auth_token: null })
      .eq('auth_token', token);

    if (error) {
      console.error('Logout error:', error);
    }

    return Response.json({ success: true });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}