import { useEffect, useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, ShieldAlert, Link2, Unlink, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatRut, validateRut, cleanRut } from '@/lib/rut';
import { useSearchParams } from 'react-router-dom';


const schema = z.object({
  business_type: z.enum(['persona_natural', 'empresa']),
  tax_id: z.string().refine(validateRut, { message: 'RUT inválido' }),
  legal_name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150),
  document_type: z.enum(['boleta', 'factura']),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  billing_email: z.string().trim().email('Email inválido').max(255),
  bank_name: z.string().trim().min(2).max(80),
  bank_account_type: z.enum(['corriente', 'vista', 'ahorro', 'rut']),
  bank_account_number: z.string().trim().min(4).max(40),
  bank_account_holder: z.string().trim().min(2).max(150),
  bank_account_holder_tax_id: z.string().refine(validateRut, { message: 'RUT del titular inválido' }),
});

type FormState = z.infer<typeof schema>;

const empty: FormState = {
  business_type: 'persona_natural',
  tax_id: '',
  legal_name: '',
  document_type: 'boleta',
  address: '',
  city: '',
  region: '',
  billing_email: '',
  bank_name: '',
  bank_account_type: 'corriente',
  bank_account_number: '',
  bank_account_holder: '',
  bank_account_holder_tax_id: '',
};

const REGIONS = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
  'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío',
  'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes',
];

const BANKS = [
  'Banco de Chile', 'Banco Estado', 'Banco Santander', 'Banco BCI', 'Banco Itaú',
  'Banco Falabella', 'Banco Security', 'Banco Ripley', 'Banco Consorcio',
  'Banco Internacional', 'Banco BICE', 'Scotiabank', 'HSBC', 'Coopeuch',
  'Mercado Pago', 'TENPO', 'Otro',
];

