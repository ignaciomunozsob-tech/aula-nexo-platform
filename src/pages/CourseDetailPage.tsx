import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Clock,
  BarChart3,
  GraduationCap,
  CheckCircle2,
  Shield,
  PlayCircle,
} from "lucide-react";

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

function cleanArray(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
}

/**
 * Sanitizado básico sin dependencias:
 * - elimina <script>, <style>, <iframe>, etc.
 * - elimina atributos on* (onclick, onerror...)
 * - permite href solo en <a> y lo fuerza a https/http/mailto
 *
 * Para producción: ideal usar DOMPurify, pero esto te salva el MVP.
 */
function sanitizeHtmlBasic(html: string) {
  if (!html) return "";

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Eliminar tags peligrosos completos
  const blocked = ["script", "style", "iframe", "object", "embed", "link", "meta"];
  blocked.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((n) => n.remove());
  });

  // Limpiar atributos peligrosos
  doc.querySelectorAll("*").forEach((el) => {
    // remove on*
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if (name === "style") el.removeAttribute(attr.name); // opcional: evita inyecciones por CSS
    });

    // links: solo href seguro
    if (el.tagName.toLowerCase() === "a") {
      const href = el.getAttribute("href") || "";
      const isSafe =
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:");
      if (!isSafe) el.removeAttribute("href");
      el.setAttribute("rel", "noopener noreferrer");
      el.setAttribute("target", "_blank");
    }
  });

  return doc.body.innerHTML;
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
          short_description,
          description,
          description_html,
          cover_image_url,
          price_clp,
          level,
          duration_minutes_est,
          status,
          category_id,
          creator_id,
          learn_bullets,
          requirements,
          includes,
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

  const learnBullets = useMemo(() => cleanArray(course?.learn_bullets), [course?.learn_bullets]);
  const requirements = useMemo(() => cleanArray(course?.requirements), [course?.requirements]);
  const includes = useMemo(() => cleanArray(course?.includes), [course?.includes]);

  const safeHtml = useMemo(() => {
    const html = String(course?.description_html || "");
    return sanitizeHtmlBasic(html);
  }, [course?.description_html]);

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
      {/* HERO */}
      <section className="bg-muted/30 border-b">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* LEFT */}
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

              {/* ✅ resumen corto */}
              <p className="text-muted-foreground mt-3 max-w-2xl">
                {course.short_description || "Descripción del curso próximamente."}
              </p>

              <div className="mt-4 text-sm text-muted-foreground">
                Creado por{" "}
                {course.profiles?.creator_slug ? (
                  <Link
                    className="text-primary hover:underline"
                    to={`/creator/${course.profiles.creator_slug}`}
                  >
                    {course.profiles?.name || "Creador"}
                  </Link>
                ) : (
                  <span className="text-foreground">
                    {course.profiles?.name || "Creador"}
                  </span>
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
                  <p className="text-sm text-muted-foreground mt-1">
                    {levelLabel(course.level)}
                  </p>
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

                <div className="text-2xl font-bold">{formatCLP(course.price_clp)}</div>
                <p className="text-sm text-muted-foreground mt-1">Pago único · acceso para siempre</p>

                <Button className="w-full mt-4" size="lg">
                  Comprar / Inscribirme
                </Button>

                <div className="mt-4 space-y-2 text-sm">
                  {(includes.length ? includes : ["Acceso de por vida", "Aprende a tu ritmo"]).map(
                    (it: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {it}
                      </div>
                    )
                  )}

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
            {/* ✅ Descripción larga (HTML) */}
            {safeHtml ? (
              <div className="bg-card border rounded-xl p-6">
                <h2 className="text-xl font-bold">Descripción</h2>
                <div
                  className="mt-4 text-sm text-muted-foreground space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: safeHtml }}
                />
              </div>
            ) : null}

            {/* ✅ Lo que aprenderás */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold">Lo que aprenderás</h2>

              {learnBullets.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-3">
                  El creador aún no agregó esta sección.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  {learnBullets.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contenido del curso */}
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
                            <span className="text-xs text-muted-foreground">
                              {(m.lessons?.length || 0)} lecciones
                            </span>
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

            {/* ✅ Requisitos */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold">Requisitos</h2>

              {requirements.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-3">
                  No hay requisitos.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {requirements.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* SIDE SUMMARY */}
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
