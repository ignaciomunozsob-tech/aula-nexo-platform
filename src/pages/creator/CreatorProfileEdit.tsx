import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ExternalLink } from 'lucide-react';
import { generateSlug } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function CreatorProfileEdit() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [creatorSlug, setCreatorSlug] = useState(profile?.creator_slug || '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const slug = creatorSlug || generateSlug(name);
      const { error } = await supabase.from('profiles').update({ name, bio, creator_slug: slug }).eq('id', profile!.id);
      if (error) throw error;
    },
    onSuccess: () => { refreshProfile(); toast({ title: 'Perfil actualizado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil Público</h1>
      
      <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(); }} className="bg-card border rounded-lg p-6 space-y-4">
        <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
        <div><Label>URL pública (slug)</Label><Input value={creatorSlug} onChange={e => setCreatorSlug(e.target.value)} placeholder={generateSlug(name)} className="mt-1" /><p className="text-xs text-muted-foreground mt-1">Tu perfil: /creator/{creatorSlug || generateSlug(name)}</p></div>
        <div><Label>Bio</Label><Textarea value={bio} onChange={e => setBio(e.target.value)} className="mt-1" rows={4} /></div>
        
        <div className="flex gap-3">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Guardar
          </Button>
          {profile?.creator_slug && (
            <Button variant="outline" asChild>
              <Link to={`/creator/${profile.creator_slug}`} target="_blank"><ExternalLink className="h-4 w-4 mr-2" />Ver perfil</Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
