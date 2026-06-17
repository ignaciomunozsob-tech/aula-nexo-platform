import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessagesSquare, Wallet } from 'lucide-react';
import { SEO } from '@/components/SEO';

const SUPPORT_WA = 'https://wa.me/56933728004';

export default function ComisionesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Comisiones y costos — NOVU"
        description="Una sola comisión del 10% por venta, con procesamiento de MercadoPago incluido. Sin letra chica."
        path="/comisiones"
      />

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
            Comisiones y costos
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">Sin letra chica. Sin sorpresas.</p>
        </div>

        {/* 1 */}
        <section>
          <h2 className="text-2xl font-black text-foreground mb-5 text-center">Una sola comisión</h2>
          <div className="max-w-[600px] mx-auto rounded-3xl p-10 text-center" style={{ background: '#0a0a0a', color: '#fff' }}>
            <div className="text-3xl md:text-4xl font-black">10% por venta · todo incluido</div>
            <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Incluye costos de procesamiento de MercadoPago. Sin cargos adicionales.
            </p>
          </div>
        </section>

        {/* 2 */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-foreground mb-3 text-center">Cuotas sin interés</h2>
          <p className="text-muted-foreground text-center mb-6">
            Tus alumnos pueden pagar en hasta 3 cuotas sin interés. Incluido en la comisión del 10%.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f3f4f6', color: '#1a1a1a' }}>
                  <th className="text-left px-5 py-3 font-bold">Cuotas</th>
                  <th className="text-left px-5 py-3 font-bold">Lo que paga el alumno</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { c: '1 cuota', t: 'Precio completo' },
                  { c: '2 cuotas', t: 'Precio / 2 por mes' },
                  { c: '3 cuotas', t: 'Precio / 3 por mes' },
                ].map((r, i) => (
                  <tr key={r.c} className={i % 2 === 1 ? 'bg-muted/40' : ''}>
                    <td className="px-5 py-3 font-medium text-foreground">{r.c}</td>
                    <td className="px-5 py-3 text-foreground/90">{r.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3 */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-foreground mb-5 text-center">Cargos adicionales opcionales</h2>
          <div className="rounded-2xl border border-border bg-card p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--novu-accent) / 0.18)' }}>
              <MessagesSquare className="h-6 w-6" style={{ color: 'hsl(var(--novu-accent))' }} />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Comunidad por curso</h3>
              <p className="text-sm text-muted-foreground mt-1">
                $990 por cada venta del curso donde actives la comunidad.
              </p>
            </div>
          </div>
        </section>

        {/* 4 */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-foreground mb-5 text-center">¿Cuándo recibo mi dinero?</h2>
          <div className="rounded-2xl border border-border bg-card p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--novu-accent) / 0.18)' }}>
              <Wallet className="h-6 w-6" style={{ color: 'hsl(var(--novu-accent))' }} />
            </div>
            <p className="text-foreground/90">
              Los pagos se acreditan en aproximadamente 10 días hábiles. Lo configuras desde MercadoPago.
            </p>
          </div>
        </section>

        <section className="text-center">
          <a
            href={SUPPORT_WA}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-7 py-3.5 rounded-full font-bold text-base transition-transform hover:scale-105"
            style={{ background: '#fcc70e', color: '#1a1a1a' }}
          >
            Escribir al soporte
          </a>
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
