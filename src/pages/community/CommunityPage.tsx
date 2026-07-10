import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Heart, MessageCircle, Plus, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useMercadoPagoCheckout } from '@/hooks/useMercadoPagoCheckout';
import { GuestCheckoutDialog } from '@/components/checkout/GuestCheckoutDialog';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  const { data: community, isLoading: loadingCommunity } = useQuery({
    queryKey: ['community-by-slug', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities').select('*').eq('slug', slug!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const isOwner = community?.creator_id === user?.id;

  const { data: membership } = useQuery({
    queryKey: ['community-membership', community?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', community!.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!community?.id && !!user?.id,
  });

  const { data: existingRequest } = useQuery({
    queryKey: ['community-my-request', community?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_join_requests').select('*')
        .eq('community_id', community!.id).eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!community?.id && !!user?.id && !membership,
  });

  const canAccess = !!membership || isOwner;

  const { data: posts } = useQuery({
    queryKey: ['community-posts', community?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts').select('*')
        .eq('community_id', community!.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];
      const authorIds = [...new Set(data.map((p) => p.author_id))];
      const { data: profiles } = await supabase
        .from('profiles').select('id, name, avatar_url').in('id', authorIds);
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from('community_post_likes').select('post_id, user_id').in('post_id', data.map((p) => p.id)),
        supabase.from('community_post_comments').select('post_id').in('post_id', data.map((p) => p.id)),
      ]);
      return data.map((p) => ({
        ...p,
        author: profiles?.find((a) => a.id === p.author_id),
        likeCount: likes?.filter((l) => l.post_id === p.id).length ?? 0,
        likedByMe: !!likes?.find((l) => l.post_id === p.id && l.user_id === user?.id),
        commentCount: comments?.filter((c) => c.post_id === p.id).length ?? 0,
      }));
    },
    enabled: !!community?.id && canAccess,
  });

  const handleJoinRequest = async () => {
    if (!user || !community) return;
    const { error } = await supabase.from('community_join_requests').insert({
      community_id: community.id,
      user_id: user.id,
      message: requestMessage.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Solicitud enviada');
    qc.invalidateQueries({ queryKey: ['community-my-request'] });
  };

  const handleCreatePost = async () => {
    if (!user || !community || !postTitle.trim() || !postContent.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('community_posts').insert({
      community_id: community.id,
      author_id: user.id,
      title: postTitle.trim(),
      content: postContent.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Publicación creada');
    setNewPostOpen(false);
    setPostTitle(''); setPostContent('');
    qc.invalidateQueries({ queryKey: ['community-posts'] });
  };

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user || !community) return;
    if (liked) {
      await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('community_post_likes').insert({
        post_id: postId, community_id: community.id, user_id: user.id,
      });
    }
    qc.invalidateQueries({ queryKey: ['community-posts'] });
  };

  if (loadingCommunity) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!community) {
    return <div className="p-8 text-center">Comunidad no encontrada.</div>;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">{community.name}</h1>
        {community.description && <p className="text-muted-foreground mb-6">{community.description}</p>}
        <Button asChild><Link to="/login">Inicia sesión para unirte</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{community.name}</h1>
            {community.description && (
              <p className="text-muted-foreground text-sm mt-1">{community.description}</p>
            )}
          </div>
          {isOwner && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/creator-app/communities/${community.id}/manage`}>
                <Settings className="h-4 w-4 mr-2" />Administrar
              </Link>
            </Button>
          )}
        </div>
      </Card>

      {!canAccess ? (
        <Card className="p-6 text-center">
          {existingRequest?.status === 'pending' ? (
            <p className="text-muted-foreground">Tu solicitud está pendiente de aprobación.</p>
          ) : existingRequest?.status === 'rejected' ? (
            <p className="text-muted-foreground">Tu solicitud fue rechazada.</p>
          ) : (
            community.access_mode === 'paid' && community.price_clp > 0 ? (
              <PaidCommunityCTA communityId={community.id} priceClp={community.price_clp} />
            ) : (
              <>
                <p className="mb-4">Esta es una comunidad privada. Solicita acceso para participar.</p>
                <Textarea
                  placeholder="Mensaje opcional para el creador"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="mb-3"
                />
                <Button onClick={handleJoinRequest}>Solicitar acceso</Button>
              </>
            )
          )}
        </Card>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nueva publicación</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva publicación</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Título" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
                  <Textarea placeholder="¿Qué quieres compartir?" rows={6}
                    value={postContent} onChange={(e) => setPostContent(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewPostOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreatePost} disabled={submitting || !postTitle.trim() || !postContent.trim()}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Publicar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!posts?.length ? (
            <Card className="p-8 text-center text-muted-foreground">
              Sé el primero en publicar en esta comunidad.
            </Card>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <Card key={p.id} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={p.author?.avatar_url ?? ''} />
                      <AvatarFallback>{p.author?.name?.[0] ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{p.author?.name ?? 'Usuario'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                  <Link to={`/c/${community.slug}/p/${p.id}`}>
                    <h3 className="font-semibold text-lg mb-1 hover:text-primary">{p.title}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{p.content}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <button
                      onClick={() => toggleLike(p.id, p.likedByMe)}
                      className={`flex items-center gap-1 hover:text-primary transition-colors ${p.likedByMe ? 'text-primary' : ''}`}
                    >
                      <Heart className={`h-4 w-4 ${p.likedByMe ? 'fill-current' : ''}`} />
                      {p.likeCount}
                    </button>
                    <Link to={`/c/${community.slug}/p/${p.id}`} className="flex items-center gap-1 hover:text-primary">
                      <MessageCircle className="h-4 w-4" />
                      {p.commentCount}
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaidCommunityCTA({ communityId, priceClp }: { communityId: string; priceClp: number }) {
  const { startCheckout, loading, guestDialogOpen, setGuestDialogOpen, submitGuestData } = useMercadoPagoCheckout();
  return (
    <div>
      <p className="mb-2">Comunidad de pago.</p>
      <p className="text-3xl font-bold mb-4">
        CLP ${priceClp.toLocaleString('es-CL')}
      </p>
      <Button onClick={() => startCheckout('community', communityId)} disabled={loading} size="lg">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Comprar acceso
      </Button>
      <GuestCheckoutDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        onSubmit={submitGuestData}
        loading={loading}
      />
    </div>
  );
}

