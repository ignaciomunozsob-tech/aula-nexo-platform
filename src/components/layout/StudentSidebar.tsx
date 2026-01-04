import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, Settings, LogOut, Home, Briefcase, Store } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function StudentSidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isCreator = profile?.role === 'creator' || profile?.role === 'admin';

  const navItems = [
    { to: '/app/my-courses', icon: BookOpen, label: 'Mis Cursos', end: false },
    { to: '/app/marketplace', icon: Store, label: 'Marketplace', end: false },
    { to: '/app/settings', icon: Settings, label: 'Configuración', end: false },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">N</span>
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">NOVU</span>
        </NavLink>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sidebar-primary font-semibold">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="font-medium text-sidebar-foreground text-sm">{profile?.name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">Estudiante</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'sidebar-item',
                    isActive && 'sidebar-item-active'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Creator Panel Button - only for creators */}
        {isCreator && (
          <div className="mt-6">
            <Button
              onClick={() => navigate('/creator-app')}
              className="w-full justify-start gap-2"
              variant="default"
            >
              <Briefcase className="h-5 w-5" />
              Mi Negocio
            </Button>
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-sidebar-border">
        <NavLink
          to="/"
          className="sidebar-item mb-2"
        >
          <Home className="h-5 w-5" />
          <span>Ir al Inicio</span>
        </NavLink>
        <button
          onClick={handleSignOut}
          className="sidebar-item w-full text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
