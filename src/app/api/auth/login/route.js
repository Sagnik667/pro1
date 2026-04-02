import { supabase } from "../../../../lib/supabase";
import crypto from "crypto";

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user by username
    const { data: user, error: findError } = await supabase
      .from('auth_users')
      .select('id, username, password_hash')
      .eq('username', username.toLowerCase())
      .single();

    if (findError || !user) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordHash = hashPassword(password);
    if (passwordHash !== user.password_hash) {
      return Response.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate a simple token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token in database
    const { error: tokenError } = await supabase
      .from('auth_users')
      .update({ auth_token: token, last_login: new Date().toISOString() })
      .eq('id', user.id);

    if (tokenError) {
      console.error('Token update error:', tokenError);
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      },
      token: token
    });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}