import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type PlanType = 'gratis' | 'creador' | 'pro';

export interface PlanLimits {
  plan: PlanType;
  comision: number;
  planLabel: string;
  // Limits
  maxCourses: number | null; // null = unlimited
  maxFileMB: number;
  maxManualStudents: number | null; // null = unlimited
  // Capability flags
  allowDirectVideo: boolean;
  allowCoupons: boolean;
  allowWelcomeEmail: boolean;
  allowAdvancedStats: boolean;
  allowMetaPixel: boolean;
  allowOrderBump: boolean;
  allowAbandonedCart: boolean;
  allowAffiliates: boolean;
  allowCommunityPerCourse: boolean;
}

type Caps = Omit<PlanLimits, 'plan' | 'comision' | 'planLabel'>;

const LIMITS: Record<PlanType, Caps> = {
  gratis: {
    maxCourses: 2,
    maxFileMB: 10,
    maxManualStudents: 10,
    allowDirectVideo: false,
    allowCoupons: false,
    allowWelcomeEmail: false,
    allowAdvancedStats: false,
    allowMetaPixel: false,
    allowOrderBump: false,
    allowAbandonedCart: false,
    allowAffiliates: false,
    allowCommunityPerCourse: false,
  },
  creador: {
    maxCourses: 10,
    maxFileMB: 50,
    maxManualStudents: 10,
    allowDirectVideo: true,
    allowCoupons: true,
    allowWelcomeEmail: true,
    allowAdvancedStats: false,
    allowMetaPixel: false,
    allowOrderBump: false,
    allowAbandonedCart: false,
    allowAffiliates: false,
    allowCommunityPerCourse: false,
  },
  pro: {
    maxCourses: null,
    maxFileMB: 200,
    maxManualStudents: null,
    allowDirectVideo: true,
    allowCoupons: true,
    allowWelcomeEmail: true,
    allowAdvancedStats: true,
    allowMetaPixel: true,
    allowOrderBump: true,
    allowAbandonedCart: true,
    allowAffiliates: true,
    allowCommunityPerCourse: true,
  },
};

const LABELS: Record<PlanType, string> = {
  gratis: 'Plan Gratis',
  creador: 'Plan Creador',
  pro: 'Plan Pro',
};

const DEFAULT_COMISION: Record<PlanType, number> = {
  gratis: 10,
  creador: 5,
  pro: 2,
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
      const comision = (row?.comision as number) ?? DEFAULT_COMISION[plan] ?? 10;
      return {
        plan,
        comision,
        planLabel: LABELS[plan] ?? plan,
        ...(LIMITS[plan] ?? LIMITS.gratis),
      };
    },
  });
}
