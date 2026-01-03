import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'creator' || profile.role === 'admin') {
        navigate('/creator-app');
      } else {
        navigate('/app');
      }
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Error al iniciar sesión',
        description: 'Email o contraseña incorrectos',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: '¡Bienvenido!',
      description: 'Has iniciado sesión correctamente',
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AulaNexo</span>
          </Link>

          <h1 className="text-2xl font-bold mb-2">Iniciar sesión</h1>
          <p className="text-muted-foreground mb-8">
            Ingresa a tu cuenta de AulaNexo
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="mt-1"
                disabled={loading}
              />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          <p className="text-center mt-6 text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image/Gradient */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-primary/70 items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <GraduationCap className="h-20 w-20 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Bienvenido de vuelta</h2>
          <p className="text-white/80">
            Continúa aprendiendo donde lo dejaste. Tus cursos te esperan.
          </p>
        </div>
      </div>
    </div>
  );
}
