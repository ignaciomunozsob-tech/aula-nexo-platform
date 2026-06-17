import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = 'loading' | 'valid' | 'invalid' | 'already' | 'success' | 'error';

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) { setState('invalid'); return; }
        if (data.valid === false && data.reason === 'already_unsubscribed') setState('already');
        else if (data.valid) setState('valid');
        else setState('invalid');
      } catch {
        setState('error');
      }
    })();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) setState('success');
      else if (data.reason === 'already_unsubscribed') setState('already');
      else setState('error');
    } catch {
      setState('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 text-center">
        <Link to="/" className="inline-block mb-6 text-xl font-bold">NOVU</Link>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Validando…</p>
          </div>
        )}

        {state === 'valid' && (
          <>
            <h1 className="text-2xl font-bold mb-3">¿Quieres darte de baja?</h1>
            <p className="text-muted-foreground mb-6">
              Dejarás de recibir correos de NOVU en esta dirección.
            </p>
            <Button onClick={confirm} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar baja
            </Button>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold mb-2">Listo</h1>
            <p className="text-muted-foreground">Te diste de baja correctamente.</p>
          </>
        )}

        {state === 'already' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-2xl font-bold mb-2">Ya estabas de baja</h1>
            <p className="text-muted-foreground">No recibirás más correos.</p>
          </>
        )}

        {(state === 'invalid' || state === 'error') && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <h1 className="text-2xl font-bold mb-2">Enlace inválido</h1>
            <p className="text-muted-foreground">
              El enlace expiró o no es válido. Si necesitas ayuda escríbenos.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
