// Shared helpers for Google OAuth & Calendar API
import { createClient } from 'npm:@supabase/supabase-js@2';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GoogleAccountRow {
  creator_id: string;
  google_sub: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  calendar_id: string;
}

/** HMAC-SHA256 helper using a server-only secret. Returns base64url. */
async function hmacSign(payload: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

async function hmacVerify(payload: string, signature: string, key: string): Promise<boolean> {
  const expected = await hmacSign(payload, key);
  // constant-time-ish compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlEncodeStr(s: string): string {
  return b64url(new TextEncoder().encode(s));
}
function b64urlDecodeStr(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

export interface SignedState {
  user_id: string;
  return_to: string;
  nonce: string;
  exp: number;
}

/** Sign state for the OAuth flow. `secret` must be a server-only string. */
export async function signState(state: SignedState, secret: string): Promise<string> {
  const payload = b64urlEncodeStr(JSON.stringify(state));
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyState(token: string, secret: string): Promise<SignedState | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!(await hmacVerify(payload, sig, secret))) return null;
  try {
    const obj = JSON.parse(b64urlDecodeStr(payload)) as SignedState;
    if (!obj.exp || obj.exp < Math.floor(Date.now() / 1000)) return null;
    return obj;
  } catch {
    return null;
  }
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

/** Exchanges an authorization code for tokens. */
export async function exchangeCode(params: {
  code: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
}): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.client_id,
      client_secret: params.client_secret,
      redirect_uri: params.redirect_uri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`google token exchange failed: ${res.status} ${JSON.stringify(json)}`);
  return json as GoogleTokenResponse;
}

/** Refreshes the access token using the stored refresh_token. */
export async function refreshAccessToken(params: {
  refresh_token: string;
  client_id: string;
  client_secret: string;
}): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: params.refresh_token,
      client_id: params.client_id,
      client_secret: params.client_secret,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`google token refresh failed: ${res.status} ${JSON.stringify(json)}`);
  return json as GoogleTokenResponse;
}

/** Parse a Google id_token (no signature check, just claims) for sub & email. */
export function parseIdToken(idToken: string): { sub?: string; email?: string } {
  try {
    const part = idToken.split('.')[1];
    if (!part) return {};
    return JSON.parse(b64urlDecodeStr(part));
  } catch {
    return {};
  }
}

/**
 * Loads the creator's Google account, refreshing the access token if expired.
 * Uses service role client (must be passed in).
 * Returns null if no connection exists.
 */
export async function getValidAccessToken(
  admin: ReturnType<typeof createClient>,
  creatorId: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; row: GoogleAccountRow } | null> {
  const { data, error } = await admin
    .from('creator_google_accounts')
    .select('*')
    .eq('creator_id', creatorId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as GoogleAccountRow;

  const expiresAt = new Date(row.expires_at).getTime();
  const needsRefresh = expiresAt - Date.now() < 60_000;
  if (!needsRefresh) return { accessToken: row.access_token, row };

  const refreshed = await refreshAccessToken({
    refresh_token: row.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await admin.from('creator_google_accounts').update({
    access_token: refreshed.access_token,
    expires_at: newExpiresAt,
  }).eq('creator_id', creatorId);

  return { accessToken: refreshed.access_token, row: { ...row, access_token: refreshed.access_token, expires_at: newExpiresAt } };
}

/** Revokes the refresh/access token at Google. */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).catch(() => {});
}
