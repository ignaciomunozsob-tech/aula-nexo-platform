import { Outlet, Navigate } from 'react-router-dom';
import { CreatorSidebar } from './CreatorSidebar';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export function CreatorLayout() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only creators and admins can access
  if (profile && profile.role !== 'creator' && profile.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen flex">
      <CreatorSidebar />
      <main className="flex-1 bg-muted/30">
        <Outlet />
      </main>
    </div>
  );
}
