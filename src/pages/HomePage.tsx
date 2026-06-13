import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCourseUrl } from '@/lib/utils';
import {
  CheckCircle2,
  ShieldCheck,
  Wallet,
  Users,
  LineChart,
  Award,
  Handshake,
  FileVideo,
  BookOpen,
  Layout,
  CalendarDays,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const features = [
  { icon: Layout, title: 'Página de curso lista', desc: 'Sin diseñar nada desde cero' },
  { icon: ShieldCheck, title: 'Pagos seguros', desc: 'Tus alumnos pagan, tú cobras' },
  { icon: Users, title: 'Gestión de alumnos', desc: 'Ve el progreso de cada uno' },
  { icon: LineChart, title: 'Finanzas en tiempo real', desc: 'Ingresos y ventas al día' },
  { icon: Award, title: 'Certificados automáticos', desc: 'Se generan solos al completar' },
  { icon: Handshake, title: 'Comisiones para afiliados', desc: 'Multiplica tus ventas con afiliados', soon: true },
];

const productTypes = [
  { icon: FileVideo, title: 'Cursos grabados', desc: 'Videos a tu ritmo', emoji: '✅' },
  { icon: BookOpen, title: 'Ebooks y guías', desc: 'Contenido descargable', emoji: '✅' },
  { icon: Layout, title: 'Plantillas', desc: 'Recursos listos para usar', emoji: '✅' },
  { icon: CalendarDays, title: 'Eventos', desc: 'Talleres y sesiones online o presenciales que tus alumnos pueden agendar y pagar', soon: true, emoji: '⏳' },
];

const faqs = [
  {
    q: '¿Cuánto cobra NOVU por cada venta?',
    a: 'NOVU cobra un 10% por venta. A eso se suma la comisión de MercadoPago que varía según las cuotas: 2,89% en 1 cuota, y aumenta progresivamente en cuotas sin interés. Puedes configurar esto directamente desde tu cuenta de MercadoPago.',
  },
  {
    q: '¿Cuándo recibo mi dinero?',
    a: 'Los pagos se acreditan en aproximadamente 10 días. El plazo exacto y la configuración de retiros la manejas directamente desde tu cuenta de MercadoPago.',
  },
  {
    q: '¿Tienen soporte si necesito ayuda?',
    a: 'Sí. Puedes escribirnos directo por WhatsApp y te ayudamos a configurar tu cuenta y publicar tu primer curso.',
    whatsapp: true,
  },
  {
    q: '¿Puedo vender más de un curso?',
    a: 'Sí, puedes crear y publicar todos los productos que quieras. Sin límites.',
  },
  {
    q: '¿Qué significa NOVU Certified?',
    a: 'Es el sello de los cursos producidos directamente por NOVU. Garantiza estándares de calidad en contenido, producción y didáctica.',
  },
];

function SoonBadge() {
  return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
      Próximamente
    </span>
  );
}

function NovuCertifiedBadge() {
  return (
    <span className="novu-certified">
      <CheckCircle2 className="h-3 w-3" strokeWidth={3} />
      NOVU Certified
    </span>
  );
}

