import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const SUPPORT_WA = 'https://wa.me/56933728004';

type Ciclo = 'mensual' | 'anual';

const PRICING = {
  creador: { mensual: 14990, anual: 149900 },
  pro:     { mensual: 27990, anual: 279900 },
} as const;

const IVA = 0.19;
const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`;
const withIva = (n: number) => Math.round(n * (1 + IVA));

function PillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full"
      style={{ background: 'hsl(var(--novu-accent))', color: 'hsl(var(--novu-text-on-accent))' }}
    >
      {children}
    </span>
  );
}

function GreenBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
      {children}
    </span>
  );
}

function CycleToggle({
  ciclo,
  onChange,
  dark,
}: {
  ciclo: Ciclo;
  onChange: (v: Ciclo) => void;
  dark?: boolean;
}) {
  const base = dark ? 'bg-white/10' : 'bg-muted';
  const activeBg = dark ? 'bg-white text-black' : 'bg-background text-foreground shadow';
  const inactive = dark ? 'text-white/70' : 'text-muted-foreground';
  return (
    <div className={`inline-flex p-1 rounded-full text-xs font-semibold ${base}`}>
      <button
        type="button"
        onClick={() => onChange('mensual')}
        className={`px-3 py-1 rounded-full transition ${ciclo === 'mensual' ? activeBg : inactive}`}
      >
        Mensual
      </button>
      <button
        type="button"
        onClick={() => onChange('anual')}
        className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${ciclo === 'anual' ? activeBg : inactive}`}
      >
        Anual
        <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
          -2 meses
        </span>
      </button>
    </div>
  );
}

function PriceDisplay({
  plan,
  ciclo,
  dark,
}: {
  plan: 'creador' | 'pro';
  ciclo: Ciclo;
  dark?: boolean;
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : undefined;
  const fg = dark ? '#fff' : '#1a1a1a';
  if (ciclo === 'mensual') {
    const neto = PRICING[plan].mensual;
    const total = withIva(neto);
    return (
      <div>
        <div className="text-4xl font-black" style={{ color: fg }}>
          {fmt(neto)}
          <span className="text-base font-medium" style={{ color: muted ?? '#555' }}>/mes</span>
        </div>
        <p className="text-xs mt-1" style={{ color: muted ?? '#555' }}>+ IVA (19%)</p>
        <p className="text-xs" style={{ color: muted ?? '#888' }}>Total: {fmt(total)}/mes con IVA</p>
      </div>
    );
  }
  const anual = PRICING[plan].anual;
  const totalAnual = withIva(anual);
  const mensualEq = Math.round(anual / 12);
  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <div className="text-4xl font-black" style={{ color: fg }}>
          {fmt(mensualEq)}
          <span className="text-base font-medium" style={{ color: muted ?? '#555' }}>/mes</span>
        </div>
        <GreenBadge>2 meses gratis</GreenBadge>
      </div>
      <p className="text-xs mt-1" style={{ color: muted ?? '#555' }}>+ IVA (19%)</p>
      <p className="text-xs" style={{ color: muted ?? '#888' }}>
        {fmt(anual)} al año · Total con IVA: {fmt(totalAnual)}
      </p>
    </div>
  );
}

function FeatureItem({
  children,
  ok = true,
  soon,
  dark,
}: {
  children: React.ReactNode;
  ok?: boolean;
  soon?: boolean;
  dark?: boolean;
}) {
  const color = ok ? '#fcc70e' : dark ? 'rgba(255,255,255,0.4)' : '#bbb';
  const Icon = ok ? Check : X;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} strokeWidth={3} />
      <span className={ok ? '' : 'line-through opacity-60'}>
        {children}
        {soon && (
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border ml-2"
            style={{ borderColor: dark ? 'rgba(255,255,255,0.2)' : '#e5d9b3', color: dark ? 'rgba(255,255,255,0.7)' : '#7a6a3a' }}>
            Próximamente
          </span>
        )}
      </span>
    </li>
  );
}

