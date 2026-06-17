// Shared CORS helper: restricts Access-Control-Allow-Origin to a known allowlist.
// Falls back to the canonical production origin when the request origin is unknown
// (e.g. server-to-server calls). Always echoes a valid origin, never "*".

const ALLOWED_ORIGINS = new Set<string>([
  "https://soynovu.cl",
  "https://www.soynovu.cl",
  "https://novuproject.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
]);

// Allow any *.lovable.app preview subdomain (id-preview--xxx.lovable.app, etc.)
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname.endsWith(".lovable.app")) return true;
    if (u.hostname.endsWith(".lovable.dev")) return true;
  } catch {
    return false;
  }
  return false;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin) ? origin! : "https://soynovu.cl";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
