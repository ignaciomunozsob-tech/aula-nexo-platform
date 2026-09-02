import { Link } from "react-router-dom";
import { useState } from "react";
import {
  FileVideo,
  BookOpen,
  Layout,
  CalendarDays,
  CalendarClock,
  Globe,
  Users,
  Award,
  LineChart,
  Target,
  ShoppingBag,
  Handshake,
  Ticket,
  Mail,
  Wallet,
  MessageCircle,
  MessagesSquare,
  AtSign,
  DollarSign,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SUPPORT_WA = "https://wa.me/56933728004";

function PillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full"
      style={{ background: "hsl(var(--novu-accent))", color: "hsl(var(--novu-text-on-accent))" }}
    >
      {children}
    </span>
  );
}

function SoonBadge() {
  return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
      Próximamente
    </span>
  );
}

const features: Array<{ icon: any; label: string; badge?: string }> = [
  { icon: FileVideo, label: "Cursos grabados" },
  { icon: BookOpen, label: "Ebooks y guías" },
  { icon: Layout, label: "Plantillas" },
  { icon: CalendarClock, label: "Agenda 1:1" },
  { icon: CalendarDays, label: "Eventos agendables" },
  { icon: Globe, label: "Página de curso profesional" },
  { icon: Users, label: "Gestión de alumnos" },
  { icon: Award, label: "Certificados automáticos" },
  { icon: LineChart, label: "Estadísticas" },
  { icon: Target, label: "Píxel de Meta" },
  { icon: ShoppingBag, label: "Carritos abandonados" },
  { icon: Handshake, label: "Programa de afiliados" },
  { icon: Ticket, label: "Cupones de descuento" },
  { icon: Mail, label: "Email de bienvenida personalizado" },
  { icon: Wallet, label: "Finanzas en tiempo real" },
  { icon: MessageCircle, label: "Soporte WhatsApp" },
  { icon: MessagesSquare, label: "Comunidad por curso", badge: "+$990 por venta" },
];

const MP_FEES: Record<number, number> = {
  1: 0.0289,
  2: 0.035,
  3: 0.045,
  6: 0.065,
  12: 0.09,
};

