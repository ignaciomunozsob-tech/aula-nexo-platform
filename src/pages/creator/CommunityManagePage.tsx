import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Check, X, Loader2, Trash2, ExternalLink, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function CommunityManagePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (community) {
      setName(community.name);
      setDescription(community.description ?? '');
    }
  }, [community]);

  const { data: requests } = useQuery({
    queryKey: ['community-requests', id],
    queryFn: async () => {
      const { data: reqs, error } = await supabase
        .from('community_join_requests')
        .select('*')
        .eq('community_id', id!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!reqs?.length) return [];
      const userIds = reqs.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('id, name, avatar_url').in('id', userIds);
      return reqs.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.id === r.user_id),
      }));
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ['community-members', id],
    queryFn: async () => {
      const { data: mems, error } = await supabase
        .from('community_members').select('*')
        .eq('community_id', id!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!mems?.length) return [];
      const userIds = mems.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('id, name, avatar_url').in('id', userIds);
      return mems.map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.id === m.user_id),
      }));
    },
    enabled: !!id,
  });

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from('communities')
      .update({ name: name.trim(), description: description.trim() || null })
      .eq('id', id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Cambios guardados');
    qc.invalidateQueries({ queryKey: ['community', id] });
  };

  const approveRequest = async (reqId: string, userId: string) => {
    const { error: insErr } = await supabase
      .from('community_members')
      .insert({ community_id: id!, user_id: userId, role: 'member' });
    if (insErr && !insErr.message.includes('duplicate')) return toast.error(insErr.message);
    await supabase.from('community_join_requests').update({ status: 'approved' }).eq('id', reqId);
    toast.success('Miembro aprobado');
    qc.invalidateQueries({ queryKey: ['community-requests', id] });
    qc.invalidateQueries({ queryKey: ['community-members', id] });
  };

  const rejectRequest = async (reqId: string) => {
    await supabase.from('community_join_requests').update({ status: 'rejected' }).eq('id', reqId);
    toast.success('Solicitud rechazada');
    qc.invalidateQueries({ queryKey: ['community-requests', id] });
  };

  const removeMember = async (memberId: string, isOwner: boolean) => {
    if (isOwner) return toast.error('No puedes eliminar al dueño');
    if (!confirm('¿Eliminar este miembro?')) return;
    await supabase.from('community_members').delete().eq('id', memberId);
    qc.invalidateQueries({ queryKey: ['community-members', id] });
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar la comunidad de forma permanente?')) return;
    const { error } = await supabase.from('communities').delete().eq('id', id!);
    if (error) return toast.error(error.message);
    toast.success('Comunidad eliminada');
    navigate('/creator-app/communities');
  };

  if (isLoading || !community) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (community.creator_id !== user?.id) {
    return <div className="p-8">No tienes acceso a esta comunidad.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/creator-app/communities"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link>
      </Button>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold">{community.name}</h1>
        <Button variant="outline" asChild>
          <Link to={`/c/${community.slug}`}><ExternalLink className="h-4 w-4 mr-2" />Ver comunidad</Link>
        </Button>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Ajustes</TabsTrigger>
          <TabsTrigger value="requests">
            Solicitudes {requests?.length ? `(${requests.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="members">Miembros</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
            <div className="text-xs text-muted-foreground">
              URL pública: <code>/c/{community.slug}</code>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />Eliminar comunidad
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar cambios
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {!requests?.length ? (
            <Card className="p-8 text-center text-muted-foreground">No hay solicitudes pendientes.</Card>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <Card key={r.id} className="p-4 flex items-center gap-3 flex-wrap">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={r.profile?.avatar_url ?? ''} />
                    <AvatarFallback>{r.profile?.name?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.profile?.name ?? 'Usuario'}</p>
                    {r.message && <p className="text-sm text-muted-foreground line-clamp-2">{r.message}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveRequest(r.id, r.user_id)}>
                      <Check className="h-4 w-4 mr-1" />Aprobar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectRequest(r.id)}>
                      <X className="h-4 w-4 mr-1" />Rechazar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          {!members?.length ? (
            <Card className="p-8 text-center text-muted-foreground">Aún no hay miembros.</Card>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <Card key={m.id} className="p-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.profile?.avatar_url ?? ''} />
                    <AvatarFallback>{m.profile?.name?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.profile?.name ?? 'Usuario'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                  </div>
                  {m.role !== 'owner' && (
                    <Button size="icon" variant="ghost" onClick={() => removeMember(m.id, m.role === 'owner')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
