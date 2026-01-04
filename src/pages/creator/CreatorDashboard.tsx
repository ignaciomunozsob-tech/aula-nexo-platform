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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  if (!s) return true;
  if (s.includes("refund") || s.includes("reemb") || s.includes("cancel")) return false;
  return true;
}

type SaleRow = {
  enrollment_id: string;
  purchased_at: string | null;
  status: string | null;
  course_id: string;
  course_title: string | null;
  price_clp: number | null;
  buyer_user_id: string;
  buyer_name: string | null;
  buyer_avatar_url: string | null;
};

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState<RangeKey>("30d");

  // Cursos del creador
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["creator-courses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,status,price_clp,created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Ventas - query enrollments + courses + profiles directly
  const { data: sales, isLoading: isLoadingSales } = useQuery({
    queryKey: ["creator-sales", user?.id, range],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get creator's course IDs
      const { data: creatorCourses, error: coursesError } = await supabase
        .from("courses")
        .select("id,title,price_clp")
        .eq("creator_id", user.id);

      if (coursesError) throw coursesError;
      if (!creatorCourses?.length) return [];

      const courseIds = creatorCourses.map(c => c.id);
      const courseMap = new Map(creatorCourses.map(c => [c.id, c]));

      // Then get enrollments for those courses
      const startISO = getRangeStartISO(range);
      let query = supabase
        .from("enrollments")
        .select(`
          id,
          purchased_at,
          status,
          course_id,
          user_id,
          profiles:user_id (
            name,
            avatar_url
          )
        `)
        .in("course_id", courseIds)
        .order("purchased_at", { ascending: false })
        .limit(200);

      if (startISO) query = query.gte("purchased_at", startISO);

      const { data: enrollments, error: enrollmentsError } = await query;
      if (enrollmentsError) throw enrollmentsError;

      // Map to SaleRow format
      const rows: SaleRow[] = (enrollments || [])
        .filter(e => isPaidStatus(e.status))
        .map(e => {
          const course = courseMap.get(e.course_id);
          return {
            enrollment_id: e.id,
            purchased_at: e.purchased_at,
            status: e.status,
            course_id: e.course_id,
            course_title: course?.title || null,
            price_clp: course?.price_clp || null,
            buyer_user_id: e.user_id,
            buyer_name: (e.profiles as any)?.name || null,
            buyer_avatar_url: (e.profiles as any)?.avatar_url || null,
          };
        });

      return rows;
    },
    enabled: !!user?.id,
  });

  const stats = useMemo(() => {
    const rows = sales || [];

    const revenue = rows.reduce((acc, r) => acc + Number(r.price_clp || 0), 0);
    const salesCount = rows.length;
    const avg = salesCount > 0 ? Math.round(revenue / salesCount) : 0;

    const uniqStudents = new Set(rows.map((r) => r.buyer_user_id)).size;

    const byCourse = new Map<string, { title: string; revenue: number; sales: number }>();
    for (const r of rows) {
      const cid = String(r.course_id);
      const title = r.course_title || "Curso";
      const price = Number(r.price_clp || 0);

      const prev = byCourse.get(cid) || { title, revenue: 0, sales: 0 };
      byCourse.set(cid, { title, revenue: prev.revenue + price, sales: prev.sales + 1 });
    }

    const top = Array.from(byCourse.values()).sort((a, b) => b.revenue - a.revenue)[0] || null;

    return { revenue, salesCount, avg, uniqStudents, top };
  }, [sales]);

  const loading = isLoadingCourses || isLoadingSales;

  if (!user) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Debes iniciar sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Inicia sesión para ver tu dashboard de creador.
            </p>
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
          <p className="text-sm text-muted-foreground">
            Cursos + ventas (MVP). Luego sumamos payouts/retiros cuando metas Webpay.
          </p>
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

      {/* Cards superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{courses?.length || 0}</span>
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
              <span className="text-2xl font-bold">{stats.uniqStudents}</span>
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
              <span className="text-2xl font-bold">{stats.salesCount}</span>
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
            <p className="text-sm text-muted-foreground">
              Ingresos estimados = ventas × precio del curso (enrollments).
            </p>
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
                    <div className="text-2xl font-bold">{stats.salesCount}</div>
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

              {(sales || []).length === 0 ? (
                <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                  Aún no tienes ventas en este rango. Cuando alguien compre, aquí verás el registro.
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
                      {(sales || []).slice(0, 12).map((r) => {
                        const name = r.buyer_name || "Estudiante";
                        const initials =
                          name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((x) => x[0]?.toUpperCase())
                            .join("") || "E";

                        const status = (r.status || "paid").toLowerCase();

                        return (
                          <TableRow key={r.enrollment_id}>
                            <TableCell className="whitespace-nowrap">{formatDate(r.purchased_at)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={r.buyer_avatar_url || ""} />
                                  <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[360px]">
                              <span className="text-sm line-clamp-1">{r.course_title || "Curso"}</span>
                            </TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">
                              {formatCLP(r.price_clp)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  status.includes("refund") || status.includes("cancel")
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {r.status || "paid"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Próximo paso: agregar "payouts/retiros" y separar "saldo disponible" vs "en tránsito".
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
