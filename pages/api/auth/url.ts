import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent",
  });
  res.status(200).json({ url: authUrl });
}
