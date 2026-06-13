import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Edit, ExternalLink, Code, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CheckoutPagesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [embedFor, setEmbedFor] = useState<any | null>(null);

  const { data: pages, isLoading, refetch } = useQuery({
    queryKey: ['checkout-pages', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('checkout_pages').select('*').eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const creatorSlug = profile?.creator_slug;

  const publicUrl = (slug: string) =>
    `${window.location.origin}/#/p/${creatorSlug}/${slug}`;
  const embedUrl = (slug: string) =>
    `${window.location.origin}/#/embed/${creatorSlug}/${slug}`;
  const embedSnippet = (slug: string) => `<iframe src="${embedUrl(slug)}"
  style="width:100%;border:0;min-height:900px"
  id="novu-checkout"></iframe>
<script>
  window.addEventListener('message', function(e){
    if (e.data && e.data.type === 'novu:resize' && e.data.height) {
      document.getElementById('novu-checkout').style.height = e.data.height + 'px';
    }
  });
</script>`;

  const copy = (text: string, msg = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Páginas de pago</h1>
          <p className="text-muted-foreground text-sm">
            Personaliza la página de checkout antes de pasar a MercadoPago.
          </p>
        </div>
        <Button onClick={() => navigate('/creator-app/checkout-pages/new')}>
          <Plus className="h-4 w-4 mr-2" /> Nueva página
        </Button>
      </div>

      {!creatorSlug && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-sm">
            Configura primero tu <strong>URL de creador</strong> en{' '}
            <Link to="/creator-app/profile" className="underline">Mi Perfil Público</Link> para
            publicar páginas de pago.
          </p>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !pages?.length ? (
        <Card className="p-12 text-center text-muted-foreground">
          Aún no tienes páginas de pago. Crea una para empezar.
        </Card>
      ) : (
        <div className="grid gap-3">
          {pages.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <Badge variant={p.is_published ? 'default' : 'secondary'}>
                    {p.is_published ? 'Publicada' : 'Borrador'}
                  </Badge>
                  {p.bump_enabled && <Badge variant="outline">Order bump</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  /p/{creatorSlug}/{p.slug} · {p.product_type}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => navigate(`/creator-app/checkout-pages/${p.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-1" /> Editar
                </Button>
                {p.is_published && creatorSlug && (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <a href={publicUrl(p.slug)} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" /> Ver
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copy(publicUrl(p.slug), 'Link copiado')}>
                      <Copy className="h-4 w-4 mr-1" /> Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEmbedFor(p)}>
                      <Code className="h-4 w-4 mr-1" /> Embed
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!embedFor} onOpenChange={(v) => !v && setEmbedFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Incrustar en tu landing</DialogTitle>
          </DialogHeader>
          {embedFor && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copia este snippet y pégalo en tu sitio web. El checkout se mostrará dentro de tu página.
              </p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                {embedSnippet(embedFor.slug)}
              </pre>
              <Button onClick={() => copy(embedSnippet(embedFor.slug), 'Snippet copiado')}>
                <Copy className="h-4 w-4 mr-2" /> Copiar snippet
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
