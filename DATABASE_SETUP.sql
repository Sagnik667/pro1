-- Create auth_users table for custom authentication
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  auth_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Create index for faster lookups by username
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);

-- Create index for faster lookups by auth_token
CREATE INDEX IF NOT EXISTS idx_auth_users_auth_token ON auth_users(auth_token);

-- Enable RLS on auth_users table
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;

-- Create policies to allow authenticated users to read only their own data
CREATE POLICY "Enable read access for authenticated user's own row"
  ON auth_users FOR SELECT
  USING (auth_token = current_setting('request.headers')::json->>'authorization');

-- Your existing tables (meetings, participants, etc.) should remain unchanged
-- The meetings and participants tables should use user_id field to reference auth_users.id
