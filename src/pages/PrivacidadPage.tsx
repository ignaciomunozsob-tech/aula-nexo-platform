import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background">
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
        <p className="text-muted-foreground">Última actualización: {new Date().toLocaleDateString('es-CL')}</p>

        <h2>1. Qué datos recopilamos</h2>
        <ul>
          <li>Datos de cuenta: nombre, email, contraseña (hasheada).</li>
          <li>Datos de perfil: avatar, biografía, redes sociales (opcionales).</li>
          <li>Datos de facturación cuando vendes (RUT, dirección, banco).</li>
          <li>Datos de compra: productos adquiridos, montos, fechas.</li>
          <li>Datos técnicos: IP, navegador y eventos de uso (Meta Pixel).</li>
        </ul>

        <h2>2. Para qué los usamos</h2>
        <ul>
          <li>Operar la plataforma y entregarte los productos comprados.</li>
          <li>Procesar pagos a través de MercadoPago.</li>
          <li>Enviarte comunicaciones transaccionales (compras, recuperación de contraseña, 2FA).</li>
          <li>Mejorar el producto mediante analítica anónima.</li>
        </ul>

        <h2>3. Con quién compartimos</h2>
        <p>
          Solo con proveedores necesarios para operar: MercadoPago (pagos), Resend (correo), Meta
          (pixel de marketing si lo activas), y nuestra infraestructura de hosting. No vendemos tu
          información personal a terceros.
        </p>

        <h2>4. Tus derechos</h2>
        <p>
          De acuerdo a la Ley 19.628 de Chile, puedes solicitar acceso, rectificación, cancelación u
          oposición al tratamiento de tus datos escribiendo a soporte@novu.cl.
        </p>

        <h2>5. Cookies</h2>
        <p>
          Usamos cookies estrictamente necesarias para mantener tu sesión y cookies opcionales de
          analítica que puedes desactivar desde tu navegador.
        </p>

        <h2>6. Seguridad</h2>
        <p>
          Aplicamos cifrado en tránsito (HTTPS), almacenamiento seguro de credenciales y políticas de
          acceso por fila (RLS) en nuestra base de datos.
        </p>

        <h2>7. Contacto</h2>
        <p>Para cualquier consulta sobre privacidad: soporte@novu.cl.</p>
      </main>

      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NOVU. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
