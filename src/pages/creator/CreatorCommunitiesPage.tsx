import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Settings, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default function CreatorCommunitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accessMode, setAccessMode] = useState<'invite' | 'paid'>('invite');
  const [price, setPrice] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const { data: communities, isLoading } = useQuery({
    queryKey: ['creator-communities', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    setSubmitting(true);
    const baseSlug = slugify(name);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from('communities')
      .insert({
        creator_id: user.id,
        name: name.trim(),
        slug,
        description: description.trim() || null,
        access_mode: accessMode,
        price_clp: accessMode === 'paid' ? parseInt(price || '0', 10) : 0,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error('No se pudo crear la comunidad: ' + error.message);
      return;
    }
    // Add creator as owner member
    await supabase.from('community_members').insert({
      community_id: data.id,
      user_id: user.id,
      role: 'owner',
    });
    toast.success('Comunidad creada');
    setOpen(false);
    setName(''); setDescription(''); setPrice('0');
    qc.invalidateQueries({ queryKey: ['creator-communities'] });
    navigate(`/creator-app/communities/${data.id}/manage`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mis Comunidades</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crea espacios privados con foro y classroom para tus alumnos.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nueva comunidad</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear comunidad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cname">Nombre</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Club de Trading" />
              </div>
              <div>
                <Label htmlFor="cdesc">Descripción</Label>
                <Textarea id="cdesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿De qué se trata tu comunidad?" />
              </div>
              <div>
                <Label>Acceso</Label>
                <Select value={accessMode} onValueChange={(v) => setAccessMode(v as 'invite' | 'paid')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invite">Privada (por invitación)</SelectItem>
                    <SelectItem value="paid">De pago (próximamente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {accessMode === 'paid' && (
                <div>
                  <Label htmlFor="cprice">Precio mensual (CLP)</Label>
                  <Input id="cprice" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    La pasarela de pago se conectará más adelante.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={submitting || !name.trim()}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !communities?.length ? (
        <Card className="p-8 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Todavía no tienes comunidades. Crea la primera para empezar.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {communities.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg truncate">{c.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.access_mode === 'paid' ? `Pago · CLP $${c.price_clp.toLocaleString('es-CL')}` : 'Privada'}
                  </p>
                  {c.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/creator-app/communities/${c.id}/manage`}>
                    <Settings className="h-4 w-4 mr-2" />Administrar
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/c/${c.slug}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />Ver
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
