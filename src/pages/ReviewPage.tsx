import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Star, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function Stars({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return <div className="flex gap-1" role="radiogroup" aria-label="Puntuación">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" onClick={() => onChange?.(star)} aria-label={`${star} de 5 estrellas`} className="transition-transform hover:scale-110">
        <Star className={`h-8 w-8 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
      </button>
    ))}
  </div>;
}

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: request, isLoading } = useQuery({
    queryKey: ['review-request', token],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_review_request', { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!token,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Enlace inválido');
      const { error } = await (supabase as any).rpc('submit_review_by_token', {
        _token: token,
        _rating: rating,
        _comment: comment.trim() || null,
        _is_anonymous: anonymous,
        _name: anonymous ? null : (name.trim() || null),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: 'Evaluación enviada', description: 'Gracias por compartir tu experiencia.' });
    },
    onError: (error: Error) => toast({ title: 'No pudimos enviar tu evaluación', description: error.message, variant: 'destructive' }),
  });

  if (isLoading) return <main className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  if (!request) return <main className="min-h-screen flex items-center justify-center p-6"><Card className="w-full max-w-lg"><CardContent className="py-12 text-center"><h1 className="text-2xl font-bold">Enlace no disponible</h1><p className="text-muted-foreground mt-2">Este enlace de evaluación no existe o ya no está disponible.</p></CardContent></Card></main>;
  if (request.submitted || submitted) return <main className="min-h-screen flex items-center justify-center p-6"><Card className="w-full max-w-lg"><CardContent className="py-12 text-center"><CheckCircle2 className="h-12 w-12 text-primary mx-auto" /><h1 className="text-2xl font-bold mt-4">Evaluación enviada</h1><p className="text-muted-foreground mt-2">Gracias por compartir tu experiencia.</p></CardContent></Card></main>;

  return <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4 sm:p-6">
    <Card className="w-full max-w-xl">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center"><Star className="h-6 w-6 fill-primary text-primary" /></div>
        <CardTitle className="text-2xl">¿Qué te pareció el {request.product_type === 'ebook' ? 'e-book' : request.product_type}?</CardTitle>
        <p className="text-muted-foreground">Deja tu evaluación para que otras personas conozcan sobre el servicio de {request.creator_name}.</p>
        <p className="font-medium">{request.product_title}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2"><Label>Tu puntuación</Label><Stars value={rating} onChange={setRating} /></div>
        <div className="space-y-2"><Label htmlFor="review-name">Tu nombre (opcional)</Label><Input id="review-name" value={name} onChange={(event) => setName(event.target.value.slice(0, 100))} placeholder="¿Cómo te gustaría aparecer?" disabled={anonymous} /></div>
        <div className="flex items-center gap-2"><Checkbox id="anonymous" checked={anonymous} onCheckedChange={(checked) => setAnonymous(checked === true)} /><Label htmlFor="anonymous">Publicar como evaluación anónima</Label></div>
        <div className="space-y-2"><Label htmlFor="review-comment">Cuéntanos tu experiencia (opcional)</Label><Textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value.slice(0, 1000))} rows={5} placeholder="Escribe tu comentario..." /></div>
        <Button className="w-full" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>{submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enviar evaluación</Button>
        <p className="text-center text-xs text-muted-foreground">Comprador verificado por NOVU</p>
      </CardContent>
    </Card>
  </main>;
}
