import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getSessionId } from '@/lib/utils';

export function usePageView(type: 'creator_profile' | 'course', refId: string | undefined) {
  const { user } = useAuth();

  useEffect(() => {
    if (!refId) return;

    const trackView = async () => {
      const sessionId = getSessionId();
      
      await supabase.from('page_views').insert({
        type,
        ref_id: refId,
        user_id: user?.id || null,
        session_id: sessionId,
      });
    };

    // Small delay to ensure page is actually viewed
    const timeout = setTimeout(trackView, 1000);
    
    return () => clearTimeout(timeout);
  }, [type, refId, user?.id]);
}
