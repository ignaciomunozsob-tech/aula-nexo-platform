import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Calculator, CreditCard, Clock } from 'lucide-react';

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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Términos y Comisiones
          </h1>
          <p className="text-lg text-muted-foreground">
            Transparencia total. Sin sorpresas.
          </p>
        </div>

        {/* Main commission block */}
        <section className="bg-card border border-border rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">El modelo 90/10</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-primary/10 rounded-xl p-6 text-center">
              <div className="text-5xl font-bold text-primary mb-2">90%</div>
              <p className="text-lg font-medium">Para ti</p>
              <p className="text-sm text-muted-foreground mt-2">
                El 90% de cada venta es tuyo
              </p>
            </div>
            <div className="bg-muted rounded-xl p-6 text-center">
              <div className="text-5xl font-bold text-foreground mb-2">10%</div>
              <p className="text-lg font-medium">Para NOVU</p>
              <p className="text-sm text-muted-foreground mt-2">
                Nuestra comisión por cada venta
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>Solo cobramos cuando vendes. Si no vendes, no pagas nada.</span>
          </div>
        </section>

        {/* Example */}
        <section className="bg-muted/50 border border-border rounded-2xl p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Ejemplo con números</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Digamos que vendes un curso a <strong className="text-foreground">$10.000 CLP</strong>:
            </p>
            
            <div className="bg-background rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span>Precio de venta</span>
                <span className="font-semibold">$10.000</span>
              </div>
              <div className="flex justify-between items-center text-primary">
                <span>Tú recibes (90%)</span>
                <span className="font-bold text-lg">$9.000</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Comisión NOVU (10%)</span>
                <span>$1.000</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              * Este es un ejemplo ilustrativo. Los montos reales dependen del precio que definas para tus productos.
            </p>
          </div>
        </section>

        {/* Key points */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-bold mb-6">Lo que necesitas saber</h2>
          
          <div className="grid gap-4">
            <div className="flex gap-4 p-4 bg-card border border-border rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Sin mensualidad</h3>
                <p className="text-sm text-muted-foreground">
                  No hay cobros mensuales ni cuotas fijas. Crear tu cuenta y subir productos es 100% gratis.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-card border border-border rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Solo cobramos cuando vendes</h3>
                <p className="text-sm text-muted-foreground">
                  La comisión del 10% se aplica únicamente cuando realizas una venta. Si no vendes, no pagas absolutamente nada.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-card border border-border rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Pagos (próximamente)</h3>
                <p className="text-sm text-muted-foreground">
                  Estamos integrando pasarelas de pago como Webpay para que recibas tu dinero de forma automática. 
                  Por ahora, la plataforma funciona en modo demo para que puedas probar todo el flujo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="bg-card border border-border rounded-2xl p-8 mb-12">
          <h2 className="text-xl font-bold mb-6">¿Qué incluye la comisión del 10%?</h2>
          
          <ul className="space-y-3">
            {[
              'Hosting ilimitado para tu contenido',
              'Página de venta profesional para cada producto',
              'Sistema de entrega automática de accesos',
              'Panel de gestión de alumnos',
              'Soporte técnico',
              'Actualizaciones continuas de la plataforma',
            ].map((item, index) => (
              <li key={index} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold mb-4">¿Listo para empezar?</h2>
          <p className="text-muted-foreground mb-6">
            Crea tu cuenta gratis y sube tu primer producto hoy.
          </p>
          <Button size="lg" asChild>
            <Link to="/signup?role=creator">
              Crear mi cuenta gratis
            </Link>
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NOVU. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
