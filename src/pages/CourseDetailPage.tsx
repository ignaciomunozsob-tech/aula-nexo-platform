import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { sanitizeHtml } from "@/lib/sanitize";
import { SEO } from "@/components/SEO";
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
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";
import { GuestCheckoutDialog } from "@/components/checkout/GuestCheckoutDialog";
import { initPixel, trackEventFor } from "@/lib/metaPixel";


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
  const params = useParams();
  const slug = params.courseSlug || params.slug;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showFreeEnrollDialog, setShowFreeEnrollDialog] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrollEmail, setEnrollEmail] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["course-public", slug],
    staleTime: 30_000,
    queryFn: async () => {
      if (!slug) throw new Error("Missing slug");

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = supabase
        .from("courses")
        .select(
          `
          id, slug, title, description, cover_image_url, price_clp, level, format,
          duration_minutes_est, status, category_id, creator_id, is_novu_official,
          instructor_name, instructor_bio, instructor_avatar_url,
          categories:category_id ( name, slug )
        `
        );
      const { data: course, error: courseError } = await (isUuid
        ? query.eq("id", slug).single()
        : query.eq("slug", slug).single());

      if (courseError) throw courseError;

      // Run creator hydration + modules in parallel
      const [creatorsRes, modulesRes] = await Promise.all([
        course.creator_id
          ? supabase.rpc('get_public_creators_by_ids', { _ids: [course.creator_id] })
          : Promise.resolve({ data: null } as any),
        supabase
          .from("course_modules")
          .select("id,title,order_index, lessons(id,title,type,order_index)")
          .eq("course_id", course.id)
          .order("order_index"),
      ]);

      if (modulesRes.error) throw modulesRes.error;

      const creators = creatorsRes?.data as any[] | null;
      (course as any).profiles = (creators && creators.length > 0) ? creators[0] : null;

      const normalized = (modulesRes.data || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      }));

      return { course, modules: normalized };
    },
    enabled: !!slug,
  });

  const course: any = data?.course;
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
        return { userId: user.id, isNewUser: false };
      }
      
      // For anonymous users, create account and send password reset link
      // Generate a secure random password (user will set their own via reset link)
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const tempPassword = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('') + "Aa1!";
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: enrollEmail,
        password: tempPassword,
        options: {
          data: { 
            name: enrollName,
          },
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
      
      // Mark onboarding as completed since they already have a course
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", authData.user.id);
      
      // Send welcome email with link to set password (no plain-text password)
      try {
        await supabase.functions.invoke("send-welcome-email", {
          body: {
            email: enrollEmail,
            name: enrollName,
            courseName: course.title,
          },
        });
      } catch (emailErr) {
        console.error("Error sending welcome email:", emailErr);
      }
      
      // Sign out so user can set password via forgot password flow
      await supabase.auth.signOut();
      
      return { userId: authData.user.id, isNewUser: true };
    },
    onSuccess: (data) => {
      setShowFreeEnrollDialog(false);
      
      if (data.isNewUser) {
        toast({ 
          title: "¡Inscripción exitosa! 🎉", 
          description: "Te hemos enviado un email con instrucciones para acceder a tu curso." 
        });
        navigate("/login");
      } else {
        toast({ title: "¡Inscripción exitosa! 🎉", description: "Ya puedes acceder al curso." });
        navigate(`/app/course/${course?.id}`);
      }
    },
    onError: (err: any) => {
      toast({
        title: "Error al inscribirse",
        description: err?.message || "Intenta nuevamente",
        variant: "destructive",
      });
    },
  });

  const { startCheckout, loading: checkoutLoading, guestDialogOpen, setGuestDialogOpen, submitGuestData } = useMercadoPagoCheckout();

  const [creatorPixelId, setCreatorPixelId] = useState<string | null>(null);

  // Fetch creator's pixel via secure RPC
  useEffect(() => {
    const cid = (course as any)?.creator_id;
    if (!cid) return;
    supabase.rpc('get_creator_pixel_id_by_id', { _creator_id: cid }).then(({ data }) => {
      setCreatorPixelId((data as string | null) ?? null);
    });
  }, [(course as any)?.creator_id]);

  // Fire ViewContent once per (course, pixel) pair — avoid duplicate events
  const viewContentFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!course || !creatorPixelId) return;
    const key = `${course.id}:${creatorPixelId}`;
    if (viewContentFiredRef.current === key) return;
    viewContentFiredRef.current = key;
    initPixel(creatorPixelId);
    trackEventFor(creatorPixelId, 'ViewContent', {
      content_type: 'product',
      content_category: 'course',
      content_ids: [course.id],
      content_name: course.title,
      value: course.price_clp ?? 0,
      currency: 'CLP',
    });
  }, [course?.id, creatorPixelId]);

  const handleEnrollClick = () => {
    if (existingEnrollment?.status === "active") {
      navigate(`/app/course/${course?.id}`);
      return;
    }

    if (isFree) {
      if (user) {
        freeEnrollMutation.mutate();
      } else {
        setShowFreeEnrollDialog(true);
      }
    } else {
      // Paid course: works for both logged-in and guest (the hook opens a dialog if no session)
      startCheckout('course', course!.id, {
        value: course!.price_clp ?? 0,
        creatorPixelId,
        contentName: course!.title,
      });
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
      <SEO
        title={`${course.title} — NOVU`}
        description={(course.description || '').replace(/<[^>]+>/g, '').slice(0, 155) || `Curso ${course.title} en NOVU.`}
        path={`/course/${course.id}`}
        type="product"
        image={course.cover_image_url || undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: course.title,
          description: (course.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
          provider: { '@type': 'Organization', name: 'NOVU', url: 'https://soynovu.cl/' },
          ...(course.instructor_name ? { instructor: { '@type': 'Person', name: course.instructor_name } } : {}),
          ...(course.cover_image_url ? { image: course.cover_image_url } : {}),
          ...(course.price_clp != null ? {
            offers: { '@type': 'Offer', price: course.price_clp, priceCurrency: 'CLP', availability: 'https://schema.org/InStock' }
          } : {}),
        }}
      />
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
                {(course as any).is_novu_official && (
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Shield className="h-3.5 w-3.5" />
                    NOVU Oficial
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                {course.title}
              </h1>

              {course.description ? (
                <div 
                  className="text-muted-foreground mt-3 max-w-2xl text-lg prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.description) }}
                />
              ) : (
                <p className="text-muted-foreground mt-3 max-w-2xl text-lg">Sin descripción.</p>
              )}

              <div className="mt-4 text-sm text-muted-foreground">
                {(course as any).is_novu_official && (course as any).instructor_name ? (
                  <span>
                    Dictado por{' '}
                    <span className="text-foreground font-medium">
                      {(course as any).instructor_name}
                    </span>
                    {' · '}
                    <span className="text-primary font-medium">Curso oficial NOVU</span>
                  </span>
                ) : (
                  <>
                    Creado por{' '}
                    {course.profiles?.creator_slug ? (
                      <Link
                        className="text-primary hover:underline font-medium"
                        to={`/creator/${course.profiles.creator_slug}`}
                      >
                        {course.profiles?.name || 'Creador'}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium">
                        {course.profiles?.name || 'Creador'}
                      </span>
                    )}
                  </>
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
                  disabled={freeEnrollMutation.isPending || checkoutLoading}
                >
                  {(freeEnrollMutation.isPending || checkoutLoading) ? (
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

            {/* SOBRE EL INSTRUCTOR / CREADOR */}
            {(() => {
              const isNovu = (course as any).is_novu_official;
              const name = isNovu
                ? (course as any).instructor_name || course.profiles?.name
                : course.profiles?.name;
              const bio = isNovu
                ? (course as any).instructor_bio
                : (course.profiles as any)?.bio;
              const avatar = isNovu
                ? (course as any).instructor_avatar_url
                : (course.profiles as any)?.avatar_url;
              const slug = !isNovu ? course.profiles?.creator_slug : null;

              if (!name && !bio) return null;

              return (
                <div>
                  <h2 className="text-xl font-bold mb-4">
                    {isNovu ? "Sobre el instructor" : "Sobre el creador"}
                  </h2>
                  <div className="bg-card border rounded-xl p-5 flex gap-4">
                    <div className="shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name || "Instructor"}
                          className="h-16 w-16 rounded-full object-cover border"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                          {(name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {slug ? (
                          <Link
                            to={`/creator/${slug}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-foreground">{name}</span>
                        )}
                        {course.categories?.name && (
                          <Badge variant="secondary" className="text-xs">
                            {course.categories.name}
                          </Badge>
                        )}
                        {isNovu && (
                          <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
                            <Shield className="h-3 w-3" />
                            Instructor oficial NOVU
                          </Badge>
                        )}
                      </div>
                      {bio ? (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">
                          {bio}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {isNovu
                            ? "Instructor del programa oficial de NOVU."
                            : "Este creador aún no ha agregado una descripción."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

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
      <GuestCheckoutDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        onSubmit={submitGuestData}
        loading={checkoutLoading}
      />
    </>
  );
}
