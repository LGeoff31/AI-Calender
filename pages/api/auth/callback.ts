import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { serialize } from "cookie";
import { randomUUID } from "crypto";
import { saveTokens } from "../../../lib/session";
import type { StoredTokens } from "../../../lib/session";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code } = req.query;
  if (!code || Array.isArray(code)) {
    return res.status(400).send("Missing code");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const sessionId = randomUUID();

    const stored: StoredTokens = {
      access_token: tokens.access_token || "",
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope ?? undefined,
      token_type: tokens.token_type ?? undefined,
    };

    saveTokens(sessionId, stored);

    const cookie = serialize("sid", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });

    res.setHeader("Set-Cookie", cookie);

    res.writeHead(302, { Location: "/" });
    res.end();
  } catch (err) {
    console.error(err);
    return res.status(500).send("Token exchange failed");
  }
}
