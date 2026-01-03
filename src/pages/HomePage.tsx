import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Users, Trophy, ArrowRight, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CourseCard } from '@/components/courses/CourseCard';

export default function HomePage() {
  const navigate = useNavigate();

  // Rutas reales según tu App.tsx
  const STUDENT_PORTAL = '/app';
  const CREATOR_PORTAL = '/creator-app';

  async function goToPortal(path: string) {
    const { data } = await supabase.auth.getUser();

    // Si no hay sesión → login con next
    if (!data.user) {
      navigate(`/login?next=${encodeURIComponent(path)}`);
      return;
    }

    // Si hay sesión → entra directo al portal elegido
    navigate(path);
  }

  const { data: featuredCourses } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(
          `
          *,
          profiles:creator_id (
            name,
            creator_slug
          )
        `
        )
        .eq('status', 'published')
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').limit(8);

      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-background py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Aprende de los mejores <span className="text-primary">expertos</span>
              </h1>

              <p className="mt-6 text-lg text-muted-foreground max-w-lg">
                La plataforma de cursos online líder en Chile. Desarrolla nuevas habilidades con contenido de alta
                calidad creado por profesionales.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link to="/courses">
                    Explorar Cursos
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                <Button size="lg" variant="outline" onClick={() => goToPortal(STUDENT_PORTAL)}>
                  Iniciar como estudiante
                </Button>

                <Button size="lg" variant="outline" onClick={() => goToPortal(CREATOR_PORTAL)}>
                  Iniciar como creador
                </Button>
              </div>

              {/* Link extra para quien aún no tiene cuenta creador */}
              <div className="mt-4">
                <Link
                  className="text-sm text-primary underline"
                  to={`/signup?role=creator&next=${encodeURIComponent(CREATOR_PORTAL)}`}
                >
                  ¿No tienes cuenta? Crear cuenta como creador
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-8">
                <div>
                  <p className="text-3xl font-bold text-primary">100+</p>
                  <p className="text-sm text-muted-foreground">Cursos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">5K+</p>
                  <p className="text-sm text-muted-foreground">Estudiantes</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">50+</p>
                  <p className="text-sm text-muted-foreground">Creadores</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative bg-card border border-border rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Certificación incluida</h3>
                    <p className="text-sm text-muted-foreground">Al completar cada curso</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-success" />
                    </div>
                    <span className="text-sm">Contenido actualizado constantemente</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <Star className="h-5 w-5 text-warning" />
                    </div>
                    <span className="text-sm">Acceso de por vida a los cursos</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm">Comunidad de estudiantes activa</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories && categories.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Explora por categoría</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category: any) => (
                <Link
                  key={category.id}
                  to={`/courses?category=${category.slug}`}
                  className="bg-card border border-border rounded-lg p-6 text-center hover:shadow-lg hover:border-primary/50 transition-all"
                >
                  <BookOpen className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">{category.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Courses */}
      {featuredCourses && featuredCourses.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">Cursos destacados</h2>

              <Button variant="ghost" asChild>
                <Link to="/courses">
                  Ver todos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course: any) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  slug={course.slug}
                  title={course.title}
                  description={course.description}
                  coverImageUrl={course.cover_image_url}
                  priceCLP={course.price_clp}
                  level={course.level}
                  durationMinutes={course.duration_minutes_est}
                  creatorName={(course.profiles as any)?.name}
                  creatorSlug={(course.profiles as any)?.creator_slug}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">¿Tienes conocimiento para compartir?</h2>

          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Únete como creador y comparte tu experiencia con miles de estudiantes. Crea cursos, genera ingresos y haz
            crecer tu marca personal.
          </p>

          <Button size="lg" variant="secondary" onClick={() => goToPortal(CREATOR_PORTAL)}>
            Iniciar como creador
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </>
  );
}
