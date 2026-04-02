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

    if (password.length < 6) {
      return Response.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('auth_users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUser) {
      return Response.json(
        { success: false, error: 'Username already taken' },
        { status: 400 }
      );
    }

    // Create new user
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    const { data, error } = await supabase
      .from('auth_users')
      .insert([
        {
          id: userId,
          username: username.toLowerCase(),
          password_hash: passwordHash,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      user: {
        id: userId,
        username: username.toLowerCase()
      }
    });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}