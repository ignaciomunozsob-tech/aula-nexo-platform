import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

/**
 * HashRouter + Supabase recovery email fix.
 *
 * Supabase appends auth tokens as `#access_token=...&type=recovery` to the
 * redirect URL. With HashRouter, the URL becomes
 * `/#access_token=...&type=recovery`, which the router treats as an unknown
 * route. We intercept that case, set the session manually from the tokens,
 * then rewrite the hash to `#/reset-password` so the user lands on the right
 * page with a valid recovery session.
 */
async function handleRecoveryHash() {
  const hash = window.location.hash || "";
  // Only handle when hash is the auth-tokens hash (not a router hash starting with #/)
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

  // Route into the app
  const target = type === "recovery" ? "#/reset-password" : "#/";
  window.history.replaceState(null, "", window.location.pathname + window.location.search + target);
}

handleRecoveryHash().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
