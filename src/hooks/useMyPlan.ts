import { useQuery } from '@tanstack/react-query';

// NOVU ya no usa sistema de planes. Cada creador tiene acceso a todas las features
// desde el momento que se registra. Esta hook se conserva como compatibilidad
// para componentes que aún la consultan, retornando un perfil "todo habilitado".

export type PlanType = 'novu';

export interface PlanLimits {
  plan: PlanType;
  comision: number;
  planLabel: string;
  maxCourses: number | null;
  maxFileMB: number;
  maxManualStudents: number | null;
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

const NOVU_PLAN: PlanLimits = {
  plan: 'novu',
  comision: 10,
  planLabel: 'NOVU',
  maxCourses: null,
  maxFileMB: 500,
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
};

export function useMyPlan() {
  return useQuery({
    queryKey: ['my-plan'],
    staleTime: Infinity,
    queryFn: async (): Promise<PlanLimits> => NOVU_PLAN,
  });
}
