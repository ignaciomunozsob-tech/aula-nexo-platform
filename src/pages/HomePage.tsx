import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Video, 
  Calendar, 
  FileText, 
  Users, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  LayoutDashboard,
  Rocket,
  Play,
  Star
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const productTypes = [
  { icon: BookOpen, title: 'Cursos online', description: 'Grabados o en vivo', color: 'bg-blue-500/10 text-blue-600' },
  { icon: FileText, title: 'Ebooks', description: 'PDFs y documentos', color: 'bg-emerald-500/10 text-emerald-600' },
  { icon: Video, title: 'Webinars', description: 'Sesiones en directo', color: 'bg-purple-500/10 text-purple-600' },
  { icon: Calendar, title: 'Eventos', description: 'Talleres y workshops', color: 'bg-orange-500/10 text-orange-600' },
  { icon: Users, title: 'Mentorías', description: 'Grabadas o 1:1', color: 'bg-pink-500/10 text-pink-600' },
  { icon: Sparkles, title: 'Masterclasses', description: 'Contenido premium', color: 'bg-amber-500/10 text-amber-600' },
];

const steps = [
  {
    number: '01',
    title: 'Crea tu producto',
    description: 'Sube tu contenido en minutos. Sin complicaciones técnicas.',
    icon: Rocket,
  },
  {
    number: '02',
    title: 'Compártelo',
    description: 'Envía el link a tu audiencia por redes, email o donde quieras.',
    icon: Zap,
  },
  {
    number: '03',
    title: 'Vende y entrega automático',
    description: 'Tu cliente paga y recibe acceso al instante. Tú solo cobras.',
    icon: CheckCircle2,
  },
];

const benefits = [
  {
    icon: LayoutDashboard,
    title: 'Página de venta lista',
    description: 'Tu producto listo para vender en minutos, sin diseñar nada.',
  },
  {
    icon: Zap,
    title: 'Acceso inmediato',
    description: 'Tus clientes acceden al contenido automáticamente al pagar.',
  },
  {
    icon: Users,
    title: 'Gestión de alumnos',
    description: 'Ve quién compró, su progreso y administra todo fácil.',
  },
  {
    icon: Shield,
    title: 'Todo en un lugar',
    description: 'Ventas, contenido, alumnos y pagos. Sin saltar entre apps.',
  },
];

