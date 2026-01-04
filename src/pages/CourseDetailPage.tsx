import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Clock,
  BarChart3,
  GraduationCap,
  CheckCircle2,
  Shield,
  PlayCircle,
  FileCheck,
  Video,
  Radio,
  Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

function formatLabel(format?: string | null) {
  if (format === "live") return { label: "En vivo", description: "Clases en tiempo real con el instructor", icon: Radio };
  if (format === "hybrid") return { label: "Híbrido", description: "Combina clases grabadas y en vivo", icon: Layers };
  return { label: "Grabado", description: "Aprende a tu propio ritmo", icon: Video };
}

export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showFreeEnrollDialog, setShowFreeEnrollDialog] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrollEmail, setEnrollEmail] = useState("");

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
          format,
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
  const isFree = (course?.price_clp || 0) === 0;

  const totalLessons = useMemo(() => {
    return modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
  }, [modules]);

  const courseFormat = formatLabel((course as any)?.format);

  // Check if user already enrolled
  const { data: existingEnrollment } = useQuery({
    queryKey: ["enrollment-check", course?.id, user?.id],
    queryFn: async () => {
      if (!user || !course) return null;
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user && !!course?.id,
  });

  // Free enrollment mutation
  const freeEnrollMutation = useMutation({
    mutationFn: async () => {
      if (!course) throw new Error("Curso no encontrado");
      
      // If user is logged in, use their ID
      if (user) {
        const { error } = await supabase.from("enrollments").insert({
          course_id: course.id,
          user_id: user.id,
          status: "active",
        });
        if (error) throw error;
        return { userId: user.id };
      }
      
      // For anonymous users, we need them to sign up first
      // Create a temporary signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: enrollEmail,
        password: crypto.randomUUID(), // Random password, they can reset later
        options: {
          data: { name: enrollName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error("Error al crear cuenta");
      
      // Create enrollment
      const { error } = await supabase.from("enrollments").insert({
        course_id: course.id,
        user_id: authData.user.id,
        status: "active",
      });
      if (error) throw error;
      
      return { userId: authData.user.id };
    },
    onSuccess: () => {
      toast({ title: "¡Inscripción exitosa! 🎉", description: "Ya puedes acceder al curso." });
      setShowFreeEnrollDialog(false);
      navigate(`/app/course/${course?.id}/play`);
    },
    onError: (err: any) => {
      toast({
        title: "Error al inscribirse",
        description: err?.message || "Intenta nuevamente",
        variant: "destructive",
      });
    },
  });

  const handleEnrollClick = () => {
    if (existingEnrollment?.status === "active") {
      navigate(`/app/course/${course?.id}/play`);
      return;
    }
    
    if (isFree) {
      if (user) {
        // If logged in, enroll directly
        freeEnrollMutation.mutate();
      } else {
        // Show dialog to collect info
        setShowFreeEnrollDialog(true);
      }
    } else {
      // TODO: Payment flow
      toast({ title: "Próximamente", description: "El sistema de pagos estará disponible pronto." });
    }
  };

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
          <p className="text-sm opacity-80 mt-1">
            {(error as any)?.message || "Intenta nuevamente."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* HERO SECTION */}
      <section className="bg-muted/30 border-b">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* LEFT HEADER */}
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {course.categories?.name && (
                  <Badge variant="secondary">{course.categories.name}</Badge>
                )}
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

              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                {course.title}
              </h1>

              {course.description ? (
                <div 
                  className="text-muted-foreground mt-3 max-w-2xl text-lg prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: course.description }}
                />
              ) : (
                <p className="text-muted-foreground mt-3 max-w-2xl text-lg">Sin descripción.</p>
              )}

              <div className="mt-4 text-sm text-muted-foreground">
                Creado por{" "}
                {course.profiles?.creator_slug ? (
                  <Link
                    className="text-primary hover:underline font-medium"
                    to={`/creator/${course.profiles.creator_slug}`}
                  >
                    {course.profiles?.name || "Creador"}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">
                    {course.profiles?.name || "Creador"}
                  </span>
                )}
              </div>

              {/* Format Badge Block */}
              <div className="mt-6 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <courseFormat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Curso en formato {courseFormat.label}</p>
                    <p className="text-xs text-muted-foreground">{courseFormat.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 bg-background border rounded-lg px-4 py-3">
                   <PlayCircle className="h-5 w-5 text-primary" />
                   <div>
                     <p className="text-sm font-medium">{totalLessons} lecciones</p>
                     <p className="text-xs text-muted-foreground">Contenido del curso</p>
                   </div>
                </div>
                <div className="flex items-center gap-3 bg-background border rounded-lg px-4 py-3">
                   <BarChart3 className="h-5 w-5 text-primary" />
                   <div>
                     <p className="text-sm font-medium">{levelLabel(course.level)}</p>
                     <p className="text-xs text-muted-foreground">Nivel del curso</p>
                   </div>
                </div>
                <div className="flex items-center gap-3 bg-background border rounded-lg px-4 py-3">
                   <GraduationCap className="h-5 w-5 text-primary" />
                   <div>
                     <p className="text-sm font-medium">Certificado</p>
                     <p className="text-xs text-muted-foreground">Al finalizar</p>
                   </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR (Desktop Sticky) */}
            <div className="lg:col-span-4 lg:row-span-2">
              <div className="bg-background border rounded-xl p-5 shadow-sm lg:sticky lg:top-24">
                {course.cover_image_url ? (
                  <div className="w-full aspect-video rounded-lg overflow-hidden border mb-4 bg-muted">
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-lg border mb-4 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    Sin portada
                  </div>
                )}

                <div className="text-3xl font-bold text-foreground mb-1">
                    {isFree ? (
                      <span className="text-green-600">Gratis</span>
                    ) : (
                      formatCLP(course.price_clp)
                    )}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {isFree ? "Acceso gratuito" : "Pago único · acceso de por vida"}
                </p>

                <Button 
                  className="w-full mb-4" 
                  size="lg"
                  onClick={handleEnrollClick}
                  disabled={freeEnrollMutation.isPending}
                >
                  {freeEnrollMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {existingEnrollment?.status === "active" 
                    ? "Ir al curso" 
                    : isFree 
                      ? "Inscribirse gratis" 
                      : "Comprar ahora"}
                </Button>

                <div className="space-y-3 text-sm">
                  <p className="font-semibold text-foreground">Este curso incluye:</p>
                  <ul className="space-y-2">
                     <li className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="h-4 w-4 text-primary" />
                        <span>Acceso de por vida</span>
                     </li>
                     <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Acceso en móviles</span>
                     </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-10">

            {/* CONTENIDO (ACORDEÓN) */}
            <div>
              <h2 className="text-xl font-bold mb-4">Contenido del curso</h2>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>{modules.length} módulos</span>
                <span>{totalLessons} lecciones</span>
              </div>

              <div className="border rounded-lg overflow-hidden">
                {modules.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    El creador está preparando el contenido de este curso.
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full bg-card">
                    {modules.map((m: any) => (
                      <AccordionItem key={m.id} value={m.id} className="border-b last:border-0">
                        <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline">
                          <div className="flex flex-col items-start text-left">
                            <span className="font-semibold text-sm">{m.title}</span>
                            <span className="text-xs text-muted-foreground font-normal">
                              {(m.lessons?.length || 0)} lecciones
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 py-0">
                          <div className="bg-muted/10 divide-y">
                            {(m.lessons || []).map((l: any) => (
                              <div
                                key={l.id}
                                className="flex items-center gap-3 px-4 py-3 pl-8 text-sm"
                              >
                                {l.type === "video" ? (
                                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-foreground/80">{l.title}</span>
                                {l.type === "text" && (
                                    <Badge variant="secondary" className="ml-auto text-[10px] h-5">Lectura</Badge>
                                )}
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
            
          </div>
        </div>
      </section>

      {/* Free Enrollment Dialog */}
      <Dialog open={showFreeEnrollDialog} onOpenChange={setShowFreeEnrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscribirse al curso</DialogTitle>
            <DialogDescription>
              Ingresa tus datos para acceder al curso de forma gratuita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="enroll-name">Nombre</Label>
              <Input
                id="enroll-name"
                value={enrollName}
                onChange={(e) => setEnrollName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enroll-email">Correo electrónico</Label>
              <Input
                id="enroll-email"
                type="email"
                value={enrollEmail}
                onChange={(e) => setEnrollEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFreeEnrollDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => freeEnrollMutation.mutate()}
              disabled={!enrollName || !enrollEmail || freeEnrollMutation.isPending}
            >
              {freeEnrollMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Inscribirse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
