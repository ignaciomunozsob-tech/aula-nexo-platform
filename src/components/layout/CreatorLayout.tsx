import { Outlet, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CreatorSidebar } from './CreatorSidebar';
import MobileTopbar from './MobileTopbar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function CreatorLayout() {
  const { user, profile, loading } = useAuth();
  const [twoFAState, setTwoFAState] = useState<'checking' | 'ok' | 'required'>('checking');

  useEffect(() => {
    let cancelled = false;
    if (!user || !profile) return;
    if (profile.role !== 'creator' && profile.role !== 'admin') return;
    // Admins don't need 2FA
    if (profile.role === 'admin') {
      setTwoFAState('ok');
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc('is_creator_2fa_valid');
      if (cancelled) return;
      if (error) {
        console.error('[2FA] check failed', error);
        setTwoFAState('required');
        return;
      }
      setTwoFAState(data ? 'ok' : 'required');
    })();
    return () => { cancelled = true; };
  }, [user, profile]);

  if (loading || (user && profile && (profile.role === 'creator') && twoFAState === 'checking')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.role !== 'creator' && profile.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  if (profile?.role === 'creator' && twoFAState === 'required') {
    return <Navigate to="/verify-2fa" replace state={{ userId: user.id, email: user.email, name: profile.name }} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex">
        <CreatorSidebar />
      </div>
      <MobileTopbar label="Creador">
        <CreatorSidebar />
      </MobileTopbar>
      <main className="flex-1 bg-muted/30 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
