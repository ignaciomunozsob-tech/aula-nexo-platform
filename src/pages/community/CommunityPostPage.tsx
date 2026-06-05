import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Heart, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CommunityPostPage() {
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: community } = useQuery({
    queryKey: ['community-by-slug', slug],
    queryFn: async () => {
      const { data } = await supabase.from('communities').select('*').eq('slug', slug!).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: post, isLoading } = useQuery({
    queryKey: ['community-post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts').select('*').eq('id', postId!).single();
      if (error) throw error;
      const { data: profile } = await supabase
        .from('profiles').select('id, name, avatar_url').eq('id', data.author_id).maybeSingle();
      const { data: likes } = await supabase
        .from('community_post_likes').select('user_id').eq('post_id', data.id);
      return {
        ...data,
        author: profile,
        likeCount: likes?.length ?? 0,
        likedByMe: !!likes?.find((l) => l.user_id === user?.id),
      };
    },
    enabled: !!postId,
  });

  const { data: comments } = useQuery({
    queryKey: ['community-post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_post_comments')
        .select('*').eq('post_id', postId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data?.length) return [];
      const ids = [...new Set(data.map((c) => c.author_id))];
      const { data: profiles } = await supabase
        .from('profiles').select('id, name, avatar_url').in('id', ids);
      return data.map((c) => ({ ...c, author: profiles?.find((p) => p.id === c.author_id) }));
    },
    enabled: !!postId,
  });

  const addComment = async () => {
    if (!user || !post || !comment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('community_post_comments').insert({
      post_id: post.id,
      community_id: post.community_id,
      author_id: user.id,
      content: comment.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setComment('');
    qc.invalidateQueries({ queryKey: ['community-post-comments', postId] });
  };

  const toggleLike = async () => {
    if (!user || !post) return;
    if (post.likedByMe) {
      await supabase.from('community_post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('community_post_likes').insert({
        post_id: post.id, community_id: post.community_id, user_id: user.id,
      });
    }
    qc.invalidateQueries({ queryKey: ['community-post', postId] });
  };

  const deleteComment = async (id: string) => {
    if (!confirm('¿Eliminar comentario?')) return;
    await supabase.from('community_post_comments').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['community-post-comments', postId] });
  };

  if (isLoading || !post) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/c/${slug}`}><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link>
      </Button>
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author?.avatar_url ?? ''} />
            <AvatarFallback>{post.author?.name?.[0] ?? '?'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{post.author?.name ?? 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-3">{post.title}</h1>
        <p className="whitespace-pre-wrap text-foreground/90">{post.content}</p>
        <div className="mt-4">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-2 text-sm hover:text-primary ${post.likedByMe ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-current' : ''}`} />
            {post.likeCount}
          </button>
        </div>
      </Card>

      <div className="mt-6">
        <h2 className="font-semibold mb-3">Comentarios</h2>
        {user && community && (
          <Card className="p-4 mb-4">
            <Textarea
              placeholder="Escribe un comentario..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button onClick={addComment} disabled={!comment.trim() || submitting} size="sm">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Comentar
              </Button>
            </div>
          </Card>
        )}
        <div className="space-y-2">
          {comments?.map((c) => (
            <Card key={c.id} className="p-4 flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={c.author?.avatar_url ?? ''} />
                <AvatarFallback>{c.author?.name?.[0] ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{c.author?.name ?? 'Usuario'}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap mt-1">{c.content}</p>
              </div>
              {c.author_id === user?.id && (
                <Button size="icon" variant="ghost" onClick={() => deleteComment(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
