import { Outlet, Navigate } from 'react-router-dom';
import { StudentSidebar } from './StudentSidebar';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudentOnboarding } from '@/components/onboarding/StudentOnboarding';

export function StudentLayout() {
  const { user, loading } = useAuth();

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile-onboarding', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show onboarding if not completed
  if (profile && !profile.onboarding_completed) {
    return <StudentOnboarding />;
  }

  return (
    <div className="min-h-screen flex">
      <StudentSidebar />
      <main className="flex-1 bg-muted/30">
        <Outlet />
      </main>
    </div>
  );
}
