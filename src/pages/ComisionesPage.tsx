import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Calculator, CreditCard, Sparkles } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function ComisionesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ backgroundColor: '#fcc70e', color: '#000' }}
          >
            Comisiones por plan
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Cobramos cuando tú cobras
          </h1>
          <p className="text-lg text-muted-foreground">
            Sin mensualidades obligatorias. La comisión depende del plan que elijas.
          </p>
        </div>

        {/* Plans summary */}
        <section className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Plan Gratis</p>
            <div className="text-4xl font-bold text-foreground mb-2">10%</div>
            <p className="text-sm text-muted-foreground">por cada venta</p>
          </div>
          <div className="bg-card border-2 rounded-2xl p-6 text-center relative" style={{ borderColor: '#fcc70e' }}>
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#fcc70e', color: '#000' }}
            >
              Más popular
            </span>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Plan Creador</p>
            <div className="text-4xl font-bold text-foreground mb-2">5%</div>
            <p className="text-sm text-muted-foreground">por cada venta</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Plan Pro</p>
            <div className="text-4xl font-bold text-foreground mb-2">Por definir</div>
            <p className="text-sm text-muted-foreground">enterprise</p>
          </div>
        </section>

        <div className="text-center mb-12">
          <Button size="lg" asChild>
            <Link to="/precios">
              <Sparkles className="h-4 w-4 mr-2" />
              Ver detalle completo de planes
            </Link>
          </Button>
        </div>

        {/* Example */}
        <section className="bg-muted/50 border border-border rounded-2xl p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="h-6 w-6" style={{ color: '#fcc70e' }} />
            <h2 className="text-xl font-bold">Ejemplo con números</h2>
          </div>

          <p className="text-muted-foreground mb-4">
            Si vendes un curso a <strong className="text-foreground">$10.000 CLP</strong>:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-background rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Plan Gratis (10%)</p>
              <div className="flex justify-between text-sm"><span>Tú recibes</span><span className="font-bold">$9.000</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>NOVU</span><span>$1.000</span></div>
            </div>
            <div className="bg-background rounded-lg p-4 space-y-2 border-2" style={{ borderColor: '#fcc70e' }}>
              <p className="text-sm font-semibold text-muted-foreground">Plan Creador (5%)</p>
              <div className="flex justify-between text-sm"><span>Tú recibes</span><span className="font-bold">$9.500</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>NOVU</span><span>$500</span></div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            * Ejemplo ilustrativo. A esto se suma la comisión de MercadoPago según el método de pago.
          </p>
        </section>

        {/* Key points */}
        <section className="space-y-4 mb-12">
          <div className="flex gap-4 p-4 bg-card border border-border rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(252,199,14,0.15)' }}>
              <CreditCard className="h-5 w-5" style={{ color: '#fcc70e' }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Empezar es gratis</h3>
              <p className="text-sm text-muted-foreground">
                Crear tu cuenta y subir productos no cuesta nada. El Plan Creador es opcional y solo cobra si te conviene reducir la comisión.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-card border border-border rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(252,199,14,0.15)' }}>
              <CheckCircle2 className="h-5 w-5" style={{ color: '#fcc70e' }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Solo cobramos cuando vendes</h3>
              <p className="text-sm text-muted-foreground">
                La comisión se aplica únicamente sobre ventas reales. Si no vendes, no pagas.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold mb-4">¿Listo para empezar?</h2>
          <p className="text-muted-foreground mb-6">Crea tu cuenta gratis y sube tu primer producto hoy.</p>
          <Button size="lg" asChild>
            <Link to="/signup?role=creator">Crear mi cuenta gratis</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NOVU. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
