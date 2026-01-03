import { NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, BookOpen, Settings, LogOut, Home } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function StudentSidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/app/my-courses', icon: BookOpen, label: 'Mis Cursos', end: false },
    { to: '/app/settings', icon: Settings, label: 'Configuración', end: false },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-sidebar-primary" />
          <span className="text-xl font-bold text-sidebar-foreground">AulaNexo</span>
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
            <p className="text-xs text-muted-foreground capitalize">{profile?.role || 'Alumno'}</p>
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

        {/* Creator Link */}
        {(profile?.role === 'creator' || profile?.role === 'admin') && (
          <div className="mt-6 pt-6 border-t border-sidebar-border">
            <NavLink
              to="/creator-app"
              className="sidebar-item text-sidebar-primary"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Panel Creador</span>
            </NavLink>
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
