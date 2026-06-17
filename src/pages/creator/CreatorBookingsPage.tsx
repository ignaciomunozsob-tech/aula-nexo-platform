import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CreatorBookingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["creator-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_creator_session_bookings");
      if (error) throw error;
      return data || [];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` },
          body: JSON.stringify({ booking_id: id }),
        },
      );
      if (!res.ok) throw new Error((await res.json()).error || "cancel_failed");
    },
    onSuccess: () => { toast.success("Reserva cancelada"); qc.invalidateQueries({ queryKey: ["creator-bookings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const now = Date.now();
  const upcoming = (data || []).filter((b: any) => new Date(b.start_at).getTime() >= now && b.status === "confirmed");
  const past = (data || []).filter((b: any) => new Date(b.start_at).getTime() < now || b.status === "cancelled");

  const Row = ({ b }: { b: any }) => (
    <div className="flex items-center justify-between gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{b.session_title}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(b.start_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}
          {" · "}{b.attendee_name || b.attendee_email}
          {b.status === "cancelled" && <span className="text-destructive"> · Cancelada</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {b.meet_url && b.status === "confirmed" && (
          <Button asChild size="sm" variant="outline">
            <a href={b.meet_url} target="_blank" rel="noreferrer"><Video className="h-4 w-4 mr-1" /> Meet</a>
          </Button>
        )}
        {b.status === "confirmed" && new Date(b.start_at).getTime() >= now && (
          <Button size="sm" variant="ghost" onClick={() => confirm("¿Cancelar reserva?") && cancel.mutate(b.id)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Reservas 1:1</h1>
      {isLoading ? <Loader2 className="animate-spin" /> : (
        <>
          <Card>
            <CardHeader><CardTitle>Próximas ({upcoming.length})</CardTitle></CardHeader>
            <CardContent>
              {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Sin reservas próximas.</p> :
                upcoming.map((b: any) => <Row key={b.id} b={b} />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
            <CardContent>
              {past.length === 0 ? <p className="text-sm text-muted-foreground">Sin historial.</p> :
                past.slice(0, 50).map((b: any) => <Row key={b.id} b={b} />)}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
