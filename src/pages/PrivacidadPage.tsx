import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Política de Privacidad — NOVU"
        description="Cómo NOVU recopila, usa y protege los datos personales de creadores y estudiantes según la Ley 19.628 de Chile."
        path="/privacidad"
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
        <h1>Política de Privacidad</h1>
        <p className="text-muted-foreground">Última actualización: 13 de julio de 2026</p>

        <h2>1. Responsable del tratamiento</h2>
        <p>
          Raffa SpA, RUT 77.658.167-4
          <br />
          Av. Providencia 1017, Oficina 41,
          <br />
          Providencia, Santiago, Chile.
          <br />
          Contacto: <a href="mailto:soporte@novu.cl">soporte@novu.cl</a>
        </p>

        <h2>2. Qué datos recopilamos</h2>

        <p>
          <strong>Datos de cuenta:</strong>
        </p>
        <ul>
          <li>Nombre y apellido</li>
          <li>Correo electrónico</li>
          <li>Contraseña (almacenada con cifrado bcrypt, nunca en texto plano)</li>
        </ul>

        <p>
          <strong>Datos de perfil (opcionales):</strong>
        </p>
        <ul>
          <li>Foto de perfil</li>
          <li>Biografía</li>
          <li>Redes sociales</li>
        </ul>

        <p>
          <strong>Datos de facturación (solo creadores):</strong>
        </p>
        <ul>
          <li>RUT</li>
          <li>Dirección</li>
          <li>Datos bancarios para retiros</li>
        </ul>

        <p>
          <strong>Datos de compra:</strong>
        </p>
        <ul>
          <li>Productos adquiridos</li>
          <li>Montos y fechas de transacciones</li>
          <li>Referencias de pago</li>
        </ul>

        <p>
          <strong>Datos de Google Calendar (solo si conectas tu cuenta):</strong>
        </p>
        <ul>
          <li>Acceso de lectura y escritura a tu calendario para crear y gestionar eventos de agenda 1:1</li>
          <li>
            NOVU solo accede al calendario para crear, modificar y eliminar eventos relacionados con sesiones agendadas
            en la plataforma
          </li>
          <li>No leemos, almacenamos ni compartimos el contenido de otros eventos de tu calendario</li>
          <li>
            Puedes revocar este acceso en cualquier momento desde{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
              myaccount.google.com/permissions
            </a>
          </li>
        </ul>

        <p>
          <strong>Datos técnicos:</strong>
        </p>
        <ul>
          <li>Dirección IP</li>
          <li>Navegador y dispositivo</li>
          <li>Eventos de uso para analítica</li>
        </ul>

        <h2>3. Para qué los usamos</h2>
        <ul>
          <li>Operar la plataforma y entregarte los productos comprados</li>
          <li>Procesar pagos a través de MercadoPago</li>
          <li>Gestionar eventos de agenda 1:1 en Google Calendar cuando lo conectas</li>
          <li>
            Enviarte comunicaciones transaccionales (confirmación de compra, recuperación de contraseña, notificaciones)
          </li>
          <li>Mejorar el producto mediante analítica anónima</li>
          <li>Cumplir obligaciones legales</li>
        </ul>

        <h2>4. Con quién compartimos</h2>
        <p>Solo con proveedores necesarios para operar:</p>
        <ul>
          <li>
            <strong>MercadoPago</strong> → procesamiento de pagos
          </li>
          <li>
            <strong>Resend</strong> → envío de emails transaccionales
          </li>
          <li>
            <strong>MailerLite</strong> → comunicaciones a creadores
          </li>
          <li>
            <strong>Google</strong> → integración con Calendar (solo si la activas)
          </li>
          <li>
            <strong>Meta</strong> → pixel de marketing (solo si lo activas como creador)
          </li>
          <li>
            <strong>Bunny.net</strong> → alojamiento de videos
          </li>
        </ul>
        <p>No vendemos tu información personal a terceros bajo ninguna circunstancia.</p>

        <h2>5. Retención de datos</h2>
        <ul>
          <li>Datos de cuenta: mientras la cuenta esté activa + 2 años tras eliminarla</li>
          <li>Datos de transacciones: 6 años (obligación tributaria chilena)</li>
          <li>
            Datos de Google Calendar: no almacenamos datos del calendario, solo el token de acceso que se elimina al
            desconectar la integración
          </li>
          <li>Datos técnicos: 12 meses</li>
        </ul>

        <h2>6. Tus derechos</h2>
        <p>De acuerdo a la Ley 19.628 de Chile, puedes solicitar:</p>
        <ul>
          <li>Acceso a tus datos personales</li>
          <li>Rectificación de datos incorrectos</li>
          <li>Cancelación de tu cuenta y datos</li>
          <li>Oposición al tratamiento de tus datos</li>
        </ul>
        <p>
          Para ejercer estos derechos escribe a <a href="mailto:soporte@novu.cl">soporte@novu.cl</a>. Responderemos en
          un plazo máximo de 30 días hábiles.
        </p>

        <h2>7. Datos de Google</h2>
        <p>
          El uso de los datos obtenidos de las APIs de Google cumple con la Política de Datos de Usuario de Google,
          incluyendo los requisitos de Uso Limitado.
        </p>
        <p>NOVU accede a los datos de Google Calendar exclusivamente para:</p>
        <ul>
          <li>Crear eventos de sesiones 1:1 agendadas por alumnos</li>
          <li>Modificar o cancelar esos eventos</li>
          <li>Mostrar disponibilidad al creador</li>
        </ul>
        <p>NOVU no usa datos de Google para:</p>
        <ul>
          <li>Publicidad personalizada</li>
          <li>Venta a terceros</li>
          <li>Cualquier propósito ajeno a la funcionalidad de agenda de NOVU</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          Usamos cookies estrictamente necesarias para mantener tu sesión y cookies opcionales de analítica que puedes
          desactivar desde tu navegador.
        </p>

        <h2>9. Seguridad</h2>
        <ul>
          <li>Cifrado en tránsito (HTTPS)</li>
          <li>Almacenamiento seguro de credenciales</li>
          <li>Políticas de acceso por fila (RLS) en nuestra base de datos</li>
          <li>Acceso restringido a datos personales solo para personal autorizado</li>
        </ul>

        <h2>10. Menores de edad</h2>
        <p>
          NOVU no está dirigida a menores de 18 años. No recopilamos conscientemente datos de menores. Si detectamos una
          cuenta de menor de edad, la eliminaremos de inmediato.
        </p>

        <h2>11. Cambios en esta política</h2>
        <p>
          Te notificaremos por email con al menos 15 días de anticipación ante cualquier cambio significativo en esta
          política.
        </p>

        <h2>12. Contacto</h2>
        <p>
          Para consultas sobre privacidad: <a href="mailto:soporte@novu.cl">soporte@novu.cl</a> o por WhatsApp al{" "}
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
