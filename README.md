# AI Lifestyle Coach for Google Calendar

Connect your Google Calendar, press one button, and get a friendly AI-generated snapshot of your habits—plus actionable tips for work, health, and social balance.

## Features
* 1-click Google sign-in (OAuth 2.0)
* Reads your events (date range or specific month)
* Sends them to GPT-4 for a natural-language lifestyle summary
* Returns JSON: `{ summary, events }` for easy UI rendering

---

## Quick start

```bash
git clone https://github.com/<your-org>/google-calendar-coach.git
cd google-calendar-coach
npm install            # or pnpm / yarn
cp .env.example .env   # add your own keys
npm run dev            # http://localhost:3000
```

Required environment variables (`.env`):
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI= # e.g. http://localhost:3000/api/auth/callback
OPENAI_API_KEY=


---

## Key API routes

| Route | Purpose |
|-------|---------|
| `GET /api/auth/url` | Returns Google consent URL |
| `GET /api/auth/callback` | Exchanges code → tokens, stores session |
| `GET /api/summary` | Pulls events → OpenAI → JSON summary |

---

## Deploy

1. Set the same env vars in Vercel / Render / Fly.io.  
2. Add the production callback URL to the Google Cloud Console.  
3. (Optional) Move the OAuth consent screen to **Production** after Google verification so any user can sign in.

---

## Architecture

Client → Server → Google OAuth & Calendar → OpenAI → Server → Client  
<img width="753" height="535" alt="image" src="https://github.com/user-attachments/assets/2f51f554-518a-408a-8dab-15a0ff57e91c" />
