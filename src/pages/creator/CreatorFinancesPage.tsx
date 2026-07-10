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

      // Get community fee totals from orders
      const { data: orders } = await supabase
        .from("orders")
        .select("community_fee_clp, created_at, product_type")
        .eq("creator_id", user.id)
        .eq("status", "paid");
      const totalCommunityFee = (orders || []).reduce((acc: number, o: any) => acc + (o.community_fee_clp || 0), 0);

      // Pagos abandonados: pending (>30min) o failed
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: abandonedRaw } = await supabase
        .from("orders")
        .select("id, product_type, product_id, amount_clp, status, created_at, guest_email, guest_name, guest_phone, metadata")
        .eq("creator_id", user.id)
        .in("status", ["pending", "failed"])
        .or(`status.eq.failed,and(status.eq.pending,created_at.lt.${thirtyMinAgo})`)
        .order("created_at", { ascending: false })
        .limit(50);
      const abandoned = abandonedRaw || [];

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
        totalCommunityFee,
        abandoned,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
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

      {(data?.totalCommunityFee ?? 0) > 0 && (
        <Card className="mb-8 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Cargos por Comunidades de cursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">- {formatCLP(data!.totalCommunityFee)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Descuento aplicado a tu payout por cada venta de cursos con comunidad activa ($990 por venta).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sales by Course */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ventas por Curso
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {data?.courses && data.courses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
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
            </div>
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
        <CardContent className="px-0 sm:px-6">
          {data?.enrollments && data.enrollments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
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
                      <TableCell className="whitespace-nowrap">{formatDate(enrollment.purchased_at)}</TableCell>
                      <TableCell>{enrollment.profiles?.name || "Usuario"}</TableCell>
                      <TableCell>{enrollment.courseTitle}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Completado
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatCLP(enrollment.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay transacciones aún</p>
          )}
        </CardContent>
      </Card>

      {/* Pagos abandonados */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Pagos abandonados</CardTitle>
          <p className="text-sm text-muted-foreground">
            Personas que iniciaron el pago pero no lo completaron. Puedes contactarlas para cerrar la venta.
          </p>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {data?.abandoned && data.abandoned.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.abandoned.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(o.created_at)}</TableCell>
                      <TableCell>{o.guest_name || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{o.guest_email || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{o.guest_phone || "—"}</TableCell>
                      <TableCell className="capitalize">{o.product_type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={o.status === "failed" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>
                          {o.status === "failed" ? "Falló" : "Sin completar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatCLP(o.amount_clp || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay pagos abandonados</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
