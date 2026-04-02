import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper function to require authentication using custom token
export async function requireAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  // Query auth_users table for this token
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('id, username, created_at')
    .eq('auth_token', token)
    .single();

  if (error || !user) {
    throw new Error('Invalid token');
  }

  return user;
}