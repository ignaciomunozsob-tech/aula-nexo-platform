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

  // Check if user has any enrollments (skip onboarding if they do)
  const { data: hasEnrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['user-enrollments-check', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count, error } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (error) return false;
      return (count || 0) > 0;
    },
    enabled: !!user,
  });

  if (loading || loadingProfile || loadingEnrollments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show onboarding only if not completed AND user has no enrollments
  // Users who bought a course without account should skip onboarding
  if (profile && !profile.onboarding_completed && !hasEnrollments) {
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
