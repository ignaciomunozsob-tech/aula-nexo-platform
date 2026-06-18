import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

/**
 * Normalize legacy hash-based URLs (#/path) to plain paths so the
 * new BrowserRouter can handle them. Any old shared link, email link
 * or third-party redirect that still includes "/#/" lands on the right
 * page transparently.
 *
 * Tokens for password recovery may also arrive in the hash; we extract
 * them BEFORE normalizing.
 */
function getAuthParamsFromUrl(url: URL) {
  const hash = window.location.hash || "";
  const hashBody = hash.startsWith("#") ? hash.slice(1) : hash;
  const candidates = [url.searchParams];

  if (hashBody) {
    candidates.push(new URLSearchParams(hashBody));

    const queryIndex = hashBody.indexOf("?");
    if (queryIndex >= 0) candidates.push(new URLSearchParams(hashBody.slice(queryIndex + 1)));

    const nestedHashIndex = hashBody.indexOf("#");
    if (nestedHashIndex >= 0) candidates.push(new URLSearchParams(hashBody.slice(nestedHashIndex + 1)));

    const tokenIndex = hashBody.indexOf("access_token=");
    if (tokenIndex >= 0) candidates.push(new URLSearchParams(hashBody.slice(tokenIndex)));

    const codeIndex = hashBody.indexOf("code=");
    if (codeIndex >= 0) candidates.push(new URLSearchParams(hashBody.slice(codeIndex)));
  }

  return candidates.find((params) =>
    params.has("code") ||
    params.has("access_token") ||
    params.has("error") ||
    params.has("error_description")
  ) || url.searchParams;
}

async function handleRecoveryLink() {
  const url = new URL(window.location.href);
  const search = getAuthParamsFromUrl(url);
  const hash = window.location.hash || "";

  const code = search.get("code");
  const errorDesc = search.get("error_description") || search.get("error");

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } catch (e) {
      console.error("[RECOVERY] exchangeCodeForSession failed", e);
      window.history.replaceState(null, "", "/forgot-password");
      return true;
    }
    window.history.replaceState(null, "", "/reset-password");
    return true;
  }

  if (errorDesc) {
    console.warn("[RECOVERY] error from provider:", errorDesc);
    window.history.replaceState(null, "", "/forgot-password");
    return true;
  }

  if (!hash.startsWith("#")) return false;

  const accessToken = search.get("access_token");
  const refreshToken = search.get("refresh_token");
  const type = search.get("type");

  if (!accessToken || !refreshToken) return false;

  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[RECOVERY] setSession failed", e);
    window.history.replaceState(null, "", "/forgot-password");
    return true;
  }

  const target = type === "recovery" ? "/reset-password" : "/";
  window.history.replaceState(null, "", target);
  return true;
}

async function handleMercadoPagoCallback() {
  const url = new URL(window.location.href);
  if (url.pathname !== "/mercadopago/callback") return false;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code) {
    window.history.replaceState(null, "", "/creator-app/billing?mp=error");
    return true;
  }

  try {
    const redirectUri = `${url.origin}/mercadopago/callback`;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      window.history.replaceState(null, "", "/login?next=/creator-app/billing");
      return true;
    }
    const res = await fetch(
      `https://oahdxazzbqsdgfwwqbaj.supabase.co/functions/v1/mercadopago-oauth-callback`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
      }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("MP OAuth callback failed", body);
      window.history.replaceState(null, "", "/creator-app/billing?mp=error");
      return true;
    }
    window.history.replaceState(null, "", "/creator-app/billing?mp=connected");
  } catch (e) {
    console.error("MP OAuth callback exception", e);
    window.history.replaceState(null, "", "/creator-app/billing?mp=error");
  }
  return true;
}

/**
 * Strip legacy `#/path` hashes left over from the old HashRouter so the
 * BrowserRouter sees a plain URL.
 */
function normalizeLegacyHashRoute() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#/")) return;
  const stripped = hash.slice(1); // "/path?foo"
  const url = new URL(window.location.href);
  // Preserve current search params, then append/merge hash-route params.
  const [path, query = ""] = stripped.split("?");
  const merged = new URLSearchParams(url.search);
  new URLSearchParams(query).forEach((v, k) => merged.set(k, v));
  const search = merged.toString() ? `?${merged.toString()}` : "";
  window.history.replaceState(null, "", `${path}${search}`);
}

(async () => {
  const mpHandled = await handleMercadoPagoCallback();
  if (!mpHandled) {
    const recoveryHandled = await handleRecoveryLink();
    if (!recoveryHandled) normalizeLegacyHashRoute();
  }

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </React.StrictMode>
  );
})();
