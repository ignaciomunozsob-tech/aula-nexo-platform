import { Link } from 'react-router-dom';
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
  ShoppingCart,
  ShoppingBag,
  Handshake,
  Ticket,
  Mail,
  Wallet,
  MessageCircle,
  MessagesSquare,
  AtSign,
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const SUPPORT_WA = 'https://wa.me/56933728004';

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

const features: Array<{ icon: any; label: string; badge?: string }> = [
  { icon: FileVideo, label: 'Cursos grabados' },
  { icon: BookOpen, label: 'Ebooks y guías' },
  { icon: Layout, label: 'Plantillas' },
  { icon: CalendarClock, label: 'Agenda 1:1' },
  { icon: CalendarDays, label: 'Eventos agendables' },
  { icon: Globe, label: 'Página de curso profesional' },
  { icon: Users, label: 'Gestión de alumnos' },
  { icon: Award, label: 'Certificados automáticos' },
  { icon: LineChart, label: 'Estadísticas' },
  { icon: Target, label: 'Píxel de Meta' },
  { icon: ShoppingCart, label: 'Order bump' },
  { icon: ShoppingBag, label: 'Carritos abandonados' },
  { icon: Handshake, label: 'Programa de afiliados' },
  { icon: Ticket, label: 'Cupones de descuento' },
  { icon: Mail, label: 'Email de bienvenida personalizado' },
  { icon: Wallet, label: 'Finanzas en tiempo real' },
  { icon: MessageCircle, label: 'Soporte WhatsApp' },
  { icon: MessagesSquare, label: 'Comunidad por curso', badge: '+$990 por venta' },
];

const compareRows: Array<{ label: string; novu: React.ReactNode; hotmart: React.ReactNode; encuadrado: React.ReactNode }> = [
  { label: 'Mensualidad', novu: '$0', hotmart: '$0', encuadrado: 'Desde $29.000' },
  { label: 'Comisión', novu: '10%', hotmart: '10%', encuadrado: '7-12%' },
  { label: 'Pagos en CLP', novu: '✅', hotmart: '❌', encuadrado: '✅' },
  { label: 'Sin conversión USD', novu: '✅', hotmart: '❌', encuadrado: '✅' },
  { label: 'Comunidad por curso', novu: '✅', hotmart: '❌', encuadrado: '❌' },
  { label: 'Agenda 1:1', novu: '✅', hotmart: '❌', encuadrado: '✅' },
  { label: 'Soporte en español', novu: '✅', hotmart: '✅', encuadrado: '✅' },
];

