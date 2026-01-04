// src/lib/env.ts
type Env = {
  supabaseUrl: string;
  supabaseKey: string;
};

function pick(...vals: Array<string | undefined | null>) {
  return vals.find((v) => typeof v === "string" && v.trim().length > 0)?.trim() || "";
}

/**
 * Vite solo expone variables que empiezan con VITE_
 * Aceptamos varias por si cambiaste nombres:
 * - VITE_SUPABASE_PUBLISHABLE_KEY (nuevo)
 * - VITE_SUPABASE_ANON_KEY (clásico)
 * - VITE_SUPABASE_KEY (fallback)
 */
export function getEnv(): Env {
  const supabaseUrl = pick(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_PUBLIC_SUPABASE_URL
  );

  const supabaseKey = pick(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    import.meta.env.VITE_SUPABASE_KEY
  );

  // Validaciones básicas para evitar pantallazo blanco
  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    throw new Error(
      `Falta VITE_SUPABASE_URL o es inválida. Valor actual: "${supabaseUrl}". Revisa tu archivo .env`
    );
  }

  if (!supabaseKey || supabaseKey.length < 20) {
    throw new Error(
      `Falta VITE_SUPABASE_PUBLISHABLE_KEY (o ANON_KEY). Valor actual: "${supabaseKey}". Revisa tu .env`
    );
  }

  return { supabaseUrl, supabaseKey };
}
