import { NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, BookOpen, User, LogOut, Home, DollarSign, Star, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CreatorSidebar() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  // Check if user has any enrollments (purchased courses)
  const { data: hasEnrollments } = useQuery({
    queryKey: ['creator-has-enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { count, error } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      if (error) return false;
      return (count || 0) > 0;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: '/creator-app', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/creator-app/products', icon: BookOpen, label: 'Mis Productos', end: false },
    { to: '/creator-app/finances', icon: DollarSign, label: 'Finanzas', end: false },
    { to: '/creator-app/reviews', icon: Star, label: 'Evaluaciones', end: false },
    { to: '/creator-app/profile', icon: User, label: 'Mi Perfil Público', end: false },
  ];

  const initials = profile?.name?.charAt(0).toUpperCase() || 'C';

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-sidebar-primary" />
          <span className="text-xl font-bold text-sidebar-foreground">AulaNexo</span>
        </NavLink>
      </div>

      {/* User Info with Dropdown */}
      <div className="p-4 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full focus:outline-none">
            <div className="flex items-center gap-3 hover:bg-sidebar-accent/50 rounded-lg p-2 -m-2 transition-colors cursor-pointer">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'Creador'} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-medium text-sidebar-foreground text-sm">{profile?.name || 'Creador'}</p>
                <p className="text-xs text-primary font-medium">Creador</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {hasEnrollments && (
              <DropdownMenuItem onClick={() => navigate('/app')}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Área de Alumno
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Ir al Inicio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Panel Creador
        </p>
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
