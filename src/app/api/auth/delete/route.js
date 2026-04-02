import { supabase } from "../../../../lib/supabase";

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json(
        { success: false, error: 'No authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Find user by token
    const { data: user, error: findError } = await supabase
      .from('auth_users')
      .select('id')
      .eq('auth_token', token)
      .single();

    if (findError || !user) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Delete user from auth_users table
    const { error: deleteError } = await supabase
      .from('auth_users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Also delete user's meetings and participants (cascade)
    await supabase
      .from('meetings')
      .delete()
      .eq('user_id', user.id);

    return Response.json({ success: true, message: 'Account deleted successfully' });

  } catch (err) {
    console.error('[auth/delete] error:', err.message);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
