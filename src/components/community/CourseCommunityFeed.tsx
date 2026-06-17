import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ThumbsUp, MessageCircle, Image as ImageIcon, X, Trash2, Loader2, Pin } from "lucide-react";
import { toast } from "sonner";

interface Props {
  courseId: string;
  /** True if current user is the course creator → enables mod actions inline */
  isCreator: boolean;
}

const BUCKET = "course-assets";

export default function CourseCommunityFeed({ courseId, isCreator }: Props) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["course-community-feed", courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_course_community_feed", { _course_id: courseId });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5MB");
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!body.trim() && !imageFile) return;
    setPosting(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const path = `community-images/${courseId}/${user!.id}-${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, imageFile, { upsert: false, contentType: imageFile.type });
        if (upErr) throw upErr;
        image_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const { error } = await (supabase as any).from("course_community_posts").insert({
        course_id: courseId,
        author_id: user!.id,
        body: body.trim(),
        image_url,
      });
      if (error) throw error;
      setBody("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["course-community-feed", courseId] });
    } catch (e: any) {
      toast.error("No se pudo publicar", { description: e.message });
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await (supabase as any).from("course_community_reactions")
          .delete().eq("post_id", postId).eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("course_community_reactions").insert({
          post_id: postId, course_id: courseId, user_id: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-community-feed", courseId] }),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await (supabase as any).from("course_community_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post eliminado");
      qc.invalidateQueries({ queryKey: ["course-community-feed", courseId] });
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ postId, pinned }: { postId: string; pinned: boolean }) => {
      const { error } = await (supabase as any).from("course_community_posts").update({ pinned: !pinned }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-community-feed", courseId] }),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback>{profile?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Comparte algo con la comunidad…"
              className="min-h-[80px] resize-none"
              maxLength={2000}
            />
            {imagePreview && (
              <div className="relative inline-block">
                <img src={imagePreview} alt="" className="max-h-40 rounded-md" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-1 right-1 bg-background rounded-full p-1 shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="h-4 w-4 mr-1" /> Foto
              </Button>
              <Button onClick={submit} disabled={posting || (!body.trim() && !imageFile)} size="sm">
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {isLoading && <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>}

      {posts.map((p: any) => (
        <PostCard
          key={p.id}
          post={p}
          courseId={courseId}
          isCreator={isCreator}
          opened={!!openReplies[p.id]}
          onToggleReplies={() => setOpenReplies((s) => ({ ...s, [p.id]: !s[p.id] }))}
          onLike={() => toggleLike.mutate({ postId: p.id, liked: p.my_liked })}
          onDelete={() => { if (confirm("¿Eliminar este post?")) deletePost.mutate(p.id); }}
          onPin={() => togglePin.mutate({ postId: p.id, pinned: p.pinned })}
        />
      ))}

      {!isLoading && posts.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Aún no hay publicaciones. Sé el primero en compartir algo.
        </Card>
      )}
    </div>
  );
}

function PostCard({ post, courseId, isCreator, opened, onToggleReplies, onLike, onDelete, onPin }: any) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const canDelete = isCreator || post.author_id === user?.id;

  const { data: replies = [] } = useQuery({
    queryKey: ["course-community-replies", post.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_course_community_replies", { _post_id: post.id });
      if (error) throw error;
      return data as any[];
    },
    enabled: opened,
  });

  const submitReply = async () => {
    if (!reply.trim()) return;
    const { error } = await (supabase as any).from("course_community_replies").insert({
      post_id: post.id, course_id: courseId, author_id: user!.id, body: reply.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setReply("");
    qc.invalidateQueries({ queryKey: ["course-community-replies", post.id] });
    qc.invalidateQueries({ queryKey: ["course-community-feed", courseId] });
  };

  const deleteReply = async (rid: string) => {
    const { error } = await (supabase as any).from("course_community_replies").delete().eq("id", rid);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["course-community-replies", post.id] });
    qc.invalidateQueries({ queryKey: ["course-community-feed", courseId] });
  };

  return (
    <Card className="p-4">
      {post.pinned && (
        <div className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
          <Pin className="h-3 w-3" /> Fijado
        </div>
      )}
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author_avatar || ""} />
          <AvatarFallback>{post.author_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{post.author_name || "Usuario"}</span>
            {post.is_creator && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Creador</span>
            )}
            <span className="text-xs text-muted-foreground">· {new Date(post.created_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          {post.body && <p className="mt-2 text-sm whitespace-pre-wrap break-words">{post.body}</p>}
          {post.image_url && (
            <img src={post.image_url} alt="" className="mt-2 max-h-96 rounded-md border" />
          )}
          <div className="flex items-center gap-1 mt-3">
            <Button variant="ghost" size="sm" onClick={onLike} className={post.my_liked ? "text-primary" : ""}>
              <ThumbsUp className="h-4 w-4 mr-1" /> {post.reactions_count || 0}
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleReplies}>
              <MessageCircle className="h-4 w-4 mr-1" /> {post.replies_count || 0} Responder
            </Button>
            {isCreator && (
              <Button variant="ghost" size="sm" onClick={onPin} title={post.pinned ? "Desfijar" : "Fijar"}>
                <Pin className={`h-4 w-4 ${post.pinned ? "text-primary" : ""}`} />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {opened && (
            <div className="mt-3 pl-3 border-l-2 border-border space-y-3">
              {replies.map((r: any) => (
                <div key={r.id} className="flex gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={r.author_avatar || ""} />
                    <AvatarFallback className="text-xs">{r.author_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="font-semibold">{r.author_name || "Usuario"}</span>
                        {r.is_creator && <span className="text-[9px] uppercase font-bold px-1.5 rounded bg-primary text-primary-foreground">Creador</span>}
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{r.body}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 ml-2">
                      <span>{new Date(r.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}</span>
                      {(isCreator || r.author_id === user?.id) && (
                        <button onClick={() => deleteReply(r.id)} className="hover:text-destructive">Eliminar</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Escribe una respuesta…"
                  className="min-h-[60px] resize-none text-sm"
                  maxLength={1000}
                />
                <Button size="sm" onClick={submitReply} disabled={!reply.trim()}>Enviar</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