// Comparative table
function YesCell() {
  return <Check className="h-5 w-5 mx-auto" style={{ color: '#fcc70e' }} strokeWidth={3} />;
}
function NoCell() {
  return <Minus className="h-4 w-4 mx-auto text-muted-foreground/50" />;
}
function SoonCell() {
  return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
      Próx.
    </span>
  );
}

const compareRows: Array<{ label: string; gratis: React.ReactNode; creador: React.ReactNode; pro: React.ReactNode }> = [
  { label: 'Cursos publicados', gratis: '2', creador: '10', pro: 'Ilimitados' },
  { label: 'Comisión por venta', gratis: '10%', creador: '5%', pro: '2%' },
  { label: 'Videos vía YouTube/Vimeo', gratis: <YesCell />, creador: <YesCell />, pro: <YesCell /> },
  { label: 'Subida directa de videos', gratis: <NoCell />, creador: <YesCell />, pro: <YesCell /> },
  { label: 'Archivos descargables', gratis: '10MB', creador: '50MB', pro: '200MB' },
  { label: 'Alumnos manuales', gratis: '10', creador: '10', pro: 'Ilimitados' },
  { label: 'Cupones de descuento', gratis: <NoCell />, creador: <YesCell />, pro: <YesCell /> },
  { label: 'Email de bienvenida personalizado', gratis: <NoCell />, creador: <YesCell />, pro: <YesCell /> },
  { label: 'Estadísticas básicas', gratis: <YesCell />, creador: <YesCell />, pro: <YesCell /> },
  { label: 'Estadísticas avanzadas', gratis: <NoCell />, creador: <NoCell />, pro: <YesCell /> },
  { label: 'Píxel de Meta', gratis: <NoCell />, creador: <NoCell />, pro: <YesCell /> },
  { label: 'Order bump', gratis: <NoCell />, creador: <NoCell />, pro: <YesCell /> },
  { label: 'Carritos abandonados', gratis: <NoCell />, creador: <NoCell />, pro: <YesCell /> },
  { label: 'Programa de afiliados', gratis: <NoCell />, creador: <NoCell />, pro: <YesCell /> },
  { label: 'Comunidad por curso', gratis: <NoCell />, creador: <NoCell />, pro: <YesCell /> },
  { label: 'Agenda 1:1', gratis: <NoCell />, creador: <SoonCell />, pro: <SoonCell /> },
  { label: 'Soporte', gratis: 'Documentación', creador: 'WhatsApp', pro: 'Prioritario' },
];

