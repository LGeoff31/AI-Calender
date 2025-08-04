import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { parse } from "cookie";
import { getTokens, saveTokens } from "../../lib/session";
import OpenAI from "openai";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  const sessionId = cookies.sid;
  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const stored = getTokens(sessionId);
  if (!stored || !stored.access_token) {
    return res.status(401).json({ error: "Session expired" });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(stored);

  if (stored.expiry_date && stored.expiry_date < Date.now()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      saveTokens(sessionId, {
        ...stored,
        access_token: credentials.access_token || stored.access_token,
        expiry_date: credentials.expiry_date || stored.expiry_date,
      });
    } catch (err) {
      console.error("Failed to refresh token", err);
      return res.status(401).json({ error: "Token refresh failed" });
    }
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const timeMin = new Date(
    now.getTime() - 60 * 24 * 60 * 60 * 1000
  ).toISOString();
  const timeMax = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    const resp = await calendar.events.list({
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      timeMin,
      timeMax,
      maxResults: 100,
    });
    console.log("reached");
    const events = resp.data.items || [];
    console.log("geoff", events);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log(events);
    const systemPrompt =
      "You are a helpful assistant who summarizes Google Calendar events for the user in a concise human-friendly way.";
    const userPrompt = `Please provide a concise summary of all the events. The events are provided as JSON:\n${JSON.stringify(
      events
    )}\n\nFocus on important meetings, milestones, and busy days. Output 5-7 bullet points.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || "";

    return res.status(200).json({ summary, events });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate summary" });
  }
}
