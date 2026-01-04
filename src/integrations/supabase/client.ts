import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getEnv } from "@/lib/env";

// Intentamos obtener las variables de forma segura
let env = { supabaseUrl: "", supabaseKey: "" };

try {
  // getEnv lanzará error si faltan variables, lo capturamos aquí
  env = getEnv();
} catch (error) {
  console.warn("⚠️ Advertencia: No se cargaron las variables de entorno de Supabase.");
  console.warn(error);
}

const { supabaseUrl, supabaseKey } = env;

// Si faltan datos, usamos valores "placeholder" para que la app NO se rompa al inicio.
// Esto permitirá que cargue la interfaz y te muestre errores amigables en lugar de pantalla blanca.
const safeUrl = supabaseUrl || "https://placeholder.supabase.co";
const safeKey = supabaseKey || "placeholder-key";

export const supabase = createClient<Database>(safeUrl, safeKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