export default function PreciosPage() {
  const [cicloCreador, setCicloCreador] = useState<Ciclo>('mensual');
  const [cicloPro, setCicloPro] = useState<Ciclo>('mensual');

  return (
    <>
      <SEO
        title="Precios y planes — NOVU"
        description="Compara los planes de NOVU: Gratis, Creador ($14.990/mes) y Pro ($27.990/mes). Suscripción mensual o anual con 2 meses gratis. Sin contratos."
        path="/precios"
      />

      {/* HEADER */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="flex justify-center mb-5">
          <PillBadge>Planes y precios</PillBadge>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground">
          Empieza gratis.<br className="hidden md:block" /> Escala cuando quieras
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sin contratos. Sin sorpresas. Paga mensual o anual con 2 meses gratis.
        </p>
      </section>

      {/* PLAN CARDS */}
      <section className="max-w-[1100px] mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {/* GRATIS */}
          <div className="rounded-2xl border border-border bg-card p-7 flex flex-col">
            <h3 className="text-xl font-bold text-foreground">Gratis</h3>
            <p className="text-sm text-muted-foreground mt-1">Para empezar a vender</p>
            <div className="mt-5 mb-1">
              <div className="text-4xl font-black text-foreground">
                $0<span className="text-base font-medium text-muted-foreground">/mes</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Comisión 10% por venta</p>
            </div>
            <Button variant="outline" className="mt-5 w-full" asChild>
              <Link to="/signup">Empezar gratis</Link>
            </Button>
            <ul className="mt-6 space-y-2.5 flex-1">
              <FeatureItem>Hasta 2 cursos publicados</FeatureItem>
              <FeatureItem>Videos vía YouTube o Vimeo</FeatureItem>
              <FeatureItem>Archivos hasta 10MB</FeatureItem>
              <FeatureItem>Hasta 10 alumnos manuales</FeatureItem>
              <FeatureItem>Estadísticas básicas</FeatureItem>
              <FeatureItem>Soporte vía documentación</FeatureItem>
            </ul>
          </div>

          {/* CREADOR */}
          <div
            className="relative rounded-2xl p-7 flex flex-col border-2"
            style={{ borderColor: '#fcc70e', background: 'var(--novu-creator-card, #fffbf0)' }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <PillBadge>Más popular</PillBadge>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>Creador</h3>
                <p className="text-sm mt-1" style={{ color: '#555' }}>Para creadores que quieren escalar</p>
              </div>
            </div>
            <div className="mb-3">
              <CycleToggle ciclo={cicloCreador} onChange={setCicloCreador} />
            </div>
            <div className="mb-1">
              <PriceDisplay plan="creador" ciclo={cicloCreador} />
              <p className="text-xs mt-1" style={{ color: '#555' }}>Comisión 5% por venta</p>
            </div>
            <Button
              className="mt-5 w-full font-bold"
              style={{ background: '#fcc70e', color: '#1a1a1a' }}
              asChild
            >
              <Link to={`/suscripcion/checkout?plan=creador&ciclo=${cicloCreador}`}>
                Suscribirme
              </Link>
            </Button>
            <ul className="mt-6 space-y-2.5 flex-1" style={{ color: '#1a1a1a' }}>
              <FeatureItem>Hasta 10 cursos publicados</FeatureItem>
              <FeatureItem>Sube tus propios videos</FeatureItem>
              <FeatureItem>Archivos hasta 50MB</FeatureItem>
              <FeatureItem>Hasta 10 alumnos manuales</FeatureItem>
              <FeatureItem>Cupones de descuento</FeatureItem>
              <FeatureItem>Email de bienvenida personalizado</FeatureItem>
              <FeatureItem>Estadísticas básicas</FeatureItem>
              <FeatureItem>Soporte vía WhatsApp</FeatureItem>
              <FeatureItem soon>Agenda 1:1</FeatureItem>
            </ul>
          </div>

          {/* PRO — dark */}
          <div className="rounded-2xl p-7 flex flex-col border-2" style={{ background: '#0a0a0a', color: '#fff', borderColor: '#fcc70e' }}>
            <h3 className="text-xl font-bold">Pro</h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Todo lo que necesitas para escalar tu negocio
            </p>
            <div className="mt-4 mb-3">
              <CycleToggle ciclo={cicloPro} onChange={setCicloPro} dark />
            </div>
            <div className="mb-1">
              <PriceDisplay plan="pro" ciclo={cicloPro} dark />
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Comisión 2% por venta</p>
            </div>
            <Button
              className="mt-5 w-full font-bold"
              style={{ background: '#fcc70e', color: '#1a1a1a' }}
              asChild
            >
              <Link to={`/suscripcion/checkout?plan=pro&ciclo=${cicloPro}`}>
                Suscribirme
              </Link>
            </Button>
            <ul className="mt-6 space-y-2.5 flex-1">
              <FeatureItem dark>Cursos ilimitados</FeatureItem>
              <FeatureItem dark>Sube tus propios videos</FeatureItem>
              <FeatureItem dark>Archivos hasta 200MB</FeatureItem>
              <FeatureItem dark>Alumnos manuales ilimitados</FeatureItem>
              <FeatureItem dark>Cupones de descuento</FeatureItem>
              <FeatureItem dark>Email de bienvenida personalizado</FeatureItem>
              <FeatureItem dark>Estadísticas avanzadas</FeatureItem>
              <FeatureItem dark>Píxel de Meta</FeatureItem>
              <FeatureItem dark>Order bump</FeatureItem>
              <FeatureItem dark>Carritos abandonados</FeatureItem>
              <FeatureItem dark>Programa de afiliados</FeatureItem>
              <FeatureItem dark>Comunidad por curso</FeatureItem>
              <FeatureItem dark soon>Agenda 1:1</FeatureItem>
              <FeatureItem dark>Soporte prioritario WhatsApp</FeatureItem>
            </ul>
          </div>
        </div>
      </section>

      {/* COMPARATIVA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-6 text-center">Compara los planes</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f3f4f6', color: '#1a1a1a' }}>
                <th className="text-left px-5 py-4 font-bold">Feature</th>
                <th className="px-5 py-4 font-bold text-center">Gratis</th>
                <th className="px-5 py-4 font-bold text-center" style={{ background: '#fffbf0' }}>Creador</th>
                <th className="px-5 py-4 font-bold text-center" style={{ background: '#0a0a0a', color: '#fff', borderLeft: '2px solid #fcc70e', borderRight: '2px solid #fcc70e' }}>Pro</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r, i) => (
                <tr key={r.label} className={i % 2 === 1 ? 'bg-muted/40' : ''}>
                  <td className="px-5 py-3.5 font-medium text-foreground">{r.label}</td>
                  <td className="px-5 py-3.5 text-center text-foreground/90">{r.gratis}</td>
                  <td className="px-5 py-3.5 text-center" style={{ background: '#fffbf0', color: '#1a1a1a' }}>{r.creador}</td>
                  <td className="px-5 py-3.5 text-center" style={{ background: '#0a0a0a', color: '#fff', borderLeft: '2px solid #fcc70e', borderRight: '2px solid #fcc70e' }}>{r.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-6 text-center">Preguntas sobre los planes</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="q1">
            <AccordionTrigger>¿Los precios incluyen IVA?</AccordionTrigger>
            <AccordionContent>
              Los precios mostrados son netos (sin IVA). Sobre cada cobro se aplica el IVA del 19% según la normativa chilena. El total con IVA aparece debajo de cada precio.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2">
            <AccordionTrigger>¿Cuánto ahorro pagando anual?</AccordionTrigger>
            <AccordionContent>
              El plan anual equivale a 10 meses, es decir, 2 meses gratis. Por ejemplo, Creador anual cuesta $149.900 + IVA en vez de $179.880 + IVA si pagaras 12 meses.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q3">
            <AccordionTrigger>¿Puedo cambiar de plan cuando quiera?</AccordionTrigger>
            <AccordionContent>
              Sí. Puedes subir o bajar de plan en cualquier momento desde tu panel de creador.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q4">
            <AccordionTrigger>¿Qué métodos de pago aceptan?</AccordionTrigger>
            <AccordionContent>
              MercadoPago (tarjeta de crédito/débito) para pagos mensuales y anuales. Para el pago anual también aceptamos transferencia bancaria.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q5">
            <AccordionTrigger>¿Emiten factura?</AccordionTrigger>
            <AccordionContent>
              Sí. Al suscribirte puedes elegir entre boleta (por defecto) o factura. Si eliges factura, te pediremos RUT, razón social, giro y dirección. El documento se emite manualmente en 24–48 horas hábiles.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q6">
            <AccordionTrigger>¿La comisión se aplica sobre el precio total?</AccordionTrigger>
            <AccordionContent>
              Sí. La comisión de NOVU se calcula sobre el precio total de cada venta (10% en Gratis, 5% en Creador, 2% en Pro). A eso se suma la comisión de MercadoPago según el método de pago.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: '#0a0a0a' }} className="px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white">¿Tienes dudas? Hablemos</h2>
          <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Te ayudamos a elegir el plan correcto para tu negocio
          </p>
          <a
            href={SUPPORT_WA}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center mt-7 px-7 py-3.5 rounded-full font-bold text-base transition-transform hover:scale-105"
            style={{ background: '#fcc70e', color: '#1a1a1a' }}
          >
            Escribir al soporte
          </a>
        </div>
      </section>
    </>
  );
}
