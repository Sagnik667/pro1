# Custom Database Authentication Setup

This project now uses **custom database-based authentication** instead of Supabase Auth. Users sign up with a **username and password** that are stored directly in the database.

## ⚠️ URGENT: Create Database Table

Your app is currently failing because the `auth_users` table doesn't exist. You MUST create it first.

### Step 1: Go to Supabase SQL Editor

1. Log in to your **Supabase.com** account
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **+ New Query**

### Step 2: Copy and Run This SQL

```sql
CREATE TABLE auth_users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  auth_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX idx_auth_users_username ON auth_users(username);
CREATE INDEX idx_auth_users_auth_token ON auth_users(auth_token);
```

Paste this into the SQL editor and click **Run**.

You should see: ✅ "Executed successfully"

### Step 3: That's it!

Your auth system is now ready. Refresh your app and try signing up again.

---

## Architecture Overview

- **Authentication Method**: Custom username/password with SHA256 hashing
- **Database**: Supabase PostgreSQL (used only as a database, not for auth)
- **Token Storage**: Random hex tokens stored in `auth_users.auth_token`
- **Token Validation**: All API endpoints use custom tokens validated against the `auth_users` table

## Database Setup

### 1. Create the `auth_users` table

Run the following SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  auth_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_auth_users_auth_token ON auth_users(auth_token);
```

### 2. Update Your Existing Tables

Ensure your `meetings` and `participants` tables use `user_id` where needed:

```sql
-- If meetings table doesn't have user_id, add it:
ALTER TABLE meetings ADD COLUMN user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE;

-- If participants table doesn't have user_id, add it:
ALTER TABLE participants ADD COLUMN user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE;
```

## Frontend Authentication Flow

### Signup
```javascript
POST /api/auth/signup
{
  "username": "john_doe",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "username": "john_doe"
  },
  "token": "random-hex-token"
}
```

### Login
```javascript
POST /api/auth/login
{
  "username": "john_doe",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "username": "john_doe"
  },
  "token": "random-hex-token"
}
```

### Token Storage
- Token is stored in browser `localStorage` as `authToken`
- User data is stored in browser `localStorage` as `user`
- Token is sent with all API requests via `Authorization: Bearer <token>` header

## API Endpoints

### Authorization Headers
All protected API endpoints require:
```
Authorization: Bearer <authToken>
```

### Protected Endpoints
- `GET /api/auth/user` - Get current user info
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout (clears token)
- `GET /api/getMeetings` - Get user's meetings
- `POST /api/meetings` - Create meeting
- `GET /api/getParticipants` - Get participants
- `POST /api/participants` - Add participant
- `GET /api/settings` - Get user settings
- `POST /api/settings` - Update settings

## Key Implementation Details

### Password Hashing
- Uses Node.js `crypto` module with SHA256
- Hash format: `crypto.createHash('sha256').update(password).digest('hex')`

### Token Generation
- Random 32-byte hex token: `crypto.randomBytes(32).toString('hex')`
- Unique per user session
- Stored in `auth_users.auth_token`

### User IDs
- Uses UUID v4: `crypto.randomUUID()`
- Primary key in `auth_users` table

## File Changes Summary

### Modified Files
- `/src/app/AuthPage.js` - Updated to use custom auth endpoints
- `/src/app/page.js` - Removed Supabase Auth, uses localStorage tokens
- `/src/lib/supabase.js` - Updated `requireAuth()` for custom tokens
- `/src/app/api/auth/signup/route.js` - Custom DB auth implementation
- `/src/app/api/auth/login/route.js` - Custom token validation
- `/src/app/api/auth/logout/route.js` - Token clearing logic
- `/src/app/api/auth/user/route.js` - Token-based user lookup
- `/src/app/api/auth/profile/route.js` - Token-based profile fetch

### API Endpoints Using Token Validation
All existing meeting/participant endpoints use the updated `requireAuth()` function which now:
1. Extracts token from `Authorization` header
2. Queries `auth_users` table for matching token
3. Returns user data or 401 error

## Environment Requirements

Ensure `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing the Authentication

### Test Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

### Test Protected Endpoint
```bash
curl -X GET http://localhost:3000/api/auth/user \
  -H "Authorization: Bearer <YOUR_TOKEN_HERE>"
```

## Security Notes

⚠️ **Important Security Considerations**:
1. Always use HTTPS in production
2. Implement rate limiting on auth endpoints
3. Consider adding password strength requirements
4. Add email verification if needed later
5. Implement refresh tokens for long-lived sessions
6. Consider adding 2FA support

## Migration from Supabase Auth

If you had existing users in Supabase Auth:
1. Export user data from Supabase Auth tables
2. Hash passwords using SHA256
3. Import into new `auth_users` table
4. Regenerate tokens for each user

See `MIGRATION_GUIDE.md` for details (if applicable).
