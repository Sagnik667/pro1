# Supabase Setup Guide

## Required Tables

### 1. Create `user_profiles` table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create user_profiles table
CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX idx_user_profiles_username ON public.user_profiles(username);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2. Existing Tables

Make sure these tables exist (they should from previous setup):
- `meetings` - with `user_id` column for filtering by user
- `users` - with user email/phone
- `participants_master` - shared participant pool
- `meeting_participants` - meeting to participant mapping

## Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Authentication Rate Limiting

### What is Rate Limiting?
Supabase Auth includes built-in rate limiting to prevent abuse and spam:
- **Signup**: Limited to 1 attempt per email every ~15-30 minutes
- **Login**: Limited to 5 failed attempts every 15 minutes per email

### Understanding the Limits
These limits exist for security:
- Prevents automated spam attacks
- Protects against brute force password attacks
- Protects your email provider from spam reports

### When You Get Rate Limited
**Message**: "Too many signup/login attempts. Please wait a few minutes and try again."

**Solutions:**
1. **Wait 15-30 minutes** - Limits reset automatically
2. **Use different email** - Each email has separate limits
3. **Check your password** - Multiple failed login attempts trigger limits
4. **Clear browser cache** - Sometimes helps if testing locally

### Rate Limit Configuration
To adjust rate limits (optional), go to:
1. Supabase Dashboard → Your Project
2. Authentication → Providers → Email
3. Under "Security" section, view/adjust SMTP rate limits

**Default limits are recommended for security.**

## New Features

### Password Visibility Toggle
- Eye icon (👁️) in password field to show/hide password
- Works on both login and signup

### Username System
- **Signup**: Requires email, username, and password (min 6 characters)
- **Login**: Email or username + password (user can use either)
- Username is displayed below the profile icon (👤) in the header
- Username is also shown in Settings page

### User Data Isolation
- Each user only sees their own meetings
- API endpoints filter by authenticated user_id
- Username visible in settings and header

## How It Works

1. **Signup**: User creates account with email, username, password
   - Username stored in `user_profiles` table
   - Data stored in Supabase Auth + custom table

2. **Login**: User can login with email OR username
   - System looks up user by email or username
   - Username displayed in header

3. **User Data Isolation**: 
   - Each user only sees their own meetings
   - API endpoints filter by authenticated user_id
   - Username visible in settings and header

