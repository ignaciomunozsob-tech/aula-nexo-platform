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
  Clock,
  CreditCard,
  ChevronDown,
  Percent,
  LayoutDashboard,
  Rocket
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const productTypes = [
  { icon: BookOpen, title: 'Cursos online', description: 'Grabados o en vivo' },
  { icon: FileText, title: 'Ebooks', description: 'PDFs y documentos' },
  { icon: Video, title: 'Webinars', description: 'Sesiones en directo' },
  { icon: Calendar, title: 'Eventos', description: 'Talleres y workshops' },
  { icon: Users, title: 'Mentorías', description: 'Grabadas o 1:1' },
  { icon: Sparkles, title: 'Masterclasses', description: 'Contenido premium' },
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
    question: '¿Qué cobra NOVU exactamente?',
    answer: 'NOVU cobra el 10% por cada venta que hagas. Tú te quedas con el 90%. Sin costos ocultos, sin mensualidades.',
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
  {
    question: '¿Qué pasa si no vendo nada?',
    answer: 'No pasa nada. Si no vendes, no pagas. Así de simple.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background py-20 md:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
              Vende tus productos digitales{' '}
              <span className="text-primary">sin complicarte</span>
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Crea, publica y vende cursos, ebooks, talleres y más. 
              Tus clientes pagan y reciben acceso automático.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/signup?role=creator">
                  Crear mi cuenta gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <a href="#como-funciona">
                  Ver cómo funciona
                  <ChevronDown className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Gratis para empezar</span>
              </div>
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <span>Te quedas con 90%</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Sin mensualidad</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 md:p-8 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Curso Online</p>
                      <p className="font-semibold text-sm">Marketing Digital</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">12 lecciones · $29.990</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ebook</p>
                      <p className="font-semibold text-sm">Guía de Ventas</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">45 páginas · $9.990</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Taller en vivo</p>
                      <p className="font-semibold text-sm">Branding Personal</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">2 horas · $19.990</div>
                </div>
              </div>
            </div>
          </div>

          {/* Social proof placeholder */}
          <p className="mt-12 text-center text-sm text-muted-foreground">
            ✨ Ya se están sumando creadores · Próximamente historias de éxito
          </p>
        </div>
      </section>

      {/* What can you sell */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              ¿Qué puedes vender en NOVU?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Todo tipo de productos digitales. Tú creas, nosotros lo hacemos simple.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productTypes.map((product) => (
              <div
                key={product.title}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <product.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{product.title}</h3>
                <p className="text-muted-foreground text-sm mt-1">{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Cómo funciona
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Tres pasos. Así de fácil.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6">
                    <step.icon className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-sm font-medium text-primary mb-2">{step.number}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="link" asChild className="text-primary">
              <Link to="/comisiones">
                Ver detalles de comisiones
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Commissions */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comisiones claras
          </h2>
          <p className="text-lg opacity-90 mb-12">
            Sin sorpresas. Sin letras chicas.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <div className="text-4xl font-bold mb-2">90%</div>
              <p className="opacity-90">Te quedas con el 90%</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <div className="text-4xl font-bold mb-2">10%</div>
              <p className="opacity-90">NOVU cobra por venta</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <div className="text-4xl font-bold mb-2">$0</div>
              <p className="opacity-90">Si no vendes, no pagas</p>
            </div>
          </div>

          <Button size="lg" variant="secondary" asChild>
            <Link to="/comisiones">
              Leer términos y comisiones
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Por qué NOVU
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Diseñado para que vendas sin distracciones.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
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
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
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
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ¿Listo para empezar?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Crea tu cuenta gratis y sube tu primer producto hoy. 
            Sin tarjeta de crédito. Sin compromisos.
          </p>

          <Button size="lg" className="text-base px-8" asChild>
            <Link to="/signup?role=creator">
              Crear mi cuenta gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">N</span>
              </div>
              <span className="text-xl font-bold">NOVU</span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
              <a href="#como-funciona" className="hover:text-foreground transition-colors">Cómo funciona</a>
              <Link to="/comisiones" className="hover:text-foreground transition-colors">Comisiones</Link>
              <Link to="/courses" className="hover:text-foreground transition-colors">Marketplace</Link>
              <Link to="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link>
              <Link to="/signup" className="hover:text-foreground transition-colors">Crear cuenta</Link>
            </nav>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} NOVU. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </>
  );
}
