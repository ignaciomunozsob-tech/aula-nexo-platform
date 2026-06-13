import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowUpRight, Check } from 'lucide-react';
import { useMyPlan } from '@/hooks/useMyPlan';

export default function CreatorPlanPage() {
  const { data: plan, isLoading } = useMyPlan();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mi Plan</h1>
        <p className="text-muted-foreground">Gestiona tu suscripción y revisa la comisión que pagas por venta.</p>
      </div>

      <div className="bg-card border-2 rounded-2xl p-8" style={{ borderColor: '#fcc70e' }}>
        {isLoading || !plan ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Plan actual</p>
                <h2 className="text-3xl font-bold">{plan.planLabel}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-muted-foreground mb-1">Comisión por venta</p>
                <div className="text-4xl font-bold" style={{ color: '#fcc70e' }}>{plan.comision}%</div>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4" style={{ color: '#fcc70e' }} />
                {plan.maxCourses === null ? 'Cursos ilimitados' : `Hasta ${plan.maxCourses} cursos publicados`}
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4" style={{ color: '#fcc70e' }} />
                {plan.allowDirectVideo ? 'Sube tus propios videos' : 'Videos vía YouTube o Vimeo'}
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4" style={{ color: '#fcc70e' }} />
                Archivos hasta {plan.maxFileMB}MB
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4" style={{ color: '#fcc70e' }} />
                {plan.maxManualStudents === null ? 'Alumnos manuales ilimitados' : `Hasta ${plan.maxManualStudents} alumnos manuales`}
              </li>
            </ul>

            <Button asChild>
              <Link to="/precios">
                <Sparkles className="h-4 w-4 mr-2" />
                {plan.plan === 'pro' ? 'Ver todos los planes' : 'Mejorar mi plan'}
              </Link>
            </Button>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/precios" className="bg-card border border-border rounded-xl p-6 hover:border-foreground/20 transition-colors group">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold">Comparar planes</h3>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Revisa todas las diferencias entre Gratis, Creador y Pro.</p>
        </Link>
        <Link to="/comisiones" className="bg-card border border-border rounded-xl p-6 hover:border-foreground/20 transition-colors group">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold">Cómo se calcula tu comisión</h3>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Ejemplos prácticos con números reales.</p>
        </Link>
      </div>
    </div>
  );
}
