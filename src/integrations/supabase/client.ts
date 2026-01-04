import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ------------------------------------------------------------------
// CONFIGURACIÓN DE SUPABASE (MVP)
// ------------------------------------------------------------------
// Al estar en Lovable/Web, definimos las claves directamente aquí
// para asegurar que la conexión nunca falle por variables de entorno.
// ------------------------------------------------------------------

const SUPABASE_URL = "https://kfyyzecqvjahdealixdp.supabase.co";
const SUPABASE_KEY = "sb_publishable_fOob5bA28HMHZc7jH4KoMA_oTz0S2XJ"

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
