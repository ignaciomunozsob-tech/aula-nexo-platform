import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Clock, BarChart3, GraduationCap, CheckCircle2, Shield, PlayCircle } from "lucide-react";

function formatCLP(value: number | null | undefined) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function levelLabel(level?: string | null) {
  if (level === "advanced") return "Avanzado";
  if (level === "intermediate") return "Intermedio";
  return "Principiante";
}

export default function CourseDetailPage() {
  const { slug } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["course-public", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Missing slug");

      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select(
          `
          id,
          slug,
          title,
          description,
          cover_image_url,
          price_clp,
          level,
          duration_minutes_est,
          status,
          category_id,
          creator_id,
          profiles:creator_id (
            name,
            creator_slug
          ),
          categories:category_id (
            name,
            slug
          )
        `
        )
        .eq("slug", slug)
        .single();

      if (courseError) throw courseError;

      const { data: modules, error: modulesError } = await supabase
        .from("course_modules")
        .select("id,title,order_index, lessons(id,title,type,order_index)")
        .eq("course_id", course.id)
        .order("order_index");

      if (modulesError) throw modulesError;

      const normalized = (modules || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      }));

      return { course, modules: normalized };
    },
    enabled: !!slug,
  });

  const course = data?.course;
  const modules = data?.modules || [];

  const totalLessons = useMemo(() => {
    return modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
  }, [modules]);

  const whatYouLearn = useMemo(() => {
    const fallback = [
      "Crear una base sólida para mejorar tus resultados.",
      "Aplicar una metodología simple y repetible.",
      "Evitar errores típicos de principiante.",
      "Tener un plan claro para avanzar sin caos.",
    ];

    if (!course?.description) return fallback;

    const lines = course.description
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean)
      .slice(0, 4);

    return lines.length >= 2 ? lines : fallback;
  }, [course?.description]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <p className="font-semibold">No pudimos cargar el curso</p>
          <p className="text-sm opacity-80 mt-1">{(error as any)?.message || "Intenta nuevamente."}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* HERO */}
      <section className="bg-muted/30 border-b">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* LEFT */}
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {course.categories?.name && <Badge variant="secondary">{course.categories.name}</Badge>}
                <Badge variant="outline">{levelLabel(course.level)}</Badge>

                {course.duration_minutes_est ? (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {Math.max(1, Math.round(course.duration_minutes_est / 60))}h aprox.
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3.5 w-3.5" />A tu ritmo
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{course.title}</h1>

              <p className="text-muted-foreground mt-3 max-w-2xl">
                {course.description || "Descripción del curso próximamente."}
              </p>

              <div className="mt-4 text-sm text-muted-foreground">
                Creado por{" "}
                {course.profiles?.creator_slug ? (
                  <Link className="text-primary hover:underline" to={`/creator/${course.profiles.creator_slug}`}>
                    {course.profiles?.name || "Creador"}
                  </Link>
                ) : (
                  <span className="text-foreground">{course.profiles?.name || "Creador"}</span>
                )}
              </div>

              <div className="mt-6 grid sm:grid-cols-3 gap-3">
                <div className="bg-background border rounded-lg p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    Contenido
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {modules.length} módulos · {totalLessons} lecciones
                  </p>
                </div>

                <div className="bg-background border rounded-lg p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Nivel
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{levelLabel(course.level)}</p>
                </div>

                <div className="bg-background border rounded-lg p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Acceso
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Web · A tu ritmo</p>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-4">
              <div className="bg-background border rounded-xl p-5 shadow-sm lg:sticky lg:top-6">
                {course.cover_image_url ? (
                  <div className="w-full aspect-video rounded-lg overflow-hidden border mb-4 bg-muted">
                    <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-lg border mb-4 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    Sin portada
                  </div>
                )}

                <div className="text-2xl font-bold">{formatCLP(course.price_clp)}</div>
                <p className="text-sm text-muted-foreground mt-1">Pago único · acceso para siempre</p>

                <Button className="w-full mt-4" size="lg">
                  Comprar / Inscribirme
                </Button>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Acceso de por vida
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Aprende a tu ritmo
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    Plataforma segura (Supabase)
                  </div>
                </div>

                <Separator className="my-4" />
                <p className="text-xs text-muted-foreground">MVP: el checkout lo conectamos después.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold">Lo que aprenderás</h2>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {whatYouLearn.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold">Contenido del curso</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {modules.length} módulos · {totalLessons} lecciones
              </p>

              <div className="mt-4">
                {modules.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Aún no hay módulos. El creador está armando el contenido.
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {modules.map((m: any) => (
                      <AccordionItem key={m.id} value={m.id}>
                        <AccordionTrigger className="text-left">
                          <div className="flex flex-col">
                            <span className="font-semibold">{m.title}</span>
                            <span className="text-xs text-muted-foreground">{(m.lessons?.length || 0)} lecciones</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {(m.lessons || []).map((l: any) => (
                              <div
                                key={l.id}
                                className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <PlayCircle className="h-4 w-4 text-primary" />
                                  <span className="text-sm">{l.title}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {l.type === "text" ? "Lectura" : "Video"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold">Requisitos</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Solo necesitas internet y ganas de aprender.</li>
                <li>Ideal si estás comenzando o quieres ordenar tu proceso.</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-card border rounded-xl p-6 lg:sticky lg:top-6">
              <h3 className="font-bold">Resumen</h3>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Módulos</span>
                  <span className="text-foreground">{modules.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lecciones</span>
                  <span className="text-foreground">{totalLessons}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nivel</span>
                  <span className="text-foreground">{levelLabel(course.level)}</span>
                </div>
              </div>

              <Separator className="my-4" />
              <div className="text-2xl font-bold">{formatCLP(course.price_clp)}</div>
              <Button className="w-full mt-3" size="lg">
                Comprar / Inscribirme
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
