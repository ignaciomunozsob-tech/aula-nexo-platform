import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ------------------------------------------------------------------
// CONFIGURACIÓN DE SUPABASE (MVP)
// ------------------------------------------------------------------
// Al estar en Lovable/Web, definimos las claves directamente aquí
// para asegurar que la conexión nunca falle por variables de entorno.
// ------------------------------------------------------------------

const SUPABASE_URL = "https://kfyyzecqvjahdealixdp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmeXl6ZWNxdmphaGRlYWxpeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODcxMzksImV4cCI6MjA4Mjk2MzEzOX0.spCQc1CRxtL2xGKLeYJAQJ9F5-22StFcel8I5blb62A";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
