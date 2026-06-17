import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Pin, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useMyPlan } from "@/hooks/useMyPlan";
import { LockedFeature } from "@/components/creator/LockedFeature";

interface Props {
  courseId: string;
  communityEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function CourseCommunityManager({ courseId, communityEnabled, onToggle }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: plan } = useMyPlan();
  const isPro = plan?.allowCommunityPerCourse;
  const [banTarget, setBanTarget] = useState<{ user_id: string; name?: string } | null>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["mod-feed", courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_course_community_feed", { _course_id: courseId });
      if (error) throw error;
      return data as any[];
    },
    enabled: communityEnabled,
  });

  const { data: bans = [] } = useQuery({
    queryKey: ["course-bans", courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_course_bans", { _course_id: courseId });
      if (error) throw error;
      return data as any[];
    },
    enabled: communityEnabled,
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("course_community_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Post eliminado"); qc.invalidateQueries({ queryKey: ["mod-feed", courseId] }); },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await (supabase as any).from("course_community_posts").update({ pinned: !pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mod-feed", courseId] }),
  });

  const banUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any).from("course_community_bans").insert({
        course_id: courseId, user_id: userId, banned_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alumno baneado");
      qc.invalidateQueries({ queryKey: ["mod-feed", courseId] });
      qc.invalidateQueries({ queryKey: ["course-bans", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unban = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any).rpc("unban_user_from_course", { _course_id: courseId, _user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acceso restaurado");
      qc.invalidateQueries({ queryKey: ["course-bans", courseId] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comunidad del curso</CardTitle>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <label className="flex items-center justify-between gap-4 p-4 border rounded-lg cursor-pointer">
              <div>
                <div className="font-medium">Activar comunidad</div>
                <p className="text-sm text-muted-foreground">$990 CLP adicionales se descuentan a tu payout en cada venta de este curso.</p>
              </div>
              <Switch checked={communityEnabled} onCheckedChange={onToggle} />
            </label>
          ) : (
            <LockedFeature requires="pro" featureName="Comunidad por curso">
              <div className="p-4 border rounded-lg">
                <div className="font-medium">Activar comunidad — $990 por cada venta de este curso</div>
                <p className="text-sm text-muted-foreground mt-1">Disponible en plan Pro.</p>
              </div>
            </LockedFeature>
          )}
        </CardContent>
      </Card>

      {communityEnabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Moderación de posts ({posts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay publicaciones.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Autor</TableHead>
                      <TableHead>Preview</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>👍</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.author_name || "Usuario"}
                          {p.is_creator && <span className="ml-1 text-[10px] text-primary">(Creador)</span>}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{p.body}</TableCell>
                        <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString("es-CL")}</TableCell>
                        <TableCell>{p.reactions_count}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => togglePin.mutate({ id: p.id, pinned: p.pinned })} title={p.pinned ? "Desfijar" : "Fijar"}>
                            <Pin className={`h-4 w-4 ${p.pinned ? "text-primary" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePost.mutate(p.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {!p.is_creator && (
                            <Button variant="ghost" size="icon" onClick={() => setBanTarget({ user_id: p.author_id, name: p.author_name })} className="text-destructive" title="Banear alumno">
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alumnos baneados ({bans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {bans.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ningún alumno baneado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alumno</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bans.map((b: any) => (
                      <TableRow key={b.user_id}>
                        <TableCell className="font-medium">{b.name || "Usuario"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.email}</TableCell>
                        <TableCell className="text-xs">{new Date(b.created_at).toLocaleDateString("es-CL")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => unban.mutate(b.user_id)}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Desbanear
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              El alumno {banTarget?.name ? `"${banTarget.name}"` : ""} perderá acceso al curso y a la comunidad. No se realizará reembolso de los $990.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (banTarget) banUser.mutate(banTarget.user_id); setBanTarget(null); }}
            >
              Confirmar ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
