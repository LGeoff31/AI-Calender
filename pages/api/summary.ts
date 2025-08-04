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

  let timeMin: string;
  let timeMax: string;

  const monthParam = req.query.month;
  const yearParam = req.query.year;
  const monthNum = Array.isArray(monthParam)
    ? parseInt(monthParam[0] || "", 10)
    : parseInt((monthParam as string) || "", 10);
  const yearNum = Array.isArray(yearParam)
    ? parseInt(yearParam[0] || "", 10)
    : parseInt((yearParam as string) || "", 10);

  if (
    !isNaN(monthNum) &&
    !isNaN(yearNum) &&
    monthNum >= 1 &&
    monthNum <= 12 &&
    yearNum > 1900
  ) {
    const start = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59));
    timeMin = start.toISOString();
    timeMax = end.toISOString();
  } else {
    const pastDays = (() => {
      const q = req.query.past;
      if (Array.isArray(q)) return parseInt(q[0] || "", 10) || 60;
      return parseInt((q as string) || "", 10) || 60;
    })();

    const futureDays = (() => {
      const q = req.query.future;
      if (Array.isArray(q)) return parseInt(q[0] || "", 10) || 30;
      return parseInt((q as string) || "", 10) || 30;
    })();

    timeMin = new Date(
      now.getTime() - pastDays * 24 * 60 * 60 * 1000
    ).toISOString();
    timeMax = new Date(
      now.getTime() + futureDays * 24 * 60 * 60 * 1000
    ).toISOString();
  }

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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log(events);
    const systemPrompt =
      "You are a lifestyle coach AI who infers a person's interests, habits, and preferences from their Google Calendar events, then produces friendly, constructive insights about their lifestyle. Avoid mentioning you read JSON; write naturally to the user.";

    const userPrompt = `Below is this person's calendar data in JSON:
${JSON.stringify(events)}

Based on the event titles, locations, and frequencies, infer:
1. Likely interests/hobbies
2. Typical work patterns & workload
3. Health / wellness tendencies (exercise, rest)
4. Social life patterns
5. Any noteworthy habits or opportunities for improvement

Write a short paragraph (3-4 sentences) followed by 3-5 personalized suggestions. Be positive, actionable, and respectful.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
