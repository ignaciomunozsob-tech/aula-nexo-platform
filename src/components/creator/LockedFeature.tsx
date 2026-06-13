import { useState, ReactNode } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Requires = 'creador' | 'pro' | 'coming-soon';

interface LockedFeatureProps {
  requires: Requires;
  featureName?: string;
  children?: ReactNode;
  className?: string;
  /** Render as an inline badge instead of a wrapper overlay */
  asBadge?: boolean;
}

const COPY: Record<Requires, { subtitle: string; ctaLabel: string; ctaTo: string | null }> = {
  creador: {
    subtitle: 'Actualiza al plan Creador para desbloquear esta función.',
    ctaLabel: 'Ver plan Creador',
    ctaTo: '/precios',
  },
  pro: {
    subtitle: 'Esta función es exclusiva del plan Pro.',
    ctaLabel: 'Ver plan Pro',
    ctaTo: '/precios',
  },
  'coming-soon': {
    subtitle: 'Esta función estará disponible pronto en tu plan.',
    ctaLabel: 'Entendido',
    ctaTo: null,
  },
};

export function LockedFeature({
  requires,
  featureName,
  children,
  className,
  asBadge,
}: LockedFeatureProps) {
  const [open, setOpen] = useState(false);
  const copy = COPY[requires];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const modal = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-2xl border-border shadow-lg max-w-md">
        <DialogHeader>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
            style={{ background: 'rgba(252,199,14,0.15)' }}
          >
            <Lock className="h-6 w-6" style={{ color: '#fcc70e' }} />
          </div>
          <DialogTitle className="text-xl font-bold">
            {featureName
              ? `“${featureName}” no está disponible en tu plan actual`
              : 'Esta función no está disponible en tu plan actual'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            {copy.subtitle}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Ahora no
          </Button>
          {copy.ctaTo ? (
            <Button
              asChild
              className="rounded-xl font-bold"
              style={{ background: '#fcc70e', color: '#1a1a1a' }}
            >
              <Link to={copy.ctaTo} onClick={() => setOpen(false)}>
                {copy.ctaLabel} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button
              onClick={() => setOpen(false)}
              className="rounded-xl font-bold"
              style={{ background: '#fcc70e', color: '#1a1a1a' }}
            >
              {copy.ctaLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (asBadge) {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-muted transition',
            className,
          )}
        >
          <Lock className="h-3 w-3" />
          {requires === 'coming-soon' ? 'Próximamente' : requires === 'pro' ? 'Pro' : 'Creador'}
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          'relative cursor-pointer rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition group',
          className,
        )}
      >
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 backdrop-blur-[2px] bg-background/50 rounded-xl">
          <Lock className="h-5 w-5" style={{ color: '#fcc70e' }} />
          <span className="text-xs font-semibold text-foreground">
            {requires === 'coming-soon' ? 'Próximamente' : 'Bloqueado en tu plan'}
          </span>
        </div>
        <div className="pointer-events-none opacity-40">{children}</div>
      </div>
      {modal}
    </>
  );
}
