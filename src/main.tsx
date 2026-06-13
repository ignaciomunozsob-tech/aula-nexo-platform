import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

/**
 * Handle Supabase password recovery links before mounting the app.
 *
 * Supabase may deliver recovery sessions in two ways:
 * 1. PKCE flow (current): `?code=...` appended to the redirect URL search.
 *    We must call `exchangeCodeForSession(code)`.
 * 2. Implicit/legacy flow: `#access_token=...&refresh_token=...&type=recovery`
 *    in the URL hash. We call `setSession({...})`.
 *
 * Because the app uses HashRouter, after handling the tokens we rewrite the
 * URL to `#/reset-password` so the router lands on the right page.
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

  // --- PKCE flow: ?code=... in the query string ---
  const code = search.get("code");
  const errorDesc = search.get("error_description") || search.get("error");

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } catch (e) {
      console.error("[RECOVERY] exchangeCodeForSession failed", e);
      window.history.replaceState(null, "", url.pathname + "#/forgot-password");
      return;
    }
    // Clean ?code from URL and route to reset page
    window.history.replaceState(null, "", url.pathname + "#/reset-password");
    return;
  }

  if (errorDesc) {
    console.warn("[RECOVERY] error from provider:", errorDesc);
    window.history.replaceState(null, "", url.pathname + "#/forgot-password");
    return;
  }

  // --- Implicit/legacy flow: tokens in hash, including HashRouter nested hashes ---
  if (!hash.startsWith("#")) return;

  const accessToken = search.get("access_token");
  const refreshToken = search.get("refresh_token");
  const type = search.get("type");

  if (!accessToken || !refreshToken) return;

  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[RECOVERY] setSession failed", e);
    window.history.replaceState(null, "", url.pathname + "#/forgot-password");
    return;
  }

  const target = type === "recovery" ? "#/reset-password" : "#/";
  window.history.replaceState(null, "", url.pathname + target);
}

/**
 * Handle MercadoPago OAuth callback before the recovery handler (both use ?code=).
 * Path is /mercadopago/callback so we can detect it without interfering with recovery.
 */
async function handleMercadoPagoCallback() {
  const url = new URL(window.location.href);
  if (url.pathname !== "/mercadopago/callback") return false;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code) {
    window.history.replaceState(null, "", "/#/creator/billing?mp=error");
    return true;
  }

  try {
    const redirectUri = `${url.origin}/mercadopago/callback`;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      window.history.replaceState(null, "", "/#/login?next=/creator/billing");
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
      window.history.replaceState(null, "", "/#/creator/billing?mp=error");
      return true;
    }
    window.history.replaceState(null, "", "/#/creator/billing?mp=connected");
  } catch (e) {
    console.error("MP OAuth callback exception", e);
    window.history.replaceState(null, "", "/#/creator/billing?mp=error");
  }
  return true;
}

handleMercadoPagoCallback().then((handled) => {
  const next = handled ? Promise.resolve() : handleRecoveryLink();
  next.finally(() => {
    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
});

