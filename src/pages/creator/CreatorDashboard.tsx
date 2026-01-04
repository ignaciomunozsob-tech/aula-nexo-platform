import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Loader2, Plus, BookOpen, Users, TrendingUp, CalendarDays } from "lucide-react";

type RangeKey = "7d" | "30d" | "90d" | "all";

function formatCLP(value: number | null | undefined) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function getRangeStartISO(range: RangeKey) {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

function isPaidStatus(status?: string | null) {
  const s = (status || "").toLowerCase();
  // MVP: si no hay status lo contamos
  if (!s) return true;
  if (s.includes("refund") || s.includes("reemb") || s.includes("cancel")) return false;
  return true;
}

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState<RangeKey>("30d");

  // 1) Cursos del creador (para obtener courseIds)
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ["creator-courses", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,status,price_clp,created_at")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const courseIds = useMemo(() => courses.map((c: any) => c.id), [courses]);

  // 2) Ventas/inscripciones (enrollments) asociadas a esos cursos
  const { data: enrollments = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ["creator-sales", user?.id, range, courseIds.join("|")],
    enabled: !!user?.id && courseIds.length > 0,
    queryFn: async () => {
      const startISO = getRangeStartISO(range);

      let q = supabase
        .from("enrollments")
        .select(
          `
          id,
          status,
          purchased_at,
          course_id,
          user_id,
          courses:course_id (
            id,
            title,
            price_clp
          ),
          profiles:user_id (
            name,
            avatar_url
          )
        `
        )
        .in("course_id", courseIds)
        .order("purchased_at", { ascending: false })
        .limit(200);

      if (startISO) q = q.gte("purchased_at", startISO);

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).filter((r: any) => isPaidStatus(r.status));
    },
  });

  // 3) Stats
  const uniqueStudents = useMemo(() => {
    const uniq = new Set(enrollments.map((e: any) => e.user_id));
    return uniq.size;
  }, [enrollments]);

  const stats = useMemo(() => {
    const revenue = enrollments.reduce((acc: number, r: any) => acc + Number(r?.courses?.price_clp || 0), 0);
    const sales = enrollments.length;
    const avg = sales > 0 ? Math.round(revenue / sales) : 0;

    const byCourse = new Map<string, { title: string; revenue: number; sales: number }>();
    for (const r of enrollments) {
      const cid = String(r.course_id);
      const title = r?.courses?.title || "Curso";
      const price = Number(r?.courses?.price_clp || 0);

      const prev = byCourse.get(cid) || { title, revenue: 0, sales: 0 };
      byCourse.set(cid, { title, revenue: prev.revenue + price, sales: prev.sales + 1 });
    }

    const top = Array.from(byCourse.values()).sort((a, b) => b.revenue - a.revenue)[0] || null;

    return { revenue, sales, avg, top };
  }, [enrollments]);

  const loading = isLoadingCourses || isLoadingSales;

  if (!user) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Debes iniciar sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Inicia sesión para ver tu dashboard de creador.</p>
            <Button className="mt-4" asChild>
              <Link to="/login">Ir a login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Creador</h1>
          <p className="text-sm text-muted-foreground">Vista rápida de cursos + ventas (MVP).</p>
        </div>

        <div className="flex gap-2">
          <Button asChild>
            <Link to="/creator-app/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo curso
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link to="/creator-app/courses">
              <BookOpen className="h-4 w-4 mr-2" />
              Mis cursos
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{courses.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total de cursos creados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{uniqueStudents}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Únicos en el rango</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.sales}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Inscripciones en el rango</p>
          </CardContent>
        </Card>
      </div>

      {/* Finanzas */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Finanzas</CardTitle>
            <p className="text-sm text-muted-foreground">Ingresos estimados: enrollments × precio del curso.</p>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 90 días</SelectItem>
                <SelectItem value="all">Todo el tiempo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando finanzas…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCLP(stats.revenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Estimado (MVP)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Ventas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.sales}</div>
                    <p className="text-xs text-muted-foreground mt-1">Inscripciones</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Ticket promedio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCLP(stats.avg)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Ingresos / ventas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Top curso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.top ? (
                      <>
                        <div className="font-semibold line-clamp-1">{stats.top.title}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCLP(stats.top.revenue)} · {stats.top.sales} ventas
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Ventas recientes</h3>
                  <p className="text-sm text-muted-foreground">Últimas inscripciones registradas.</p>
                </div>
                <Badge variant="outline">MVP</Badge>
              </div>

              {enrollments.length === 0 ? (
                <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                  Aún no tienes ventas en este rango.
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estudiante</TableHead>
                        <TableHead>Curso</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.slice(0, 12).map((r: any) => {
                        const name = r?.profiles?.name || "Estudiante";
                        const initials = name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((x: string) => x[0]?.toUpperCase())
                          .join("");

                        const status = (r?.status || "paid").toLowerCase();
                        const badgeVariant =
                          status.includes("refund") || status.includes("cancel") ? "destructive" : "secondary";

                        return (
                          <TableRow key={r.id}>
                            <TableCell className="whitespace-nowrap">{formatDate(r.purchased_at)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={r?.profiles?.avatar_url || ""} />
                                  <AvatarFallback>{initials || "E"}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[360px]">
                              <span className="text-sm line-clamp-1">{r?.courses?.title || "Curso"}</span>
                            </TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">
                              {formatCLP(r?.courses?.price_clp)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={badgeVariant as any}>{r?.status || "paid"}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Próximo paso: “payouts/retiros” y separar “saldo disponible” vs “en tránsito”.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
