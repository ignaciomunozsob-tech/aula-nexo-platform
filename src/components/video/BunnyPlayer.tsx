import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BunnyPlayerProps {
  videoId: string;
  title?: string;
  className?: string;
}

/**
 * Reproductor único para todos los videos alojados (Bunny Stream).
 *
 * Centraliza la configuración que antes estaba duplicada (y divergía) en el
 * player del curso, la página de evento y los subidores del creador:
 *  - misma política de referrer en todos los navegadores (Safari incluido)
 *  - misma lista de permisos del iframe + playsinline para iOS
 *  - token firmado que se refresca al volver a la pestaña / despertar el equipo
 *  - reintento automático y estado de error visible si el player no carga
 */
export default function BunnyPlayer({ videoId, title, className }: BunnyPlayerProps) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const autoRetried = useRef(false);

  const {
    data: signed,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["bunny-signed-embed", videoId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("bunny-sign-embed", {
        body: { videoId },
      });
      if (error) throw error;
      return (data ?? {}) as { url?: string; expires?: number };
    },
    enabled: !!videoId,
    // El token dura 1 hora: refrescamos con holgura para que un equipo
    // suspendido (típico en macOS/Safari) nunca reutilice una firma vencida.
    staleTime: 25 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Safari suspende pestañas en segundo plano y restaura desde bfcache: al
  // volver, pedimos una firma nueva antes de que el usuario presione play.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [refetch]);

  const retry = useCallback(async () => {
    setFailed(false);
    setLoaded(false);
    await refetch();
    setAttempt((a) => a + 1);
  }, [refetch]);

  // Si el iframe no reporta carga en 12s, reintentamos una vez con firma nueva.
  useEffect(() => {
    if (!signed?.url || loaded) return;
    const t = window.setTimeout(() => {
      if (loaded) return;
      if (!autoRetried.current) {
        autoRetried.current = true;
        console.warn("[BunnyPlayer] el reproductor no cargó, reintentando con firma nueva", { videoId });
        retry();
      } else {
        console.error("[BunnyPlayer] el reproductor no cargó tras el reintento", { videoId });
        setFailed(true);
      }
    }, 12000);
    return () => window.clearTimeout(t);
  }, [signed?.url, loaded, retry, videoId]);

  const src = signed?.url
    ? `${signed.url}&autoplay=false&preload=true&responsive=true&playsinline=true`
    : undefined;

  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6 bg-black">
        <p className="text-sm text-white/80">
          No pudimos cargar el video en este navegador.
        </p>
        <Button type="button" size="sm" variant="secondary" onClick={retry}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/70 text-sm bg-black">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {isFetching ? "Cargando video…" : "Preparando video…"}
      </div>
    );
  }

  return (
    <iframe
      key={`${videoId}-${attempt}`}
      src={src}
      title={title ?? "Reproductor de video"}
      onLoad={() => setLoaded(true)}
      referrerPolicy="strict-origin-when-cross-origin"
      className={className ?? "w-full h-full"}
      style={{ border: "none" }}
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
