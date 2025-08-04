export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

// Simple in-memory session store (wiped whenever the server restarts)
const store = new Map<string, StoredTokens>();

export function saveTokens(sessionId: string, tokens: StoredTokens) {
  store.set(sessionId, tokens);
}

export function getTokens(sessionId: string): StoredTokens | undefined {
  return store.get(sessionId);
}
