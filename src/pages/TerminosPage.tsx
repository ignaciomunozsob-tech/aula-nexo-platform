import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

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
        <p className="text-muted-foreground">Última actualización: 13 de julio de 2026</p>

        <h2>1. Sobre NOVU</h2>
        <p>
          NOVU es una plataforma digital operada por Raffa SpA, RUT 77.658.167-4, con domicilio en Av. Providencia 1017,
          Oficina 41, Providencia, Santiago, Chile. NOVU permite a creadores publicar y vender productos digitales como
          cursos, ebooks, plantillas y eventos, y a compradores adquirirlos. La plataforma opera exclusivamente en
          Chile.
        </p>

        <h2>2. Edad mínima</h2>
        <p>
          Para usar NOVU debes tener al menos 18 años de edad. Al crear una cuenta declaras que cumples con este
          requisito. NOVU se reserva el derecho de suspender cuentas que no cumplan con esta condición.
        </p>

        <h2>3. Cuentas</h2>
        <p>
          Para usar NOVU debes crear una cuenta con datos verídicos. Eres responsable de mantener segura tu contraseña y
          de toda la actividad realizada desde tu cuenta. NOVU no se hace responsable por accesos no autorizados
          derivados de negligencia del usuario.
        </p>

        <h2>4. Contenido prohibido</h2>
        <p>Está estrictamente prohibido publicar, vender o promocionar en NOVU cualquier contenido que:</p>
        <ul>
          <li>Promueva actividades ilegales o delictivas de cualquier tipo</li>
          <li>Instruya sobre el uso, producción o comercialización de sustancias ilícitas o controladas</li>
          <li>Contenga material sexual explícito o pornográfico</li>
          <li>Promueva la autolesión, el suicidio o conductas de riesgo para la salud</li>
          <li>
            Incite al odio, discriminación o violencia por razones de raza, género, orientación sexual, religión u otras
            características personales
          </li>
          <li>Infrinja derechos de autor, marcas registradas u otros derechos de propiedad intelectual de terceros</li>
          <li>Contenga información falsa o engañosa que pueda perjudicar a compradores</li>
          <li>Esté asociado con fraude, estafa o prácticas comerciales desleales</li>
        </ul>
        <p>
          NOVU se reserva el derecho de revisar cualquier contenido publicado en la plataforma y de eliminarlo sin
          previo aviso si infringe estas condiciones.
        </p>

        <h2>5. Suspensión y baneo de cuentas</h2>
        <p>NOVU puede suspender o eliminar permanentemente una cuenta de creador en los siguientes casos:</p>
        <ul>
          <li>Publicación de contenido prohibido según la sección anterior</li>
          <li>Reincidencia en infracciones a estos términos</li>
          <li>Comportamiento abusivo hacia compradores u otros usuarios</li>
          <li>Uso de la plataforma para actividades fraudulentas o ilegales</li>
          <li>Suplantación de identidad</li>
          <li>Manipulación de reseñas o métricas</li>
        </ul>
        <p>
          <strong>Proceso de suspensión:</strong>
        </p>
        <ul>
          <li>Infracción leve: aviso por email con plazo de 48 horas para corregir</li>
          <li>Infracción grave: suspensión inmediata con aviso por email explicando el motivo</li>
          <li>
            Infracción muy grave o reincidencia: eliminación permanente de la cuenta sin reembolso de comisiones
            pendientes
          </li>
        </ul>
        <p>
          El creador puede apelar una suspensión escribiendo a soporte@novu.cl dentro de los 5 días hábiles siguientes.
        </p>

        <h2>6. Baja de contenido</h2>
        <p>
          Si un producto publicado infringe estos términos, NOVU puede darlo de baja de forma inmediata. El creador
          recibirá un email notificando el motivo específico de la baja. Los compradores que ya hayan adquirido el
          producto mantendrán su acceso salvo que el contenido sea manifiestamente ilegal, caso en que se evaluará el
          reembolso.
        </p>

        <h2>7. Productos y contenido</h2>
        <p>
          Los creadores son los únicos responsables por el contenido que publican. NOVU actúa como intermediario técnico
          y no es responsable por la calidad, veracidad o legalidad del contenido publicado por terceros.
        </p>

        <h2>8. Pagos</h2>
        <p>
          Los pagos se procesan a través de MercadoPago Chile. Los compradores pueden pagar con tarjeta de crédito,
          débito o transferencia. NOVU no almacena información de tarjetas — todo se procesa directamente con
          MercadoPago.
        </p>

        <h2>9. Devoluciones</h2>
        <p>
          Las devoluciones de productos digitales se evalúan caso a caso. El creador puede definir su propia política de
          devoluciones para sus productos. NOVU no intermedia en disputas entre compradores y creadores — el comprador
          debe contactar directamente al creador.
        </p>

        <h2>10. Comisiones y modelo de cobro</h2>
        <p>
          <strong>NOVU es gratis para empezar.</strong> No cobramos mensualidad, suscripción ni costo fijo por usar la
          plataforma. El creador solo paga cuando vende.
        </p>
        <p>
          Por cada venta procesada, NOVU retiene un <strong>10% de comisión</strong> sobre el monto bruto. Esta comisión
          incluye los costos de procesamiento de pago (MercadoPago) y el uso de la infraestructura de NOVU.
        </p>
        <p>
          Adicionalmente, los creadores pueden activar el <strong>add-on de comunidad</strong> en sus cursos. Cuando
          está activo, NOVU cobra <strong>$990 CLP adicionales por venta</strong> de ese curso. Si se desactiva el
          add-on, no hay reembolsos de ventas anteriores.
        </p>
        <p>
          Ejemplo: una venta de $50.000 CLP con comunidad activa = $5.000 comisión + $990 comunidad = $44.010 netos al
          creador.
        </p>

        <h2>11. Integraciones de terceros</h2>
        <p>
          NOVU puede integrarse con servicios de terceros como Google Calendar para funcionalidades de agenda. Al
          conectar estos servicios, el usuario acepta también los términos y condiciones del servicio correspondiente.
          El uso de Google Calendar a través de NOVU se rige además por las Políticas de Privacidad de Google
          disponibles en{" "}
          <a href="https://policies.google.com" target="_blank" rel="noopener noreferrer">
            policies.google.com
          </a>
          .
        </p>

        <h2>12. Limitación de responsabilidad</h2>
        <p>
          NOVU se entrega "tal cual" sin garantías de disponibilidad permanente. No nos hacemos responsables por daños
          indirectos derivados del uso de la plataforma.
        </p>

        <h2>13. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa se someterá a los tribunales
          competentes de la ciudad de Santiago.
        </p>

        <h2>14. Cambios</h2>
        <p>
          Podemos actualizar estos términos en cualquier momento. Te avisaremos por correo cuando haya cambios
          significativos con al menos 15 días de anticipación.
        </p>

        <h2>15. Contacto</h2>
        <p>
          Para dudas sobre estos términos, escríbenos a <a href="mailto:soporte@novu.cl">soporte@novu.cl</a> o por
          WhatsApp al{" "}
          <a href="https://wa.me/56933728004" target="_blank" rel="noopener noreferrer">
            +56 9 3372 8004
          </a>
          .
        </p>
      </main>

      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NOVU · Raffa SpA · Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
