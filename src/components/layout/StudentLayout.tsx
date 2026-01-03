import { Outlet, Navigate } from 'react-router-dom';
import { StudentSidebar } from './StudentSidebar';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export function StudentLayout() {
  const { user, loading } = useAuth();

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

  return (
    <div className="min-h-screen flex">
      <StudentSidebar />
      <main className="flex-1 bg-muted/30">
        <Outlet />
      </main>
    </div>
  );
}
