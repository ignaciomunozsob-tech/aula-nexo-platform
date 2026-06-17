import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Términos y Condiciones — NOVU"
        description="Términos y condiciones de uso de la plataforma NOVU para creadores y estudiantes en Chile."
        path="/terminos"
      />
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-neutral dark:prose-invert">
        <h1>Términos y Condiciones</h1>
        <p className="text-muted-foreground">Última actualización: {new Date().toLocaleDateString('es-CL')}</p>

        <h2>1. Sobre NOVU</h2>
        <p>
          NOVU es una plataforma que permite a creadores publicar y vender productos digitales (cursos,
          ebooks, eventos y comunidades) a estudiantes y clientes en Chile y el resto del mundo.
        </p>

        <h2>2. Cuentas</h2>
        <p>
          Para usar NOVU debes crear una cuenta con datos verídicos. Eres responsable de mantener segura
          tu contraseña y de toda la actividad realizada desde tu cuenta.
        </p>

        <h2>3. Productos y contenido</h2>
        <p>
          Los creadores son los únicos responsables por el contenido que publican. NOVU se reserva el
          derecho de remover contenido que infrinja derechos de terceros, leyes vigentes o estas
          condiciones.
        </p>

        <h2>4. Pagos</h2>
        <p>
          Los pagos se procesan a través de MercadoPago Chile. Los compradores pueden pagar con
          tarjeta de crédito, débito, transferencia o efectivo. NOVU no almacena información de
          tarjetas — todo se procesa directamente con MercadoPago.
        </p>

        <h2>5. Devoluciones</h2>
        <p>
          Las devoluciones de productos digitales se evalúan caso a caso. El creador puede definir
          su propia política de devoluciones para sus productos.
        </p>

        <h2>6. Comisiones y modelo de cobro</h2>
        <p>
          <strong>NOVU es gratis para empezar.</strong> No cobramos mensualidad, suscripción ni
          costo fijo por usar la plataforma. El creador sólo paga cuando vende.
        </p>
        <p>
          Por cada venta procesada, NOVU retiene un <strong>10% de comisión</strong> sobre el monto
          bruto. Esta comisión incluye los costos de procesamiento de pago (MercadoPago) y el uso
          de la infraestructura de NOVU.
        </p>
        <p>
          Adicionalmente, los creadores pueden activar el <strong>add-on de comunidad</strong> en
          sus cursos. Cuando está activo, NOVU cobra <strong>$990 CLP adicionales por venta</strong>
          {' '}de ese curso, que permiten al creador habilitar un espacio de comunidad privado para
          sus alumnos. Si se desactiva el add-on, no hay reembolsos de ventas anteriores.
        </p>
        <p>
          Ejemplo: una venta de $50.000 CLP con comunidad activa = $5.000 comisión + $990 comunidad
          = $44.010 netos al creador.
        </p>

        <h2>7. Limitación de responsabilidad</h2>
        <p>
          NOVU se entrega "tal cual" sin garantías de disponibilidad permanente. No nos hacemos
          responsables por daños indirectos derivados del uso de la plataforma.
        </p>

        <h2>8. Cambios</h2>
        <p>
          Podemos actualizar estos términos en cualquier momento. Te avisaremos por correo cuando haya
          cambios significativos.
        </p>

        <h2>9. Contacto</h2>
        <p>Para dudas sobre estos términos, escríbenos a soporte@novu.cl o por WhatsApp al +56 9 3372 8004.</p>
      </main>

      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NOVU. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
