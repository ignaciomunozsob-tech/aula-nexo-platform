import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type PlanType = 'gratis' | 'creador' | 'pro';

export interface PlanLimits {
  plan: PlanType;
  comision: number;
  maxCourses: number | null; // null = unlimited
  allowDirectVideo: boolean;
  maxFileMB: number;
  planLabel: string;
}

const LIMITS: Record<PlanType, Omit<PlanLimits, 'plan' | 'comision' | 'planLabel'>> = {
  gratis:  { maxCourses: 2,    allowDirectVideo: false, maxFileMB: 10  },
  creador: { maxCourses: null, allowDirectVideo: true,  maxFileMB: 500 },
  pro:     { maxCourses: null, allowDirectVideo: true,  maxFileMB: 2048 },
};

const LABELS: Record<PlanType, string> = {
  gratis: 'Plan Gratis',
  creador: 'Plan Creador',
  pro: 'Plan Pro',
};

export function useMyPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-plan', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<PlanLimits> => {
      const { data, error } = await supabase.rpc('get_my_plan');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const plan = ((row?.plan as string) || 'gratis') as PlanType;
      const comision = (row?.comision as number) ?? 10;
      return {
        plan,
        comision,
        planLabel: LABELS[plan] ?? plan,
        ...LIMITS[plan] ?? LIMITS.gratis,
      };
    },
  });
}
