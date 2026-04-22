import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Users, LogOut, Home, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AdminSidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/courses', icon: GraduationCap, label: 'Cursos NOVU', end: false },
    { to: '/admin/instructors', icon: Users, label: 'Instructores', end: false },
  ];

  const initials = profile?.name?.charAt(0).toUpperCase() || 'A';

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">N</span>
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">NOVU</span>
        </NavLink>
      </div>

      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'Admin'} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sidebar-foreground text-sm truncate">
              {profile?.name || 'Administrador'}
            </p>
            <p className="text-xs text-primary font-medium flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Admin NOVU
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Panel Admin
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn('sidebar-item', isActive && 'sidebar-item-active')
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <NavLink to="/" className="sidebar-item mb-2">
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
