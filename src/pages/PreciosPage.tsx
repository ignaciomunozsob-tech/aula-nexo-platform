import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, X, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SEO } from '@/components/SEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const SUPPORT_WA = 'https://wa.me/56933728004';

function SoonPill() {
  return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border border-border text-muted-foreground ml-2">
      Próximamente
    </span>
  );
}

function FeatureRow({ children, soon }: { children: React.ReactNode; soon?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'hsl(var(--novu-accent))' }} strokeWidth={3} />
      <span className="text-foreground/90">
        {children}
        {soon && <SoonPill />}
      </span>
    </li>
  );
}

const emailSchema = z.string().trim().email('Email inválido').max(255);

function WaitlistDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const parsed = emailSchema.safeParse(value);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { error } = await supabase.from('waitlist_pro').insert({ email: parsed.data });
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      toast({ title: '¡Listo! 🎉', description: 'Te avisaremos cuando lancemos el plan Pro.' });
      setEmail('');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'No pudimos registrarte', description: err?.message || 'Intenta nuevamente', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lista de espera — Plan Pro</DialogTitle>
          <DialogDescription>Te avisamos en cuanto esté disponible.</DialogDescription>
        </DialogHeader>
        <Input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          onKeyDown={(e) => e.key === 'Enter' && mutation.mutate(email)}
        />
        <DialogFooter>
          <Button onClick={() => mutation.mutate(email)} disabled={mutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Notifícame
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PillBadge({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  if (dark) {
    return (
      <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full border border-white/20 text-white/80">
        {children}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full"
      style={{ background: 'hsl(var(--novu-accent))', color: 'hsl(var(--novu-text-on-accent))' }}
    >
      {children}
    </span>
  );
}

function YesCell() {
  return <Check className="h-5 w-5 mx-auto" style={{ color: 'hsl(var(--novu-accent))' }} strokeWidth={3} />;
}
function NoCell() {
  return <X className="h-5 w-5 mx-auto text-muted-foreground/60" />;
}
function SoonCell() {
  return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
      Próximamente
    </span>
  );
}

const compareRows: Array<{ label: string; gratis: React.ReactNode; creador: React.ReactNode; pro: React.ReactNode }> = [
  { label: 'Cursos publicados', gratis: '2', creador: 'Ilimitados', pro: 'Ilimitados' },
  { label: 'Comisión por venta', gratis: '10%', creador: '5%', pro: 'Por definir' },
  { label: 'Videos propios', gratis: <NoCell />, creador: <YesCell />, pro: <YesCell /> },
  { label: 'Videos YouTube/Vimeo', gratis: <YesCell />, creador: <YesCell />, pro: <YesCell /> },
  { label: 'Archivos descargables', gratis: '10MB', creador: 'Ilimitados', pro: 'Ilimitados' },
  { label: 'Alumnos manuales', gratis: '10', creador: '10', pro: 'Ilimitados' },
  { label: 'Agenda 1:1', gratis: <NoCell />, creador: <SoonCell />, pro: <SoonCell /> },
  { label: 'Comunidad por curso', gratis: <NoCell />, creador: <NoCell />, pro: <SoonCell /> },
  { label: 'Afiliados', gratis: <NoCell />, creador: <NoCell />, pro: <SoonCell /> },
  { label: 'Soporte', gratis: 'Documentación', creador: 'WhatsApp', pro: 'Prioritario' },
];

export default function PreciosPage() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <>
      <SEO
        title="Precios y planes — NOVU"
        description="Compara los planes de NOVU: Gratis (10% por venta), Creador (5%) y Pro. Sin contratos. Sin sorpresas."
        path="/precios"
      />
      {/* HEADER */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="flex justify-center mb-5">
          <PillBadge>Planes y precios</PillBadge>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground">
          Empieza gratis.<br className="hidden md:block" /> Escala cuando quieras
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">Sin contratos. Sin sorpresas.</p>
      </section>

      {/* PLAN CARDS */}
      <section className="max-w-[1000px] mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {/* GRATIS */}
          <div className="rounded-2xl border border-border bg-card p-7 flex flex-col">
            <h3 className="text-xl font-bold text-foreground">Gratis</h3>
            <p className="text-sm text-muted-foreground mt-1">Para empezar a vender</p>
            <div className="mt-5 mb-1 text-4xl font-black text-foreground">$0<span className="text-base font-medium text-muted-foreground">/mes</span></div>
            <Button variant="outline" className="mt-5 w-full" asChild>
              <a href="/#/signup">Empezar gratis</a>
            </Button>
            <ul className="mt-6 space-y-3 flex-1">
              <FeatureRow>Hasta 2 cursos publicados</FeatureRow>
              <FeatureRow>10% de comisión por venta</FeatureRow>
              <FeatureRow>Videos vía YouTube o Vimeo</FeatureRow>
              <FeatureRow>Archivos hasta 10MB</FeatureRow>
              <FeatureRow>Hasta 10 alumnos manuales</FeatureRow>
              <FeatureRow>Soporte vía documentación</FeatureRow>
            </ul>
          </div>

          {/* CREADOR — destacada */}
          <div
            className="relative rounded-2xl p-7 flex flex-col border-2"
            style={{
              borderColor: '#fcc70e',
              background: 'var(--novu-creator-card, #fffbf0)',
            }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <PillBadge>Más popular</PillBadge>
            </div>
            <h3 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>Creador</h3>
            <p className="text-sm mt-1" style={{ color: '#555' }}>Para creadores que quieren escalar</p>
            <div className="mt-5 mb-1 text-4xl font-black" style={{ color: '#1a1a1a' }}>
              $9.990<span className="text-base font-medium" style={{ color: '#555' }}>/mes</span>
            </div>
            <Button
              className="mt-5 w-full font-bold"
              style={{ background: '#fcc70e', color: '#1a1a1a' }}
              asChild
            >
              <a href="/#/signup">Suscribirme</a>
            </Button>
            <ul className="mt-6 space-y-3 flex-1" style={{ color: '#1a1a1a' }}>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Cursos ilimitados</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>5% de comisión por venta</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Sube tus propios videos</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Archivos ilimitados</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Hasta 10 alumnos manuales</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Soporte vía WhatsApp directo</span></li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} />
                <span>Agenda 1:1 <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border ml-1" style={{ borderColor: '#e5d9b3', color: '#7a6a3a' }}>Próximamente</span></span>
              </li>
            </ul>
          </div>

          {/* PRO — dark */}
          <div className="rounded-2xl p-7 flex flex-col" style={{ background: '#0a0a0a', color: '#fff' }}>
            <h3 className="text-xl font-bold">Pro</h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Comunidad, afiliados, estadísticas avanzadas y más
            </p>
            <div className="mt-5 mb-1 text-3xl md:text-4xl font-black">Próximamente</div>
            <Button
              variant="outline"
              className="mt-5 w-full border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
              onClick={() => setWaitlistOpen(true)}
            >
              Unirme a la lista de espera
            </Button>
            <ul className="mt-6 space-y-3 flex-1">
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Todo lo del plan Creador</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Comunidad por curso</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Programa de afiliados</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Estadísticas avanzadas</span></li>
              <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#fcc70e' }} strokeWidth={3} /><span>Soporte prioritario</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* COMPARATIVA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-6 text-center">Compara los planes</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f3f4f6', color: '#1a1a1a' }}>
                <th className="text-left px-5 py-4 font-bold">Feature</th>
                <th className="px-5 py-4 font-bold text-center">Gratis</th>
                <th className="px-5 py-4 font-bold text-center" style={{ background: '#fffbf0' }}>Creador</th>
                <th className="px-5 py-4 font-bold text-center" style={{ background: '#0a0a0a', color: '#fff' }}>Pro</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r, i) => (
                <tr key={r.label} className={i % 2 === 1 ? 'bg-muted/40' : ''}>
                  <td className="px-5 py-3.5 font-medium text-foreground">{r.label}</td>
                  <td className="px-5 py-3.5 text-center text-foreground/90">{r.gratis}</td>
                  <td className="px-5 py-3.5 text-center" style={{ background: '#fffbf0', color: '#1a1a1a' }}>{r.creador}</td>
                  <td className="px-5 py-3.5 text-center" style={{ background: '#0a0a0a', color: '#fff' }}>{r.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-6 text-center">Preguntas sobre los planes</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="q1">
            <AccordionTrigger>¿Puedo cambiar de plan cuando quiera?</AccordionTrigger>
            <AccordionContent>
              Sí. Puedes subir o bajar de plan en cualquier momento desde tu panel de creador.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2">
            <AccordionTrigger>¿Qué pasa si supero el límite de cursos en el plan Gratis?</AccordionTrigger>
            <AccordionContent>
              Puedes seguir editando tus cursos existentes pero no podrás publicar nuevos hasta que actualices tu plan o elimines un curso publicado.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q3">
            <AccordionTrigger>¿La comisión se aplica sobre el precio total del curso?</AccordionTrigger>
            <AccordionContent>
              Sí. La comisión de NOVU se calcula sobre el precio total de cada venta. A eso se suma la comisión de MercadoPago según el método de pago.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q4">
            <AccordionTrigger>¿Cómo funciona el soporte por WhatsApp?</AccordionTrigger>
            <AccordionContent>
              Al suscribirte al plan Creador recibes acceso directo a nuestro WhatsApp de soporte. Respondemos en menos de 24 horas hábiles.{' '}
              <a href={SUPPORT_WA} target="_blank" rel="noreferrer" className="font-semibold underline" style={{ color: '#fcc70e' }}>
                Escribir al soporte
              </a>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q5">
            <AccordionTrigger>¿Qué incluirá el plan Pro?</AccordionTrigger>
            <AccordionContent>
              Estamos construyendo features como comunidad por curso, programa de afiliados, estadísticas avanzadas y agenda 1:1. Únete a la lista de espera para ser el primero en acceder.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: '#0a0a0a' }} className="px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white">¿Tienes dudas? Hablemos</h2>
          <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Te ayudamos a elegir el plan correcto para tu negocio
          </p>
          <a
            href={SUPPORT_WA}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center mt-7 px-7 py-3.5 rounded-full font-bold text-base transition-transform hover:scale-105"
            style={{ background: '#fcc70e', color: '#1a1a1a' }}
          >
            Escribir al soporte
          </a>
        </div>
      </section>

      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </>
  );
}
