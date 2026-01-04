import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, TrendingUp, Users, BookOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CreatorFinancesPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["creator-finances", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      // Get all courses by this creator
      const { data: courses, error: coursesErr } = await supabase
        .from("courses")
        .select("id, title, price_clp, slug")
        .eq("creator_id", user.id);

      if (coursesErr) throw coursesErr;

      const courseIds = courses?.map((c) => c.id) || [];

      // Get all enrollments for these courses
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("id, course_id, user_id, purchased_at, status, profiles:user_id(name)")
        .in("course_id", courseIds.length > 0 ? courseIds : ["no-courses"])
        .eq("status", "active")
        .order("purchased_at", { ascending: false });

      if (enrollErr) throw enrollErr;

      // Calculate totals
      const salesByMonth: Record<string, number> = {};
      let totalRevenue = 0;
      let totalSales = 0;

      const enrichedEnrollments = (enrollments || []).map((e: any) => {
        const course = courses?.find((c) => c.id === e.course_id);
        const amount = course?.price_clp || 0;
        totalRevenue += amount;
        totalSales++;

        const monthKey = new Date(e.purchased_at).toISOString().slice(0, 7);
        salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + amount;

        return {
          ...e,
          courseTitle: course?.title || "Curso desconocido",
          amount,
        };
      });

      // Get this week's revenue
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyRevenue = enrichedEnrollments
        .filter((e) => new Date(e.purchased_at) >= weekAgo)
        .reduce((acc, e) => acc + e.amount, 0);

      // Get this month's revenue
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthlyRevenue = enrichedEnrollments
        .filter((e) => new Date(e.purchased_at) >= monthStart)
        .reduce((acc, e) => acc + e.amount, 0);

      return {
        courses: courses || [],
        enrollments: enrichedEnrollments,
        totalRevenue,
        totalSales,
        weeklyRevenue,
        monthlyRevenue,
        salesByMonth,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Finanzas</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCLP(data?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Histórico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos del Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCLP(data?.monthlyRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Mes actual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos de la Semana
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCLP(data?.weeklyRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ventas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalSales || 0}</div>
            <p className="text-xs text-muted-foreground">Inscripciones activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Course */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ventas por Curso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.courses && data.courses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.courses.map((course: any) => {
                  const sales = data.enrollments.filter((e: any) => e.course_id === course.id).length;
                  const revenue = sales * (course.price_clp || 0);
                  return (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell className="text-right">{formatCLP(course.price_clp || 0)}</TableCell>
                      <TableCell className="text-right">{sales}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCLP(revenue)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No tienes cursos aún</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.enrollments && data.enrollments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.enrollments.slice(0, 20).map((enrollment: any) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>{formatDate(enrollment.purchased_at)}</TableCell>
                    <TableCell>{enrollment.profiles?.name || "Usuario"}</TableCell>
                    <TableCell>{enrollment.courseTitle}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Completado
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCLP(enrollment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay transacciones aún</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
