import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">AulaNexo</span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-md">
                La plataforma líder de cursos online en Chile. Aprende de los mejores expertos y transforma tu carrera profesional.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Explorar</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/courses" className="hover:text-foreground transition-colors">Todos los Cursos</Link></li>
                <li><Link to="/courses?category=desarrollo-web" className="hover:text-foreground transition-colors">Desarrollo Web</Link></li>
                <li><Link to="/courses?category=marketing-digital" className="hover:text-foreground transition-colors">Marketing Digital</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Cuenta</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/login" className="hover:text-foreground transition-colors">Iniciar Sesión</Link></li>
                <li><Link to="/signup" className="hover:text-foreground transition-colors">Crear Cuenta</Link></li>
                <li><Link to="/signup?role=creator" className="hover:text-foreground transition-colors">Ser Creador</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} AulaNexo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
