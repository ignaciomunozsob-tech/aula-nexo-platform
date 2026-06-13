import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Building2, CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Plan = 'creador' | 'pro';
type Ciclo = 'mensual' | 'anual';
type Doc = 'boleta' | 'factura';
type Metodo = 'mercadopago' | 'transferencia';

const PRICING: Record<Plan, Record<Ciclo, number>> = {
  creador: { mensual: 14990, anual: 149900 },
  pro:     { mensual: 27990, anual: 279900 },
};
const LABELS: Record<Plan, string> = { creador: 'Plan Creador', pro: 'Plan Pro' };
const IVA = 0.19;
const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

// Placeholder bank info — actualiza con los datos reales
const BANK_INFO = {
  banco: 'Banco de Chile',
  titular: 'NOVU SpA',
  rut: '77.000.000-0',
  cuenta: 'Cuenta Corriente N°00000000',
  email: 'pagos@novu.cl',
};

export default function SubscripcionCheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const planParam = (params.get('plan') === 'pro' ? 'pro' : 'creador') as Plan;
  const cicloParam = (params.get('ciclo') === 'anual' ? 'anual' : 'mensual') as Ciclo;

  const [doc, setDoc] = useState<Doc>('boleta');
  const [rut, setRut] = useState('');
  const [razon, setRazon] = useState('');
  const [giro, setGiro] = useState('');
  const [direccion, setDireccion] = useState('');
  const [metodo, setMetodo] = useState<Metodo>('mercadopago');
  const [submitting, setSubmitting] = useState(false);

  const neto = PRICING[planParam][cicloParam];
  const iva = Math.round(neto * IVA);
  const total = neto + iva;

  const transferenciaDisponible = cicloParam === 'anual';

  const subjectTransfer = useMemo(
    () => `Suscripción NOVU ${LABELS[planParam]} ${cicloParam} - ${user?.email ?? ''}`,
    [planParam, cicloParam, user],
  );

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para suscribirte');
      navigate(`/login?redirect=${encodeURIComponent(`/suscripcion/checkout?plan=${planParam}&ciclo=${cicloParam}`)}`);
      return;
    }
    if (doc === 'factura' && (!rut.trim() || !razon.trim() || !giro.trim() || !direccion.trim())) {
      toast.error('Completa todos los datos de facturación');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('subscription_requests').insert({
        creator_id: user.id,
        plan: planParam,
        ciclo: cicloParam,
        metodo,
        documento: doc,
        rut_empresa: doc === 'factura' ? rut.trim() : null,
        razon_social: doc === 'factura' ? razon.trim() : null,
        giro: doc === 'factura' ? giro.trim() : null,
        direccion: doc === 'factura' ? direccion.trim() : null,
        amount_neto_clp: neto,
        amount_total_clp: total,
        status: metodo === 'transferencia' ? 'pending_transfer' : 'pending_payment',
      });
      if (error) throw error;
      toast.success('¡Solicitud recibida! Te contactaremos en menos de 24h hábiles.');
      navigate('/creator-app/plan');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'No pudimos registrar tu solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO title={`Suscripción ${LABELS[planParam]} — NOVU`} description="Completa tu suscripción a NOVU." path="/suscripcion/checkout" />
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Link to="/precios" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a precios
          </Link>

          <h1 className="text-3xl font-black mb-1">Confirma tu suscripción</h1>
          <p className="text-muted-foreground mb-8">Revisa tu plan y completa los datos de pago.</p>

          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            {/* LEFT: form */}
            <div className="space-y-8">
              {/* Documento */}
              <section className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">¿Qué documento necesitas?</h2>
                <RadioGroup value={doc} onValueChange={(v) => setDoc(v as Doc)} className="grid sm:grid-cols-2 gap-3">
                  <label className={`border rounded-xl p-4 cursor-pointer flex items-start gap-3 transition ${doc === 'boleta' ? 'border-foreground' : 'border-border'}`}>
                    <RadioGroupItem value="boleta" id="doc-boleta" className="mt-0.5" />
                    <div>
                      <p className="font-semibold">Boleta</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Para personas naturales</p>
                    </div>
                  </label>
                  <label className={`border rounded-xl p-4 cursor-pointer flex items-start gap-3 transition ${doc === 'factura' ? 'border-foreground' : 'border-border'}`}>
                    <RadioGroupItem value="factura" id="doc-factura" className="mt-0.5" />
                    <div>
                      <p className="font-semibold">Factura</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Para empresas con giro</p>
                    </div>
                  </label>
                </RadioGroup>

                {doc === 'factura' && (
                  <div className="grid sm:grid-cols-2 gap-4 mt-5">
                    <div>
                      <Label htmlFor="rut">RUT empresa</Label>
                      <Input id="rut" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="77.000.000-0" />
                    </div>
                    <div>
                      <Label htmlFor="razon">Razón social</Label>
                      <Input id="razon" value={razon} onChange={(e) => setRazon(e.target.value)} placeholder="Mi Empresa SpA" />
                    </div>
                    <div>
                      <Label htmlFor="giro">Giro</Label>
                      <Input id="giro" value={giro} onChange={(e) => setGiro(e.target.value)} placeholder="Servicios de capacitación" />
                    </div>
                    <div>
                      <Label htmlFor="direccion">Dirección</Label>
                      <Input id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Av. Apoquindo 1234, Santiago" />
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-4">
                  El documento será emitido manualmente en un plazo de 24-48 horas hábiles.
                </p>
              </section>

              {/* Método de pago */}
              <section className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Método de pago</h2>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setMetodo('mercadopago')}
                    className={`w-full border rounded-xl p-4 flex items-start gap-3 text-left transition ${metodo === 'mercadopago' ? 'border-foreground' : 'border-border'}`}
                  >
                    <CreditCard className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">MercadoPago</p>
                      <p className="text-xs text-muted-foreground">Tarjeta de crédito o débito</p>
                    </div>
                    {metodo === 'mercadopago' && <Check className="h-5 w-5" style={{ color: '#fcc70e' }} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => transferenciaDisponible && setMetodo('transferencia')}
                    disabled={!transferenciaDisponible}
                    className={`w-full border rounded-xl p-4 flex items-start gap-3 text-left transition ${
                      !transferenciaDisponible
                        ? 'opacity-50 cursor-not-allowed border-border'
                        : metodo === 'transferencia'
                          ? 'border-foreground'
                          : 'border-border'
                    }`}
                  >
                    <Building2 className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Transferencia bancaria</p>
                      <p className="text-xs text-muted-foreground">
                        {transferenciaDisponible ? 'Disponible para pagos anuales' : 'Solo disponible en pago anual'}
                      </p>
                    </div>
                    {metodo === 'transferencia' && <Check className="h-5 w-5" style={{ color: '#fcc70e' }} />}
                  </button>
                </div>

                {metodo === 'transferencia' && transferenciaDisponible && (
                  <div className="mt-5 bg-muted/40 border border-border rounded-xl p-4 text-sm space-y-1">
                    <p><span className="font-semibold">Banco:</span> {BANK_INFO.banco}</p>
                    <p><span className="font-semibold">Titular:</span> {BANK_INFO.titular}</p>
                    <p><span className="font-semibold">RUT:</span> {BANK_INFO.rut}</p>
                    <p><span className="font-semibold">Cuenta:</span> {BANK_INFO.cuenta}</p>
                    <p><span className="font-semibold">Email:</span> {BANK_INFO.email}</p>
                    <p><span className="font-semibold">Asunto:</span> {subjectTransfer}</p>
                    <p className="text-xs text-muted-foreground pt-2">
                      Una vez realizada la transferencia, envía el comprobante a {BANK_INFO.email} y activaremos
                      tu plan en menos de 24 horas hábiles.
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT: summary */}
            <aside className="lg:sticky lg:top-6 h-fit">
              <div className="bg-card border-2 rounded-2xl p-6 space-y-4" style={{ borderColor: '#fcc70e' }}>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan elegido</p>
                  <h3 className="text-2xl font-bold mt-1">{LABELS[planParam]}</h3>
                  <p className="text-sm text-muted-foreground">
                    Pago {cicloParam === 'anual' ? 'anual (2 meses gratis)' : 'mensual'}
                  </p>
                </div>

                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio neto</span>
                    <span className="font-semibold">{fmt(neto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA (19%)</span>
                    <span className="font-semibold">{fmt(iva)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border text-base">
                    <span className="font-bold">Total a pagar</span>
                    <span className="font-black" style={{ color: '#fcc70e' }}>{fmt(total)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {cicloParam === 'anual' ? 'cobro único anual' : 'cobro mensual'}
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full font-bold py-6 rounded-xl"
                  style={{ background: '#fcc70e', color: '#1a1a1a' }}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {metodo === 'transferencia' ? 'Confirmar y recibir datos' : 'Confirmar suscripción'}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Al confirmar aceptas nuestros <Link to="/terminos" className="underline">Términos</Link>.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
