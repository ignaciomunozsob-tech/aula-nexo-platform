import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Megaphone,
  Mail,
  BarChart3,
  Search,
  Palette,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Clock,
  Users,
  Star,
  PlayCircle,
  Award,
  Target,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const skills = [
  { icon: Megaphone, title: 'Social Media Ads', color: 'bg-blue-500/10 text-blue-600' },
  { icon: Search, title: 'SEO & SEM', color: 'bg-emerald-500/10 text-emerald-600' },
  { icon: Mail, title: 'Email Marketing', color: 'bg-purple-500/10 text-purple-600' },
  { icon: BarChart3, title: 'Analítica', color: 'bg-orange-500/10 text-orange-600' },
  { icon: Palette, title: 'Branding', color: 'bg-pink-500/10 text-pink-600' },
  { icon: TrendingUp, title: 'Growth', color: 'bg-amber-500/10 text-amber-600' },
];

const valueProps = [
  {
    icon: Award,
    title: 'Cursos certificados por NOVU',
    description:
      'Contenido producido y validado por nuestro equipo y profesores expertos del mundo del marketing.',
  },
  {
    icon: Target,
    title: 'Aprende haciendo',
    description:
      'Casos reales, ejercicios prácticos y proyectos que puedes mostrar en tu portafolio profesional.',
  },
  {
    icon: Users,
    title: 'Aprende de los mejores',
    description:
      'Profesionales en activo como Ignacio Muñoz comparten estrategias que usan hoy en sus empresas.',
  },
  {
    icon: PlayCircle,
    title: 'A tu ritmo, para siempre',
    description:
      'Acceso de por vida al contenido que compres. Avanza cuando quieras, donde quieras.',
  },
];

const faqs = [
  {
    question: '¿Necesito conocimientos previos para empezar?',
    answer:
      'No. Nuestros cursos están pensados para todos los niveles, desde quien parte de cero hasta profesionales que quieren especializarse.',
  },
  {
    question: '¿Los cursos tienen certificado?',
    answer:
      'Sí. Al completar un curso o carrera NOVU recibes un certificado digital con el respaldo de NOVU y del instructor.',
  },
  {
    question: '¿Cuánto tiempo tengo para terminar el curso?',
    answer:
      'Una vez compras un curso, el acceso es de por vida. Avanzas a tu propio ritmo, sin presión.',
  },
  {
    question: '¿Quiénes son los profesores?',
    answer:
      'Profesionales en activo del marketing digital con experiencia comprobada en empresas y agencias. Cada curso indica claramente quién lo dicta.',
  },
  {
    question: '¿Puedo vender mis propios cursos en NOVU?',
    answer:
      'Sí. Si eres experto en alguna habilidad, puedes crear tu cuenta de creador y vender tus propios cursos en nuestro marketplace. Tus cursos no llevarán el sello "NOVU Oficial", pero sí estarán disponibles para toda nuestra comunidad.',
  },
];

export default function HomePage() {
  // Fetch featured NOVU official courses
  const { data: novuCourses } = useQuery({
    queryKey: ['home-novu-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, slug, title, description, cover_image_url, price_clp, level, duration_minutes_est, instructor_name, instructor_avatar_url')
        .eq('is_novu_official', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratis';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/8 via-primary/4 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 -left-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute top-60 -right-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Academia de Marketing Digital
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
              Aprende marketing digital{' '}
              <span className="text-primary">y haz crecer tu carrera</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Cursos y carreras dictados por los mejores profesionales del marketing.
              Habilidades reales para conseguir mejores trabajos, clientes y resultados.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8 h-12" asChild>
                <Link to="/courses">
                  Ver cursos y carreras
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
                <a href="#cursos-novu">Cursos destacados</a>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Acceso de por vida · Certificado oficial · Aprende a tu ritmo
            </p>
          </div>
        </div>
      </section>

      {/* Skills strip */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Domina las habilidades más buscadas del marketing
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6">
            {skills.map((s) => (
              <div
                key={s.title}
                className="flex flex-col items-center gap-2 group cursor-default"
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${s.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <s.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-center">{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOVU Official Courses */}
      <section id="cursos-novu" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
                <ShieldCheck className="h-4 w-4" />
                NOVU Oficial
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Cursos y carreras certificadas
              </h2>
              <p className="mt-3 text-muted-foreground text-lg max-w-2xl">
                Producidos por NOVU junto a profesionales del marketing en activo.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/courses">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {novuCourses && novuCourses.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {novuCourses.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/course/${c.slug}`}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {c.cover_image_url ? (
                      <img
                        src={c.cover_image_url}
                        alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <span className="text-5xl font-bold text-primary/30">
                          {c.title.charAt(0)}
                        </span>
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3 bg-primary/95 text-primary-foreground gap-1 backdrop-blur-sm">
                      <ShieldCheck className="h-3 w-3" />
                      NOVU Oficial
                    </Badge>
                    <div className="absolute bottom-3 right-3 bg-background/95 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                      {formatPrice(c.price_clp)}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    {c.instructor_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Por {c.instructor_name}
                      </p>
                    )}
                    {c.duration_minutes_est > 0 && (
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {Math.round(c.duration_minutes_est / 60)}h de contenido
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-muted/40 border border-dashed border-border rounded-xl p-12 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Pronto encontrarás aquí los cursos oficiales de NOVU.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Why NOVU */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              ¿Por qué aprender en NOVU?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Diseñado para que avances rápido y consigas resultados reales.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map((v) => (
              <div
                key={v.title}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Instructor */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Star className="h-4 w-4 fill-current" />
                Profesor destacado
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Aprende de los mejores del rubro
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Nuestros profesores son profesionales en activo que comparten contigo las
                estrategias que usan hoy con clientes y empresas reales.
              </p>
              <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-primary-foreground">I</span>
                </div>
                <div>
                  <h3 className="font-semibold">Ignacio Muñoz</h3>
                  <p className="text-sm text-muted-foreground">
                    Especialista en marketing digital
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-card border border-border rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">I</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Ignacio Muñoz</h4>
                    <p className="text-xs text-muted-foreground">3 cursos en NOVU</p>
                  </div>
                  <Badge className="ml-auto bg-primary/10 text-primary border-0 gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    NOVU
                  </Badge>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'Carrera de Marketing Digital', students: 124 },
                    { title: 'Estrategia de Contenidos', students: 89 },
                    { title: 'Performance & Ads', students: 67 },
                  ].map((c) => (
                    <div
                      key={c.title}
                      className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <PlayCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.students} estudiantes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Preguntas frecuentes
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Da el siguiente paso en tu carrera
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Únete a la comunidad NOVU y aprende las habilidades que están transformando el
            marketing digital.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-10 h-14 text-lg" asChild>
              <Link to="/courses">
                Explorar cursos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-10 h-14 text-lg" asChild>
              <Link to="/signup">Crear cuenta gratis</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            ¿Eres experto en marketing y quieres enseñar?{' '}
            <Link
              to="/signup?role=creator"
              className="text-primary font-medium hover:underline"
            >
              Conviértete en creador →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