export default function HomePage() {
  const { data: certifiedCourse } = useQuery({
    queryKey: ['novu-certified-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, slug, title, cover_image_url, price_clp, creator:creator_id(name, creator_slug)')
        .eq('status', 'published')
        .ilike('title', '%manychat%')
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const featuredHref = certifiedCourse
    ? getCourseUrl((certifiedCourse.creator as any)?.creator_slug, certifiedCourse.slug)
    : '/courses';

  return (
    <div className="bg-background">
      {/* 1. HERO */}
      <section className="px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-5xl mx-auto text-center">
          <span className="novu-pill">La plataforma para creadores</span>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-balance">
            Vende tus cursos<br />sin complicaciones
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Crea tu curso, ponle precio y empieza a vender hoy mismo en tu propia página profesional
          </p>
          <div className="mt-9 flex flex-wrap gap-3 justify-center">
            <Link to="/signup" className="novu-btn-primary">
              Crear mi cuenta gratis
            </Link>
            <Link to="/courses" className="novu-btn-secondary">
              Explorar cursos
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--novu-accent))' }} /> Gratis para empezar</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--novu-accent))' }} /> 5 min para publicar</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--novu-accent))' }} /> Pagos seguros</span>
          </div>
        </div>
      </section>

      {/* 2. FEATURES */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Todo lo que necesitas para vender
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Lanzar un producto digital nunca había sido tan simple
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="novu-card flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--novu-accent) / 0.18)' }}>
                  <f.icon className="h-6 w-6" style={{ color: 'hsl(var(--novu-accent))' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold">{f.title}</h3>
                    {f.soon && <SoonBadge />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. NOVU CERTIFIED */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20" style={{ background: 'hsl(var(--bg-card-alt-raw))' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <NovuCertifiedBadge />
            <h2 className="mt-5 text-3xl md:text-5xl font-black tracking-tight">
              Cursos creados por NOVU
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Producidos y respaldados directamente por nuestro equipo. Calidad garantizada
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="novu-card flex flex-col gap-5">
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-muted">
                {certifiedCourse?.cover_image_url ? (
                  <img src={certifiedCourse.cover_image_url} alt={certifiedCourse.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    Manychat desde cero
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <NovuCertifiedBadge />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-snug">
                  {certifiedCourse?.title || 'Manychat desde cero'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  por {(certifiedCourse?.creator as any)?.name || 'Ignacio Muñoz'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-2xl font-black">
                  ${(certifiedCourse?.price_clp ?? 27000).toLocaleString('es-CL')}
                </div>
                <Link to={featuredHref} className="novu-btn-primary" style={{ padding: '12px 22px' }}>
                  Ver curso
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TIPOS DE PRODUCTOS */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Vende lo que quieras
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Cualquier producto digital que tengas
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {productTypes.map((p) => (
              <div key={p.title} className="novu-card flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--novu-accent) / 0.18)' }}>
                    <p.icon className="h-6 w-6" style={{ color: 'hsl(var(--novu-accent))' }} />
                  </div>
                  <span className="text-xl" aria-hidden>{p.emoji}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    {p.soon && <SoonBadge />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20" style={{ background: 'hsl(var(--bg-card-alt-raw))' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Preguntas frecuentes
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`q-${i}`}
                className="novu-card border-0"
                style={{ padding: 0 }}
              >
                <AccordionTrigger className="px-6 py-5 text-left text-base md:text-lg font-bold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 text-muted-foreground leading-relaxed">
                  {f.a}
                  {f.whatsapp && (
                    <div className="mt-4">
                      <a
                        href="https://wa.me/56933728004"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:opacity-70 transition-opacity"
                      >
                        <MessageCircle className="h-4 w-4" style={{ color: 'hsl(var(--novu-accent))' }} />
                        Escribir al soporte
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* 6. CTA FINAL */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 md:py-28" style={{ background: '#000000' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight" style={{ color: '#ffffff' }}>
            Empieza hoy. Es gratis
          </h2>
          <p className="mt-5 text-lg md:text-xl max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Tu conocimiento tiene valor. NOVU te ayuda a monetizarlo
          </p>
          <div className="mt-9 flex flex-wrap gap-3 justify-center">
            <Link to="/signup" className="novu-btn-primary">
              Crear mi cuenta gratis
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors"
              style={{
                padding: '16px 32px',
                border: '1.5px solid rgba(255,255,255,0.9)',
                color: '#ffffff',
                background: 'transparent',
              }}
            >
              Explorar cursos
            </Link>
          </div>
        </div>
      </section>

      {/* Footer slim */}
      <footer className="px-4 sm:px-6 lg:px-8 py-10 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-black text-foreground">NOVU</span>
            <span>· Vende tu conocimiento</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/comisiones" className="hover:text-foreground transition-colors">Comisiones</Link>
            <Link to="/courses" className="hover:text-foreground transition-colors">Marketplace</Link>
            <a href="https://wa.me/56933728004" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
