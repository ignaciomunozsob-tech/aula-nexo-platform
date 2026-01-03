import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function StudentSettings() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(profile?.name || '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('No profile');
      
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', profile.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      toast({
        title: 'Perfil actualizado',
        description: 'Tus cambios han sido guardados',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Administra tu perfil y preferencias</p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              value={profile?.id ? 'Cargando...' : ''}
              disabled
              className="mt-1 bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">El email no puede ser modificado</p>
          </div>

          <div>
            <Label>Rol</Label>
            <Input
              value={profile?.role === 'creator' ? 'Creador' : profile?.role === 'admin' ? 'Administrador' : 'Estudiante'}
              disabled
              className="mt-1 bg-muted capitalize"
            />
          </div>

          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
