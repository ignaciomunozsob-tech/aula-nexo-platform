import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';
import { Mail, KeyRound, Pencil, MessageCircle } from 'lucide-react';
import CreatorBillingPage from './CreatorBillingPage';
import CreatorIntegrationsPage from './CreatorIntegrationsPage';
import { toast } from 'sonner';

function AccountOverview() {
  const { user, profile } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);

  const { data: totals } = useQuery({
    queryKey: ['creator-account-totals', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('amount_clp, platform_amount_clp, community_fee_clp')
        .eq('creator_id', user!.id)
        .eq('status', 'paid');
      if (error) throw error;
      const rows = data || [];
      const sold = rows.reduce((s, r: any) => s + (r.amount_clp || 0), 0);
      const fee = rows.reduce(
        (s, r: any) => s + (r.platform_amount_clp || 0) + (r.community_fee_clp || 0),
        0,
      );
      return { sold, fee, count: rows.length };
    },
  });

  const initials = profile?.name?.charAt(0).toUpperCase() || 'C';
  const registered = (user as any)?.created_at
    ? new Date((user as any).created_at).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    setSendingReset(false);
    if (error) toast.error('No pudimos enviar el correo');
    else toast.success('Te enviamos un correo para cambiar tu contraseña');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center gap-5">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'Creador'} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{profile?.name || 'Creador'}</h2>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm mt-1">
              <Mail className="h-4 w-4" /> {user?.email}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Miembro desde {registered}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button asChild variant="outline" size="sm">
              <Link to="/creator-app/profile">
                <Pencil className="h-4 w-4 mr-1.5" /> Editar perfil
              </Link>
            </Button>
            <Button onClick={handleResetPassword} variant="outline" size="sm" disabled={sendingReset}>
              <KeyRound className="h-4 w-4 mr-1.5" /> Cambiar contraseña
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals?.count ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totals?.sold ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comisión pagada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totals?.fee ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'hsl(var(--novu-accent) / 0.18)' }}
          >
            <MessageCircle className="h-5 w-5" style={{ color: 'hsl(var(--novu-accent))' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Modelo de cobro</h3>
            <p className="text-sm text-muted-foreground mt-1">
              NOVU cobra un 10% por cada venta. Sin mensualidad, sin costos fijos. Si activas la
              comunidad en un curso se descuenta $990 adicional por cada venta de ese curso.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreatorPlanPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mi cuenta</h1>
        <p className="text-muted-foreground">Datos personales, facturación e integraciones.</p>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Datos personales</TabsTrigger>
          <TabsTrigger value="billing">Datos de facturación</TabsTrigger>
          <TabsTrigger value="integrations">Integraciones</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="mt-6">
          <AccountOverview />
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <div className="-m-6">
            <CreatorBillingPage />
          </div>
        </TabsContent>
        <TabsContent value="integrations" className="mt-6">
          <div className="-m-6">
            <CreatorIntegrationsPage />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
