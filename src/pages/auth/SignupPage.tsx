import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100),
});

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'creator' ? 'creator' : 'student';
  const next = searchParams.get('next'); // e.g. /app o /creator-app

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'creator'>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = signupSchema.safeParse({ name, email, password });
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
    const { error } = await signUp(email, password, name, role);
    setLoading(false);

    if (error) {
      if ((error as any).message?.includes('already registered')) {
        toast({
          title: 'Usuario ya registrado',
          description: 'Este email ya tiene una cuenta. Intenta iniciar sesión.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error al registrarse',
          description: (error as any).message ?? 'Ocurrió un error',
          variant: 'destructive',
        });
      }
      return;
    }

    toast({
      title: '¡Cuenta creada!',
      description: 'Bienvenido a AulaNexo',
    });

    // Si venía un next, lo respetamos (pero evitamos mandar student al panel de creador)
    if (next) {
      const safeNext = next.startsWith('/creator-app') && role === 'student' ? '/app' : next;
      navigate(safeNext);
      return;
    }

    navigate(role === 'creator' ? '/creator-app' : '/app');
  };

  const loginLink = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AulaNexo</span>
          </Link>

          <h1 className="text-2xl font-bold mb-2">Crear cuenta</h1>
          <p className="text-muted-foreground mb-8">Comienza tu viaje de aprendizaje hoy</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="mt-1"
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

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

            <div>
              <Label>¿Qué quieres hacer?</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    role === 'student' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-semibold">Aprender</p>
                  <p className="text-sm text-muted-foreground">Tomar cursos</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('creator')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    role === 'creator' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-semibold">Enseñar</p>
                  <p className="text-sm text-muted-foreground">Crear cursos</p>
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta'
              )}
            </Button>
          </form>

          <p className="text-center mt-6 text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to={loginLink} className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image/Gradient */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-primary/70 items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <GraduationCap className="h-20 w-20 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">
            {role === 'creator' ? 'Comparte tu conocimiento' : 'Aprende sin límites'}
          </h2>
          <p className="text-white/80">
            {role === 'creator'
              ? 'Crea cursos increíbles y alcanza estudiantes en toda Latinoamérica.'
              : 'Accede a los mejores cursos creados por expertos en cada área.'}
          </p>
        </div>
      </div>
    </div>
  );
}
