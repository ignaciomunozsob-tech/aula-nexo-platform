import React from "react";
import { createRoot } from "react-dom/client";
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
async function handleRecoveryLink() {
  const url = new URL(window.location.href);
  const search = url.searchParams;
  const hash = window.location.hash || "";

  // --- PKCE flow: ?code=... in the query string ---
  const code = search.get("code");
  const errorDesc = search.get("error_description") || search.get("error");

  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (e) {
      console.error("[RECOVERY] exchangeCodeForSession failed", e);
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

  // --- Implicit/legacy flow: tokens in hash, not a router hash (#/...) ---
  if (!hash.startsWith("#") || hash.startsWith("#/")) return;

  const params = new URLSearchParams(hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");

  if (!accessToken || !refreshToken) return;

  try {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (e) {
    console.error("[RECOVERY] setSession failed", e);
  }

  const target = type === "recovery" ? "#/reset-password" : "#/";
  window.history.replaceState(null, "", url.pathname + url.search + target);
}

handleRecoveryLink().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