function CommissionCalculator() {
  const [price, setPrice] = useState(50000);
  const [cuotas, setCuotas] = useState(1);

  const novuFee = price * 0.1;
  const creatorNet = price - novuFee;

  const fmt = (n: number) =>
    n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

  return (
    <div
      className="rounded-3xl p-8 max-w-[620px] mx-auto border border-border"
      style={{ background: "var(--color-bg-secondary, #f8f9fb)" }}
    >
      <h3 className="text-lg font-bold text-foreground mb-6 text-center">Calcula tu ganancia</h3>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Precio de tu producto</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
            <input
              type="number"
              min={1000}
              max={10000000}
              step={1000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background text-foreground font-bold text-lg focus:outline-none"
            />
          </div>
          <input
            type="range"
            min={5000}
            max={500000}
            step={5000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full mt-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$5.000</span>
            <span>$500.000</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Cuotas sin interés que ofrecerás</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 6, 12].map((c) => (
              <button
                key={c}
                onClick={() => setCuotas(c)}
                className="py-2.5 rounded-xl text-sm font-bold transition-all border"
                style={{
                  background: cuotas === c ? "hsl(var(--novu-accent))" : "transparent",
                  color: cuotas === c ? "hsl(var(--novu-text-on-accent))" : "hsl(var(--foreground))",
                  borderColor: cuotas === c ? "hsl(var(--novu-accent))" : "hsl(var(--border))",
                }}
              >
                {c === 1 ? "1" : `${c}x`}
              </button>
            ))}
          </div>
          {cuotas > 3 && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              ⚠️ En cuotas altas, MercadoPago cobra más al procesador. Te recomendamos máximo 3 cuotas para mantener tu
              margen.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl overflow-hidden border border-border">
        <div className="grid grid-cols-1 divide-y divide-border">
          <div className="flex justify-between items-center px-5 py-3.5 bg-background">
            <span className="text-sm text-muted-foreground">Precio del producto</span>
            <span className="font-bold text-foreground">{fmt(price)}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3.5 bg-background">
            <span className="text-sm text-muted-foreground">Comisión NOVU (10%)</span>
            <span className="font-bold text-red-500">-{fmt(novuFee)}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-4 bg-background">
            <div>
              <span className="text-base font-bold text-foreground">Tú recibes</span>
              {cuotas > 1 && (
                <span className="text-xs text-muted-foreground block">
                  en {cuotas} pagos de {fmt(creatorNet / cuotas)}
                </span>
              )}
            </div>
            <span className="text-xl font-black" style={{ color: "hsl(var(--novu-accent))" }}>
              {fmt(creatorNet)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center leading-relaxed">
        La comisión del 10% incluye el costo de procesamiento de MercadoPago. El plazo de acreditación (~10 días) lo
        configuras desde tu cuenta de MercadoPago.
      </p>
    </div>
  );
}

const faqs = [
  {
    q: "¿Cuánto cobra NOVU por cada venta?",
    a: "NOVU cobra un 10% por venta sobre el monto total de la transacción. Esa comisión incluye todos los costos de procesamiento de pago. Sin cargos adicionales, sin mensualidad.",
  },
  {
    q: "¿Cuándo recibo mi dinero?",
    a: "Los pagos se acreditan en aproximadamente 10 días hábiles. El plazo exacto lo configuras directamente desde tu cuenta de MercadoPago.",
  },
  {
    q: "¿Qué pasa si no vendo nada?",
    a: "No pagas nada. NOVU es completamente gratis si no tienes ventas. Solo cobramos cuando tú cobras.",
  },
  {
    q: "¿Puedo vender más de un producto?",
    a: "Sí. Cursos, ebooks, plantillas, eventos y agenda 1:1. Sin límites de productos ni de ventas.",
  },
  {
    q: "¿Qué es el add-on de comunidad?",
    a: "Si activas la comunidad en tu curso, se descuenta $990 por cada venta de ese curso. Es un cargo único por venta, no mensual ni por alumno.",
  },
  {
    q: "¿Tienen soporte?",
    a: "Sí. Escríbenos por WhatsApp y te ayudamos a publicar tu primer producto.",
    whatsapp: true,
  },
];

export default function PreciosPage() {
  return (
    <>
      <SEO
        title="Precios — NOVU"
        description="Empieza gratis. Solo pagas cuando vendes. 10% de comisión por venta. Sin mensualidad."
        path="/precios"
      />

      {/* HEADER */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="flex justify-center mb-5">
          <PillBadge>Sin mensualidad</PillBadge>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground">
          Empieza gratis. Solo pagamos cuando tú vendes.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Sin planes, sin contratos. Una sola comisión del 10% por venta. Sin mensualidad.
        </p>
      </section>

      {/* COMISIÓN — fondo claro */}
      <section className="max-w-[600px] mx-auto px-4 pb-8">
        <div className="rounded-3xl p-10 text-center border border-border" style={{ background: "#f8f9fb" }}>
          <div className="text-7xl md:text-8xl font-black text-foreground">10%</div>
          <p className="mt-2 text-lg text-muted-foreground">por cada venta</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Incluye todos los costos de procesamiento de pago. Sin cargos adicionales.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl p-4 border border-border bg-background">
              <div className="font-bold" style={{ color: "hsl(var(--novu-accent))" }}>
                $0
              </div>
              <div className="text-xs mt-1 text-muted-foreground">para empezar</div>
            </div>
            <div className="rounded-xl p-4 border border-border bg-background">
              <div className="font-bold" style={{ color: "hsl(var(--novu-accent))" }}>
                ~10 días
              </div>
              <div className="text-xs mt-1 text-muted-foreground">para recibir tu dinero</div>
            </div>
            <div className="rounded-xl p-4 border border-border bg-background">
              <div className="font-bold" style={{ color: "hsl(var(--novu-accent))" }}>
                3 cuotas
              </div>
              <div className="text-xs mt-1 text-muted-foreground">sin interés disponibles</div>
            </div>
          </div>

          <Link
            to="/signup"
            className="inline-flex items-center justify-center mt-8 px-7 py-3.5 rounded-full font-bold text-base transition-transform hover:scale-105"
            style={{ background: "hsl(var(--novu-accent))", color: "hsl(var(--novu-text-on-accent))" }}
          >
            Crear mi cuenta gratis
          </Link>
        </div>
      </section>

      {/* CALCULADORA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-foreground">¿Cuánto recibirás?</h2>
          <p className="mt-2 text-muted-foreground">Calcula tu ganancia según el precio y las cuotas</p>
        </div>
        <CommissionCalculator />
      </section>

      {/* FEATURES DISPONIBLES */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-foreground">Todas las features disponibles</h2>
          <p className="mt-2 text-muted-foreground">Sin planes. Sin límites. Sin letra chica.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.label} className="rounded-2xl border border-border bg-card p-5 flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--novu-accent) / 0.18)" }}
              >
                <f.icon className="h-5 w-5" style={{ color: "hsl(var(--novu-accent))" }} />
              </div>
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">{f.label}</span>
                {f.badge && <PillBadge>{f.badge}</PillBadge>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ADD-ONS */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-foreground">Add-ons opcionales</h2>
          <p className="mt-2 text-muted-foreground">Actívalos cuando los necesites</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: MessagesSquare,
              title: "Comunidad por curso",
              desc: "Activa un foro privado para los alumnos de cada curso. Se descuenta $990 por cada venta de ese curso.",
              badge: "Solo $990 por venta",
              soon: false,
            },
            {
              icon: AtSign,
              title: "Email marketing",
              desc: "Envía emails automáticos a tus alumnos y seguidores desde NOVU.",
              soon: true,
            },
            {
              icon: Handshake,
              title: "Programa de afiliados",
              desc: "Permite que otros promuevan tus cursos y ganen una comisión por cada venta.",
              soon: true,
            },
            {
              icon: DollarSign,
              title: "Pagos en USD",
              desc: "Acepta pagos internacionales en dólares para vender a compradores fuera de Chile.",
              soon: true,
            },
          ].map((a) => (
            <div key={a.title} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--novu-accent) / 0.18)" }}
              >
                <a.icon className="h-6 w-6" style={{ color: "hsl(var(--novu-accent))" }} />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground flex-1">{a.desc}</p>
              <div className="mt-4">{a.soon ? <SoonBadge /> : a.badge ? <PillBadge>{a.badge}</PillBadge> : null}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-6 text-center">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`q-${i}`} className="rounded-2xl border border-border bg-card px-2">
              <AccordionTrigger className="px-4 py-4 text-left text-base font-bold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-5 text-muted-foreground leading-relaxed">
                {f.a}
                {(f as any).whatsapp && (
                  <div className="mt-3">
                    <a
                      href={SUPPORT_WA}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:opacity-70 transition-opacity"
                    >
                      <MessageCircle className="h-4 w-4" style={{ color: "hsl(var(--novu-accent))" }} />
                      Escribir al soporte →
                    </a>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: "#0a0a0a" }} className="px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white">Empieza hoy. Es gratis.</h2>
          <p className="mt-4 text-lg" style={{ color: "rgba(255,255,255,0.6)" }}>
            Tu conocimiento tiene valor. NOVU te ayuda a monetizarlo.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center mt-7 px-7 py-3.5 rounded-full font-bold text-base transition-transform hover:scale-105"
            style={{ background: "#fcc70e", color: "#1a1a1a" }}
          >
            Crear mi cuenta gratis
          </Link>
        </div>
      </section>
    </>
  );
}