const faqs = [
  {
    question: '¿De verdad es gratis empezar?',
    answer: 'Sí. No pagas nada por crear tu cuenta ni por subir productos. Solo cobramos cuando vendes.',
  },
  {
    question: '¿Cómo funciona el modelo de precios?',
    answer: 'Es simple: solo cobramos una pequeña comisión cuando realizas una venta. Sin costos fijos, sin mensualidades. Más detalles en nuestra página de comisiones.',
  },
  {
    question: '¿Puedo vender ebooks, eventos o solo cursos?',
    answer: 'Puedes vender todo tipo de productos digitales: cursos, ebooks, talleres, webinars, eventos, mentorías grabadas, plantillas y más.',
  },
  {
    question: '¿Cuándo recibo mi dinero?',
    answer: 'Próximamente integraremos pasarelas de pago como Webpay para que recibas tus pagos de forma automática. Por ahora, el sistema funciona en modo demo.',
  },
  {
    question: '¿Necesito tener audiencia para empezar?',
    answer: 'No es obligatorio, pero ayuda. NOVU te da las herramientas para vender, tú decides cómo promocionar tus productos.',
  },
  {
    question: '¿Puedo crear más de un producto?',
    answer: 'Sí, puedes crear todos los productos que quieras. No hay límite.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/8 via-primary/4 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 -left-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute top-60 -right-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Nueva plataforma para creadores
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
                Vende tus productos digitales{' '}
                <span className="text-primary">sin complicarte</span>
              </h1>
              
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
                Crea, publica y vende cursos, ebooks, talleres y más. 
                Tus clientes pagan y reciben acceso automático.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="text-base px-8 h-12" asChild>
                  <Link to="/signup?role=creator">
                    Empezar gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                
                <Button size="lg" variant="outline" className="text-base px-8 h-12 group" asChild>
                  <a href="#como-funciona">
                    <Play className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
                    Ver cómo funciona
                  </a>
                </Button>
              </div>

              {/* Trust line */}
              <p className="mt-6 text-sm text-muted-foreground">
                Gratis para empezar · Sin mensualidad · Sin tarjeta de crédito
              </p>
            </div>

            {/* Right: Visual */}
            <div className="relative">
              {/* Floating cards */}
              <div className="relative">
                {/* Main card */}
                <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Curso de Marketing Digital</p>
                      <p className="text-sm text-muted-foreground">12 lecciones · 4 horas</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">$29.990</span>
                    <Button size="sm">Comprar</Button>
                  </div>
                </div>

                {/* Secondary floating cards */}
                <div className="absolute -top-4 -right-4 bg-card border border-border rounded-xl shadow-lg p-4 transform -rotate-3 w-48">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium">Ebook</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Guía de Ventas</p>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl shadow-lg p-4 transform rotate-2 w-52">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Video className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium">Webinar</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span>42 inscritos</span>
                  </div>
                </div>

                {/* Decoration dots */}
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%]">
                  <div className="absolute top-0 left-0 w-3 h-3 bg-primary/20 rounded-full" />
                  <div className="absolute top-1/4 right-0 w-2 h-2 bg-purple-500/30 rounded-full" />
                  <div className="absolute bottom-0 left-1/4 w-4 h-4 bg-emerald-500/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-20 text-center">
            <p className="text-sm text-muted-foreground mb-6">Ya se están sumando creadores</p>
            <div className="flex justify-center items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-muted border-2 border-background -ml-2 first:ml-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                </div>
              ))}
              <span className="ml-3 text-sm text-muted-foreground">+más próximamente</span>
            </div>
          </div>
        </div>
      </section>

      {/* What can you sell */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              ¿Qué puedes vender en NOVU?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Todo tipo de productos digitales. Tú creas, nosotros hacemos que llegue a tus clientes.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {productTypes.map((product) => (
              <div
                key={product.title}
                className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${product.color} flex items-center justify-center mb-3 sm:mb-5 group-hover:scale-110 transition-transform`}>
                  <product.icon className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <h3 className="font-semibold text-sm sm:text-lg">{product.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 scroll-mt-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Cómo funciona
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Tres pasos. Así de simple.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[calc(50%+60px)] w-[calc(100%-60px)] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                )}
                <div className="text-center">
                  <div className="relative inline-flex">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                      <step.icon className="h-14 w-14 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Todo lo que necesitas para vender
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                Sin tecnicismos ni complicaciones. Diseñado para que te enfoques en crear contenido increíble.
              </p>

              <div className="space-y-6">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="flex gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="relative hidden lg:block">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/5 via-muted to-primary/5 p-8">
                <div className="w-full h-full rounded-2xl bg-card border border-border shadow-xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-semibold">Panel del creador</h4>
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Ventas este mes</p>
                      <p className="text-2xl font-bold">$124.500</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Estudiantes</p>
                      <p className="text-2xl font-bold">47</p>
                    </div>
                  </div>

                  <div className="flex-1 bg-muted/30 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-3">Productos activos</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Curso de Marketing</p>
                        </div>
                        <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">Activo</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Guía de Ventas</p>
                        </div>
                        <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">Activo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Preguntas frecuentes
            </h2>
            <p className="mt-4 text-muted-foreground">
              ¿Tienes dudas? Aquí las respuestas más comunes.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
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

          <div className="mt-8 text-center">
            <Button variant="link" asChild className="text-muted-foreground hover:text-primary">
              <Link to="/comisiones">
                Ver detalles de precios y comisiones
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: CTA Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Rocket className="h-4 w-4" />
                Comienza hoy
              </div>
              
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                ¿Listo para vender?
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0">
                Crea tu cuenta gratis y sube tu primer producto. 
                Sin tarjeta de crédito. Sin compromisos.
              </p>

              <Button size="lg" className="text-base px-10 h-14 text-lg" asChild>
                <Link to="/signup?role=creator">
                  Crear mi cuenta gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Right: Creator Profile Preview */}
            <div className="relative">
              <div className="bg-card border border-border rounded-2xl shadow-xl p-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">M</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">María González</h4>
                    <p className="text-sm text-muted-foreground">Experta en Marketing Digital</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">(24 reseñas)</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">3</p>
                    <p className="text-xs text-muted-foreground">Cursos</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">156</p>
                    <p className="text-xs text-muted-foreground">Alumnos</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">4.9</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>

                {/* Products Preview */}
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">Productos destacados</p>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Marketing en Redes</p>
                      <p className="text-xs text-muted-foreground">$29.990</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Guía de Email Marketing</p>
                      <p className="text-xs text-muted-foreground">$9.990</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
