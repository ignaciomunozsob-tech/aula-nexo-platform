import { ReactNode } from 'react';

// NOVU ya no tiene features bloqueadas por plan. Este componente se mantiene
// como passthrough para no romper imports existentes; siempre renderiza children.

interface LockedFeatureProps {
  requires?: 'creador' | 'pro' | 'coming-soon';
  featureName?: string;
  children?: ReactNode;
  className?: string;
  asBadge?: boolean;
}

export function LockedFeature({ children }: LockedFeatureProps) {
  return <>{children}</>;
}