export default function CreatorBillingPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(empty);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mp, setMp] = useState<{ connected: boolean; nickname?: string | null; email?: string | null; live_mode?: boolean } | null>(null);
  const [mpBusy, setMpBusy] = useState(false);
  const [params, setParams] = useSearchParams();

  // Show toast on return from MP OAuth
  useEffect(() => {
    const status = params.get('mp');
    if (status === 'connected') {
      toast.success('MercadoPago conectado correctamente');
      params.delete('mp'); setParams(params, { replace: true });
    } else if (status === 'error') {
      toast.error('No se pudo conectar MercadoPago. Intenta de nuevo.');
      params.delete('mp'); setParams(params, { replace: true });
    }
  }, [params, setParams]);

  // Load MP connection state
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('creator_mercadopago_accounts')
        .select('nickname, email, live_mode')
        .eq('creator_id', user.id)
        .maybeSingle();
      setMp(data ? { connected: true, ...data } : { connected: false });
    })();
  }, [user, params]);

  const connectMp = async () => {
    setMpBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { toast.error('Inicia sesión nuevamente'); return; }
      const redirectUri = `${window.location.origin}/mercadopago/callback`;
      const res = await fetch(
        `https://oahdxazzbqsdgfwwqbaj.supabase.co/functions/v1/mercadopago-oauth-start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ redirect_uri: redirectUri }),
        }
      );
      const body = await res.json();
      if (!res.ok || !body?.authorize_url) {
        toast.error(body?.error ?? 'No se pudo iniciar la conexión');
        return;
      }
      window.location.href = body.authorize_url;
    } finally {
      setMpBusy(false);
    }
  };

  const disconnectMp = async () => {
    if (!confirm('¿Desconectar tu cuenta de MercadoPago? Los pagos se pausarán hasta reconectar.')) return;
    setMpBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      const res = await fetch(
        `https://oahdxazzbqsdgfwwqbaj.supabase.co/functions/v1/mercadopago-disconnect`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        toast.success('MercadoPago desconectado');
        setMp({ connected: false });
      } else {
        toast.error('No se pudo desconectar');
      }
    } finally {
      setMpBusy(false);
    }
  };


  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('creator_billing_info')
        .select('*')
        .eq('creator_id', user.id)
        .maybeSingle();
      if (error) toast.error('No se pudieron cargar tus datos');
      if (data) {
        setForm({
          business_type: (data.business_type as any) ?? 'persona_natural',
          tax_id: data.tax_id ?? '',
          legal_name: data.legal_name ?? '',
          document_type: (data.document_type as any) ?? 'boleta',
          address: data.address ?? '',
          city: data.city ?? '',
          region: data.region ?? '',
          billing_email: data.billing_email ?? user.email ?? '',
          bank_name: data.bank_name ?? '',
          bank_account_type: (data.bank_account_type as any) ?? 'corriente',
          bank_account_number: data.bank_account_number ?? '',
          bank_account_holder: data.bank_account_holder ?? '',
          bank_account_holder_tax_id: data.bank_account_holder_tax_id ?? '',
        });
        setVerified(!!data.verified);
      } else {
        setForm((f) => ({ ...f, billing_email: user.email ?? '' }));
      }
      setLoading(false);
    })();
  }, [user]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first ?? 'Revisa los campos del formulario');
      return;
    }
    setSaving(true);
    const payload = {
      ...parsed.data,
      tax_id: cleanRut(parsed.data.tax_id),
      bank_account_holder_tax_id: cleanRut(parsed.data.bank_account_holder_tax_id),
      creator_id: user.id,
    };
    const { error } = await supabase
      .from('creator_billing_info')
      .upsert(payload, { onConflict: 'creator_id' });
    setSaving(false);
    if (error) toast.error('No se pudo guardar: ' + error.message);
    else toast.success('Datos guardados. Pendiente de verificación por NOVU.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Datos de facturación y pagos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Información requerida para emitir tu boleta/factura y transferirte tus ganancias.
            Estos datos son privados y solo NOVU puede verlos.
          </p>
        </div>
        {verified ? (
          <Badge variant="default" className="gap-1"><ShieldCheck className="h-3 w-3" />Verificado</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1"><ShieldAlert className="h-3 w-3" />Sin verificar</Badge>
        )}
      </div>

      <Card className={mp?.connected ? '' : 'border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            MercadoPago — Cuenta de cobro
          </CardTitle>
          <CardDescription>
            Conecta tu cuenta de MercadoPago para recibir los pagos directamente. NOVU descuenta
            automáticamente el 10% de comisión en cada venta y tú recibes el 90% en tu cuenta MP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mp?.connected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="font-medium">
                    Conectado{mp.nickname ? ` como ${mp.nickname}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {mp.email ?? 'Cuenta MercadoPago vinculada'}
                    {mp.live_mode === false && ' · Modo prueba'}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={disconnectMp} disabled={mpBusy}>
                {mpBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div className="text-sm">
                  Tu cuenta MercadoPago <strong>no está conectada</strong>. Sin esto, los alumnos no
                  pueden comprar tus productos.
                </div>
              </div>
              <Button onClick={connectMp} disabled={mpBusy}>
                {mpBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Conectar MercadoPago
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>

        <CardHeader>
          <CardTitle>Datos fiscales</CardTitle>
          <CardDescription>Para emisión de documentos tributarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de contribuyente</Label>
              <Select value={form.business_type} onValueChange={(v) => set('business_type', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="persona_natural">Persona natural</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Documento a emitir</Label>
              <Select value={form.document_type} onValueChange={(v) => set('document_type', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleta">Boleta de honorarios</SelectItem>
                  <SelectItem value="factura">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>RUT</Label>
              <Input
                value={form.tax_id}
                onChange={(e) => set('tax_id', e.target.value)}
                onBlur={(e) => set('tax_id', formatRut(e.target.value))}
                placeholder="12.345.678-9"
                maxLength={14}
              />
            </div>
            <div>
              <Label>{form.business_type === 'empresa' ? 'Razón social' : 'Nombre completo'}</Label>
              <Input value={form.legal_name} onChange={(e) => set('legal_name', e.target.value)} maxLength={150} />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label>Ciudad / Comuna</Label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label>Región</Label>
              <Select value={form.region} onValueChange={(v) => set('region', v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Email de facturación</Label>
              <Input type="email" value={form.billing_email} onChange={(e) => set('billing_email', e.target.value)} maxLength={255} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos bancarios (respaldo)</CardTitle>
          <CardDescription>
            Solo se usan si necesitamos transferirte fondos fuera de MercadoPago (ej. reembolsos
            de comisión, ajustes). Tus ventas normales llegan a tu cuenta MP conectada arriba.
          </CardDescription>

        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Banco</Label>
              <Select value={form.bank_name} onValueChange={(v) => set('bank_name', v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de cuenta</Label>
              <Select value={form.bank_account_type} onValueChange={(v) => set('bank_account_type', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corriente">Cuenta corriente</SelectItem>
                  <SelectItem value="vista">Cuenta vista</SelectItem>
                  <SelectItem value="ahorro">Cuenta de ahorro</SelectItem>
                  <SelectItem value="rut">Cuenta RUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número de cuenta</Label>
              <Input value={form.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)} maxLength={40} />
            </div>
            <div>
              <Label>Titular de la cuenta</Label>
              <Input value={form.bank_account_holder} onChange={(e) => set('bank_account_holder', e.target.value)} maxLength={150} />
            </div>
            <div className="md:col-span-2">
              <Label>RUT del titular</Label>
              <Input
                value={form.bank_account_holder_tax_id}
                onChange={(e) => set('bank_account_holder_tax_id', e.target.value)}
                onBlur={(e) => set('bank_account_holder_tax_id', formatRut(e.target.value))}
                placeholder="12.345.678-9"
                maxLength={14}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Guardar datos
        </Button>
      </div>
    </div>
  );
}
