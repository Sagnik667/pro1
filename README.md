# 📅 Meeting Manager

A full-stack **meeting management web application** built with **Next.js**, **Supabase**, and real-time notification capabilities via **email (Nodemailer)** and **SMS (Twilio)**. It features a custom database-based authentication system, scheduled reminders, and a clean participant management interface.

---

## 🚀 Features

- **Custom Authentication** — Username/password login with SHA256 hashing and token-based session management (no third-party auth provider required)
- **Meeting Management** — Create, view, and manage meetings per user
- **Participant Management** — Add and track participants across meetings
- **Email & SMS Reminders** — Automated notifications using Nodemailer and Twilio
- **Scheduled Jobs** — Background scheduler (`scheduler.js`) powered by `node-cron` for automatic reminders
- **User Data Isolation** — Each user only sees and manages their own meetings
- **User Settings** — Configurable preferences stored per user

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Custom token-based auth (SHA256 + UUID) |
| Email | Nodemailer |
| SMS | Twilio |
| Scheduler | node-cron |
| Dev Tooling | ESLint, concurrently |

---

## 📁 Project Structure

```
pro1/
├── src/
│   └── app/
│       ├── api/             # Next.js API route handlers
│       │   ├── auth/        # signup, login, logout, user, profile
│       │   ├── meetings/    # meeting CRUD
│       │   ├── participants/# participant management
│       │   └── settings/    # user settings
│       ├── AuthPage.js      # Login / Signup UI
│       └── page.js          # Main app page
├── public/                  # Static assets
├── data/                    # Data files
├── scheduler.js             # Cron job for automated reminders
├── DATABASE_SETUP.sql       # SQL schema for Supabase
├── SUPABASE_SETUP.md        # Supabase table setup guide
├── CUSTOM_AUTH_README.md    # Auth system documentation
├── next.config.mjs
└── package.json
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Supabase](https://supabase.com/) account and project
- (Optional) Twilio account for SMS notifications
- (Optional) SMTP credentials for email notifications

---

## 🔧 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Sagnik667/pro1.git
cd pro1
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: For email notifications
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Optional: For SMS notifications
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### 4. Set up the database

Run the following SQL in your **Supabase SQL Editor** to create the required `auth_users` table:

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

Also ensure the following tables exist for the app's core functionality:

- `meetings` — with a `user_id` column referencing `auth_users`
- `participants` — with a `user_id` column referencing `auth_users`

Refer to [`DATABASE_SETUP.sql`](./DATABASE_SETUP.sql) for the complete schema.

### 5. Run the development server

```bash
npm run dev
```

This starts both the Next.js app and the background scheduler concurrently.

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Authentication

This app uses a **custom database-based auth system** (not Supabase Auth).

- **Signup**: `POST /api/auth/signup` with `{ username, password }`
- **Login**: `POST /api/auth/login` with `{ username, password }`
- **Logout**: `POST /api/auth/logout`

On login, a random 32-byte hex token is issued and stored in `auth_users.auth_token`. All protected API calls require:

```
Authorization: Bearer <authToken>
```

Tokens and user data are stored in browser `localStorage`.

### Security Notes

- Passwords are hashed using Node.js `crypto` with SHA256
- Always use **HTTPS in production**
- Consider adding rate limiting, password strength validation, and refresh token support for production deployments

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login and receive auth token |
| POST | `/api/auth/logout` | Logout (clears token) |
| GET | `/api/auth/user` | Get current user info |
| GET | `/api/auth/profile` | Get user profile |
| GET | `/api/getMeetings` | List user's meetings |
| POST | `/api/meetings` | Create a meeting |
| GET | `/api/getParticipants` | List participants |
| POST | `/api/participants` | Add a participant |
| GET | `/api/settings` | Get user settings |
| POST | `/api/settings` | Update user settings |

---

## 🕐 Scheduler

The `scheduler.js` file runs alongside the Next.js server using `node-cron`. It handles:

- Automated meeting reminders via email and SMS
- Background notification tasks at configured intervals

It is started automatically with `npm run dev` via `concurrently`.

---

## 🏗️ Build & Deployment

### Build for production

```bash
npm run build
npm start
```

### Deploy on Vercel

The easiest deployment option is [Vercel](https://vercel.com/new):

1. Push your repo to GitHub
2. Import the repo on Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy

> **Note:** The `scheduler.js` background process won't run on serverless platforms like Vercel. Consider using a dedicated cron service (e.g., [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs), GitHub Actions, or a VPS) for scheduling.

---

## 📄 Additional Documentation

- [`CUSTOM_AUTH_README.md`](./CUSTOM_AUTH_README.md) — Detailed guide on the custom auth system
- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) — Supabase table setup and RLS policies
- [`DATABASE_SETUP.sql`](./DATABASE_SETUP.sql) — Full SQL schema

---

## 📝 License

This project is private and not licensed for public use.
