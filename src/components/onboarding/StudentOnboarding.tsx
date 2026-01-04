import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { GraduationCap, Sparkles, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function StudentOnboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveInterestsMutation = useMutation({
    mutationFn: async (interests: string[]) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update({ 
          interests,
          onboarding_completed: true 
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refreshProfile();
      toast.success('¡Preferencias guardadas!');
      navigate('/app/marketplace');
    },
    onError: () => {
      toast.error('Error al guardar preferencias');
    },
  });

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleContinue = () => {
    saveInterestsMutation.mutate(selectedCategories);
  };

  const handleSkip = () => {
    saveInterestsMutation.mutate([]);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">¡Bienvenido a AulaNexo!</h1>
          <p className="text-muted-foreground text-lg">
            Cuéntanos qué te gustaría aprender para darte las mejores recomendaciones
          </p>
        </div>

        {/* Category Selection */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Selecciona tus intereses</h2>
          </div>
          
          {loadingCategories ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories?.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "relative flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                    selectedCategories.includes(category.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  )}
                >
                  {selectedCategories.includes(category.id) && (
                    <Check className="absolute left-2 h-4 w-4" />
                  )}
                  {category.name}
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4 text-center">
            {selectedCategories.length === 0 
              ? 'Puedes seleccionar una o más categorías'
              : `${selectedCategories.length} categoría${selectedCategories.length > 1 ? 's' : ''} seleccionada${selectedCategories.length > 1 ? 's' : ''}`
            }
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={saveInterestsMutation.isPending}
          >
            Omitir por ahora
          </Button>
          <Button
            onClick={handleContinue}
            disabled={saveInterestsMutation.isPending}
            className="gap-2"
          >
            {saveInterestsMutation.isPending ? 'Guardando...' : 'Continuar'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
