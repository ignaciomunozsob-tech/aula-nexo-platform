import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { GraduationCap, Menu, X, ChevronDown, LogIn } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function PublicNavbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCreator = profile?.role === 'creator' || profile?.role === 'admin';

  // Estos son los destinos reales según tu router
  const studentLoginUrl = `/login?next=${encodeURIComponent('/app')}`;
  const creatorLoginUrl = `/login?next=${encodeURIComponent('/creator-app')}`;

  const initials = profile?.name?.charAt(0).toUpperCase() || 'U';

  const handleProfileClick = () => {
    if (isCreator) {
      // Creators go to their business dashboard
      navigate('/creator-app');
    } else {
      // Students go directly to their products
      navigate('/app/my-courses');
    }
  };

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">AulaNexo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/courses" className="text-muted-foreground hover:text-foreground transition-colors">
              Marketplace
            </Link>

            {user ? (
              // For students: direct click goes to "Mis Productos"
              // For creators: direct click goes to "Mi Negocio"
              <Button 
                variant="ghost" 
                className="flex items-center gap-2"
                onClick={handleProfileClick}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'Usuario'} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span>{profile?.name || 'Mi Cuenta'}</span>
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                {/* Dropdown de iniciar sesión */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
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

                <Button onClick={() => navigate('/signup')}>
                  Registrarse
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link
                to="/courses"
                className="text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Marketplace
              </Link>

              {user ? (
                <>
                  {isCreator ? (
                    <Link
                      to="/creator-app"
                      className="text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Mi Negocio
                    </Link>
                  ) : (
                    <Link
                      to="/app/my-courses"
                      className="text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Mis Productos
                    </Link>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-2 px-2">
                  <Button
                    variant="ghost"
                    onClick={() => { navigate(studentLoginUrl); setMobileMenuOpen(false); }}
                  >
                    Iniciar como estudiante
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => { navigate(creatorLoginUrl); setMobileMenuOpen(false); }}
                  >
                    Iniciar como creador
                  </Button>

                  <Button
                    onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                  >
                    Registrarse
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
