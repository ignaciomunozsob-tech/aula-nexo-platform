import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown, LogIn, GraduationCap, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from '@/lib/theme';

function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border border-border hover:bg-muted transition-colors ${className}`}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function PublicNavbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCreator = profile?.role === 'creator' || profile?.role === 'admin';

  const studentLoginUrl = `/login?next=${encodeURIComponent('/app')}`;
  const creatorLoginUrl = `/login?next=${encodeURIComponent('/creator-app')}`;

  const goLogin = (intent: 'creator' | 'student', url: string) => {
    try { localStorage.setItem('novu:login_intent', intent); } catch {}
    navigate(url);
  };

  const initials = profile?.name?.charAt(0).toUpperCase() || 'U';

  const handleProfileClick = () => {
    if (isCreator) navigate('/creator-app');
    else navigate('/app/my-courses');
  };

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--novu-accent))' }}>
              <GraduationCap className="h-5 w-5" style={{ color: 'hsl(var(--novu-text-on-accent))' }} />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">NOVU</span>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            <Link to="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Marketplace
            </Link>
            <Link to="/precios" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Precios
            </Link>

            {user ? (
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-full"
                onClick={handleProfileClick}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'Usuario'} />
                  <AvatarFallback className="bg-primary/20 text-foreground font-semibold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{profile?.name || 'Mi cuenta'}</span>
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 rounded-full text-sm">
                      <LogIn className="h-4 w-4" />
                      Iniciar sesión
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate(studentLoginUrl)}>
                      Iniciar como estudiante
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(creatorLoginUrl)}>
                      Iniciar como creador
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  onClick={() => navigate('/signup?role=creator')}
                  className="novu-btn-primary text-sm"
                  style={{ padding: '10px 22px' }}
                >
                  Crear cuenta gratis
                </button>
              </div>
            )}

            <ThemeToggle />
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-3">
              <Link to="/courses" className="text-muted-foreground hover:text-foreground px-2 py-2" onClick={() => setMobileMenuOpen(false)}>
                Marketplace
              </Link>
              <Link to="/precios" className="text-muted-foreground hover:text-foreground px-2 py-2" onClick={() => setMobileMenuOpen(false)}>
                Precios
              </Link>
              <Link to="/comisiones" className="text-muted-foreground hover:text-foreground px-2 py-2" onClick={() => setMobileMenuOpen(false)}>
                Comisiones
              </Link>
              {user ? (
                isCreator ? (
                  <Link to="/creator-app" className="text-muted-foreground hover:text-foreground px-2 py-2" onClick={() => setMobileMenuOpen(false)}>
                    Mi negocio
                  </Link>
                ) : (
                  <Link to="/app/my-courses" className="text-muted-foreground hover:text-foreground px-2 py-2" onClick={() => setMobileMenuOpen(false)}>
                    Mis productos
                  </Link>
                )
              ) : (
                <div className="flex flex-col gap-2 px-2">
                  <Button variant="ghost" onClick={() => { navigate(studentLoginUrl); setMobileMenuOpen(false); }}>
                    Iniciar como estudiante
                  </Button>
                  <Button variant="ghost" onClick={() => { navigate(creatorLoginUrl); setMobileMenuOpen(false); }}>
                    Iniciar como creador
                  </Button>
                  <button
                    onClick={() => { navigate('/signup?role=creator'); setMobileMenuOpen(false); }}
                    className="novu-btn-primary text-sm"
                  >
                    Crear cuenta
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
