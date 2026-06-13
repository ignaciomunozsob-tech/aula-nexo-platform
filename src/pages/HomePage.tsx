import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCourseUrl } from '@/lib/utils';
import {
  CheckCircle2,
  ShieldCheck,
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
  Check,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import mockupDashboard from '@/assets/home-mockup-dashboard.jpg';
import mockupEditor from '@/assets/home-mockup-editor.jpg';
import mockupStudent from '@/assets/home-mockup-student.jpg';
import mockupFinance from '@/assets/home-mockup-finance.jpg';
import mockupPublic from '@/assets/home-mockup-public.jpg';

const features = [
  { icon: Layout, title: 'Página de curso lista', desc: 'Sin diseñar nada desde cero' },
  { icon: ShieldCheck, title: 'Pagos seguros', desc: 'Tus alumnos pagan, tú cobras' },
  { icon: Users, title: 'Gestión de alumnos', desc: 'Ve el progreso de cada uno' },
  { icon: LineChart, title: 'Finanzas en tiempo real', desc: 'Ingresos y ventas al día' },
  { icon: Award, title: 'Certificados automáticos', desc: 'Se generan solos al completar' },
  { icon: Handshake, title: 'Comisiones para afiliados', desc: 'Multiplica tus ventas con afiliados', soon: true },
];

const productTypes = [
  { icon: FileVideo, title: 'Cursos grabados', desc: 'Videos a tu ritmo' },
  { icon: BookOpen, title: 'Ebooks y guías', desc: 'Contenido descargable' },
  { icon: Layout, title: 'Plantillas', desc: 'Recursos listos para usar' },
  { icon: CalendarDays, title: 'Eventos', desc: 'Talleres y sesiones online o presenciales que tus alumnos pueden agendar y pagar', soon: true },
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

function BrowserFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={`rounded-xl overflow-hidden border border-border bg-card ${className}`}
      style={{ boxShadow: '0 24px 60px -20px rgba(0,0,0,0.18), 0 8px 20px -10px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/50">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <img src={src} alt={alt} loading="lazy" width={1536} height={1024} className="w-full h-auto block" />
    </div>
  );
}

function FeatureSection({
  bg,
  reverse,
  pill,
  title,
  subtitle,
  bullets,
  image,
  imageAlt,
}: {
  bg: string;
  reverse?: boolean;
  pill: string;
  title: string;
  subtitle: string;
  bullets: string[];
  image: string;
  imageAlt: string;
}) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-24" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className={reverse ? 'md:order-2' : ''}>
          <span className="novu-pill">{pill}</span>
          <h2 className="mt-5 text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">{title}</h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">{subtitle}</p>
          <ul className="mt-7 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center"
                  style={{ background: 'hsl(var(--novu-accent) / 0.2)' }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: 'hsl(var(--novu-accent))' }} />
                </span>
                <span className="text-foreground font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={reverse ? 'md:order-1' : ''}>
          <BrowserFrame src={image} alt={imageAlt} />
        </div>
      </div>
    </section>
  );
}

type FeaturedCourse = {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  price_clp: number;
  format: string;
  is_novu_official: boolean;
  creator: { name: string | null; creator_slug: string | null } | null;
};

function formatEventDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function HomePage() {
  const { data: featuredCourses = [] } = useQuery({
    queryKey: ['home-featured-courses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, slug, title, cover_image_url, price_clp, format, is_novu_official, creator_id')
        .eq('status', 'published')
        .order('is_novu_official', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8);

      const now = Date.now();
      const list = ((data as any[]) || []).filter((c) => {
        if (c.format === 'live' && c.event_start_at) {
          return new Date(c.event_start_at).getTime() >= now;
        }
        return true;
      }).slice(0, 4);

      // Fetch creators via secure RPC
      const creatorIds = Array.from(new Set(list.map((c) => c.creator_id).filter(Boolean)));
      let creatorsById: Record<string, { name: string | null; creator_slug: string | null }> = {};
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase.rpc('get_public_creators_by_ids', { _ids: creatorIds });
        creatorsById = Object.fromEntries((creators || []).map((c: any) => [c.id, { name: c.name, creator_slug: c.creator_slug }]));
      }

      return list.map((c) => ({
        ...c,
        creator: creatorsById[c.creator_id] ?? null,
      })) as FeaturedCourse[];
    },
  });

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

          {/* Mockup dashboard creador */}
          <div className="mt-16 max-w-[900px] mx-auto">
            <BrowserFrame src={mockupDashboard} alt="Dashboard del creador NOVU" />
          </div>
        </div>
      </section>

      {/* 2. FEATURES */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20" style={{ background: '#f3f4f6' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Todo lo que necesitas para vender
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Lanzar un producto digital nunca había sido tan simple
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="novu-card flex flex-col gap-4" style={{ background: '#ffffff' }}>
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

      {/* 3. Sección A — Para creadores */}
      <FeatureSection
        bg="#ffffff"
        pill="Para creadores"
        title="Así de fácil es crear tu curso"
        subtitle="Sube tus videos, organiza módulos y publica en minutos"
        bullets={['Editor simple e intuitivo', 'Previsualización en tiempo real', 'Publica con un solo click']}
        image={mockupEditor}
        imageAlt="Editor de curso NOVU"
      />

      {/* 4. Sección B — Para alumnos */}
      <FeatureSection
        bg="#f3f4f6"
        reverse
        pill="Para alumnos"
        title="Una experiencia de aprendizaje limpia"
        subtitle="Tus alumnos acceden desde cualquier dispositivo, sin distracciones"
        bullets={['Reproductor de video fluido', 'Progreso guardado automáticamente', 'Acceso de por vida']}
        image={mockupStudent}
        imageAlt="Vista del alumno viendo una lección"
      />

      {/* 5. Sección C — Finanzas */}
      <FeatureSection
        bg="#ffffff"
        pill="Finanzas"
        title="Tus ventas en tiempo real"
        subtitle="Ve ingresos, ventas y ticket promedio cuando quieras"
        bullets={['Dashboard de ingresos y ventas', 'Historial de transacciones', 'Métricas por curso']}
        image={mockupFinance}
        imageAlt="Dashboard de finanzas NOVU"
      />

      {/* 6. Sección D — Tu vitrina */}
      <FeatureSection
        bg="#f3f4f6"
        reverse
        pill="Tu vitrina"
        title="Tu curso con su propia página profesional"
        subtitle="Lista para vender, con tu imagen y tu precio"
        bullets={['Página de ventas incluida', 'Badge NOVU Certified si aplica', 'Compra en un solo click']}
        image={mockupPublic}
        imageAlt="Página pública de un curso en NOVU"
      />

      {/* 7. CURSOS DESTACADOS */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20" style={{ background: '#0a0a0a' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: '#ffffff' }}>
              Cursos destacados
            </h2>
            <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Los cursos más vendidos de la plataforma
            </p>
          </div>

          {featuredCourses.length === 0 ? (
            <p className="text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Aún no hay cursos publicados.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredCourses.map((c) => {
                const href = getCourseUrl((c.creator as any)?.creator_slug, c.slug);
                const isLive = c.format === 'live';
                const eventDate = (c as any).event_start_at as string | undefined;
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl overflow-hidden flex flex-col"
                    style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="aspect-[16/10] bg-white/5 overflow-hidden">
                      {c.cover_image_url ? (
                        <img src={c.cover_image_url} alt={c.title} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Sin portada
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1 gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.is_novu_official && <NovuCertifiedBadge />}
                        {isLive && eventDate ? (
                          <span
                            className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'hsl(var(--novu-accent))', color: '#0a0a0a' }}
                          >
                            {formatEventDate(eventDate)}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
                          >
                            Grabado · A tu ritmo
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold leading-snug" style={{ color: '#ffffff' }}>
                        {c.title}
                      </h3>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        por {(c.creator as any)?.name || 'Creador NOVU'}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="text-lg font-black" style={{ color: '#ffffff' }}>
                          ${c.price_clp.toLocaleString('es-CL')}
                        </div>
                        <Link
                          to={href}
                          className="inline-flex items-center gap-1.5 text-sm font-bold transition-opacity hover:opacity-80"
                          style={{ color: 'hsl(var(--novu-accent))' }}
                        >
                          Ver curso <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {featuredCourses.length >= 4 && (
            <div className="mt-10 text-center">
              <Link
                to="/courses"
                className="inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors"
                style={{
                  padding: '14px 28px',
                  border: '1.5px solid rgba(255,255,255,0.9)',
                  color: '#ffffff',
                  background: 'transparent',
                }}
              >
                Ver todos los cursos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 8. TIPOS DE PRODUCTOS */}
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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--novu-accent) / 0.18)' }}>
                  <p.icon className="h-6 w-6" style={{ color: 'hsl(var(--novu-accent))' }} />
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

      {/* 9. FAQ */}
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

      {/* 10. CTA FINAL */}
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
