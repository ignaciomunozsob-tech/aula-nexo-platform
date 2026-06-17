import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { GraduationCap, Shield, Lock, Database, Mail, FileText, AlertCircle } from "lucide-react";

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Confianza y Seguridad — NOVU"
        description="Cómo NOVU protege tus datos: autenticación, almacenamiento, pagos, privacidad y prácticas de seguridad."
      />

      <header className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">NOVU</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Shield className="h-4 w-4" />
            Confianza y Seguridad
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Cómo protegemos NOVU</h1>
          <p className="text-lg text-muted-foreground">
            Esta página la mantiene el equipo de NOVU para responder las dudas más comunes sobre
            seguridad, privacidad y manejo de datos. <strong>No constituye una certificación
            independiente</strong> ni una auditoría externa.
          </p>
        </div>

        <div className="space-y-10">
          <Section icon={<Lock className="h-5 w-5" />} title="Autenticación y acceso">
            <ul className="space-y-2 text-muted-foreground">
              <li>• Inicio de sesión con email y contraseña, o con Google.</li>
              <li>• Las contraseñas se almacenan con hashing seguro (gestionado por la infraestructura de auth, no las vemos ni almacenamos en texto plano).</li>
              <li>• Verificación adicional en dos pasos (código por email) para todas las cuentas de creador.</li>
              <li>• La sesión se renueva automáticamente y puede cerrarse desde cualquier dispositivo.</li>
            </ul>
          </Section>

          <Section icon={<Database className="h-5 w-5" />} title="Datos y aislamiento entre cuentas">
            <ul className="space-y-2 text-muted-foreground">
              <li>• La base de datos aplica reglas de acceso a nivel de fila (Row-Level Security): cada creador sólo lee y modifica sus propios productos, ventas y alumnos.</li>
              <li>• Los roles (alumno, creador, admin) se administran en una tabla separada para evitar escalamiento de privilegios desde el cliente.</li>
              <li>• Los archivos privados (videos de curso, ebooks, recursos de clase) viven en buckets restringidos y se sirven con URLs firmadas de corta duración, sólo a alumnos con compra activa.</li>
              <li>• Los enlaces de reuniones (Google Meet/Zoom) de eventos pagados sólo se entregan a quienes están inscritos.</li>
            </ul>
          </Section>

          <Section icon={<Shield className="h-5 w-5" />} title="Pagos">
            <ul className="space-y-2 text-muted-foreground">
              <li>• Los pagos se procesan en MercadoPago Chile. NOVU no almacena información de tarjetas.</li>
              <li>• Cada creador conecta su propia cuenta de MercadoPago (OAuth); el dinero se transfiere directo al vendedor.</li>
              <li>• Las notificaciones de pago vienen firmadas con HMAC-SHA256 y se validan en el servidor antes de marcar una orden como pagada.</li>
            </ul>
          </Section>

          <Section icon={<Mail className="h-5 w-5" />} title="Emails y comunicaciones">
            <ul className="space-y-2 text-muted-foreground">
              <li>• Los correos transaccionales (códigos 2FA, bienvenida, notificaciones de venta) se envían desde <code className="px-1.5 py-0.5 bg-muted rounded text-xs">notificaciones.soynovu.cl</code>, un subdominio verificado.</li>
              <li>• Cada correo lleva un enlace de baja (unsubscribe) para opciones no esenciales.</li>
              <li>• No vendemos ni compartimos los emails de los usuarios con terceros.</li>
            </ul>
          </Section>

          <Section icon={<FileText className="h-5 w-5" />} title="Recolección y retención de datos">
            <ul className="space-y-2 text-muted-foreground">
              <li>• Recopilamos: nombre, email, foto de perfil opcional, datos de facturación (sólo creadores), historial de ventas y progreso en cursos.</li>
              <li>• Los datos se conservan mientras la cuenta esté activa. Puedes solicitar la eliminación escribiéndonos.</li>
              <li>• Usamos Meta Pixel (opcional, configurable por cada creador) para medir conversiones de su propio catálogo.</li>
            </ul>
          </Section>

          <Section icon={<AlertCircle className="h-5 w-5" />} title="Reporte de vulnerabilidades">
            <p className="text-muted-foreground mb-2">
              Si descubres un problema de seguridad, escríbenos directamente a{" "}
              <a href="mailto:soporte@novu.cl" className="text-primary hover:underline font-medium">
                soporte@novu.cl
              </a>{" "}
              con los detalles. Respondemos en menos de 72 horas hábiles.
            </p>
            <p className="text-sm text-muted-foreground">
              Te pedimos no divulgar la vulnerabilidad públicamente hasta que la hayamos corregido.
            </p>
          </Section>

          <Section icon={<Shield className="h-5 w-5" />} title="Responsabilidades compartidas">
            <p className="text-muted-foreground mb-3">
              La seguridad de la plataforma se reparte entre tres partes:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>NOVU</strong>: protege la infraestructura, las reglas de acceso, los pagos y la entrega de archivos privados.</li>
              <li>• <strong>Creadores</strong>: protegen su contraseña, mantienen activo el 2FA, definen el contenido y políticas de devolución de sus productos.</li>
              <li>• <strong>Alumnos</strong>: protegen su cuenta, no comparten contenido descargado y reportan cualquier acceso sospechoso.</li>
            </ul>
          </Section>
        </div>

        <div className="mt-16 p-6 rounded-lg border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Esta página se actualiza cuando cambian nuestras prácticas. Última revisión:{" "}
            {new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}.
            Para preguntas adicionales escríbenos a{" "}
            <a href="mailto:soporte@novu.cl" className="text-primary hover:underline">soporte@novu.cl</a>{" "}
            o por WhatsApp al{" "}
            <a href="https://wa.me/56933728004" className="text-primary hover:underline">+56 9 3372 8004</a>.
          </p>
        </div>

        <div className="mt-8 flex gap-4 text-sm">
          <Link to="/privacidad" className="text-primary hover:underline">Política de privacidad</Link>
          <Link to="/terminos" className="text-primary hover:underline">Términos de servicio</Link>
        </div>
      </main>

      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NOVU. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="pl-13">{children}</div>
    </section>
  );
}