const faqs = [
  { q: '¿Cuánto cobra NOVU por cada venta?', a: 'NOVU cobra un 10% por venta. Esa comisión incluye todos los costos de procesamiento de pago. Sin cargos adicionales, sin mensualidad.' },
  { q: '¿Cuándo recibo mi dinero?', a: 'Los pagos se acreditan en aproximadamente 10 días. El plazo lo configuras desde tu cuenta de MercadoPago.' },
  { q: '¿Qué pasa si no vendo nada?', a: 'No pagas nada. NOVU es completamente gratis si no tienes ventas. Solo cobramos cuando tú cobras.' },
  { q: '¿Puedo vender más de un producto?', a: 'Sí. Cursos, ebooks, plantillas, eventos y agenda 1:1. Sin límites de productos ni de ventas.' },
  { q: '¿Qué es el add-on de comunidad?', a: 'Si activas la comunidad en tu curso, se descuenta $990 por cada venta de ese curso. Es un cargo único por venta, no mensual ni por alumno.' },
  { q: '¿Tienen soporte?', a: 'Sí. Escríbenos por WhatsApp y te ayudamos a publicar tu primer producto.', whatsapp: true },
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

      {/* COMISIÓN */}
      <section className="max-w-[600px] mx-auto px-4 pb-16">
        <div className="rounded-3xl p-10 text-center" style={{ background: '#0a0a0a', color: '#fff' }}>
          <div className="text-7xl md:text-8xl font-black" style={{ color: '#fff' }}>10%</div>
          <p className="mt-2 text-lg" style={{ color: 'rgba(255,255,255,0.85)' }}>por cada venta</p>
          <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Incluye todos los costos de procesamiento de pago. Sin cargos adicionales.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="font-bold" style={{ color: 'hsl(var(--novu-accent))' }}>$0</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>para empezar</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="font-bold" style={{ color: 'hsl(var(--novu-accent))' }}>~10 días</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>para recibir tu dinero</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="font-bold" style={{ color: 'hsl(var(--novu-accent))' }}>3 cuotas</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>sin interés disponibles</div>
            </div>
          </div>

          <Link
            to="/signup"
            className="inline-flex items-center justify-center mt-8 px-7 py-3.5 rounded-full font-bold text-base transition-transform hover:scale-105"
            style={{ background: '#fcc70e', color: '#1a1a1a' }}
          >
            Crear mi cuenta gratis
          </Link>
        </div>
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--novu-accent) / 0.18)' }}>
                <f.icon className="h-5 w-5" style={{ color: 'hsl(var(--novu-accent))' }} />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: MessagesSquare, title: 'Comunidad por curso', desc: 'Activa un foro privado para los alumnos de cada curso. Se descuenta $990 por cada venta de ese curso.', badge: 'Solo $990 por venta' },
            { icon: AtSign, title: 'Email marketing', desc: 'Envía emails automáticos a tus alumnos y seguidores.', badge: 'Próximamente' },
            { icon: Globe, title: 'Dominio propio', desc: 'Usa tu propio dominio en tu página de cursos.', badge: 'Próximamente' },
          ].map((a) => (
            <div key={a.title} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--novu-accent) / 0.18)' }}>
                <a.icon className="h-6 w-6" style={{ color: 'hsl(var(--novu-accent))' }} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground flex-1">{a.desc}</p>
              <div className="mt-4"><PillBadge>{a.badge}</PillBadge></div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARATIVA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-foreground">¿Por qué NOVU?</h2>
          <p className="mt-2 text-muted-foreground">Compara y decide</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f3f4f6', color: '#1a1a1a' }}>
                <th className="text-left px-5 py-4 font-bold"></th>
                <th className="px-5 py-4 font-bold text-center" style={{ background: '#0a0a0a', color: '#fff', borderLeft: '2px solid #fcc70e', borderRight: '2px solid #fcc70e' }}>NOVU</th>
                <th className="px-5 py-4 font-bold text-center">Hotmart</th>
                <th className="px-5 py-4 font-bold text-center">Encuadrado</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r, i) => (
                <tr key={r.label} className={i % 2 === 1 ? 'bg-muted/40' : ''}>
                  <td className="px-5 py-3.5 font-medium text-foreground">{r.label}</td>
                  <td className="px-5 py-3.5 text-center font-bold" style={{ background: '#0a0a0a', color: '#fff', borderLeft: '2px solid #fcc70e', borderRight: '2px solid #fcc70e' }}>{r.novu}</td>
                  <td className="px-5 py-3.5 text-center text-foreground/90">{r.hotmart}</td>
                  <td className="px-5 py-3.5 text-center text-foreground/90">{r.encuadrado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Información basada en datos públicos disponibles a junio 2026.
        </p>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-6 text-center">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`q-${i}`} className="rounded-2xl border border-border bg-card px-2">
              <AccordionTrigger className="px-4 py-4 text-left text-base font-bold hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="px-4 pb-5 text-muted-foreground leading-relaxed">
                {f.a}
                {(f as any).whatsapp && (
                  <div className="mt-3">
                    <a href={SUPPORT_WA} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:opacity-70 transition-opacity">
                      <MessageCircle className="h-4 w-4" style={{ color: 'hsl(var(--novu-accent))' }} />
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
      <section style={{ background: '#0a0a0a' }} className="px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white">Empieza hoy. Es gratis.</h2>
          <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Tu conocimiento tiene valor. NOVU te ayuda a monetizarlo.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center mt-7 px-7 py-3.5 rounded-full font-bold text-base transition-transform hover:scale-105"
            style={{ background: '#fcc70e', color: '#1a1a1a' }}
          >
            Crear mi cuenta gratis
          </Link>
        </div>
      </section>
    </>
  );
}
