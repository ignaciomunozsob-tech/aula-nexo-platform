import { useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().trim().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo'),
  email: z.string().trim().toLowerCase().email('Email inválido').max(254),
  phone: z.string().trim().min(6, 'Teléfono inválido').max(30, 'Teléfono muy largo'),
});

export interface GuestCheckoutData {
  name: string;
  email: string;
  phone: string;
}

interface GuestCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GuestCheckoutData) => Promise<void> | void;
  loading?: boolean;
}

export function GuestCheckoutDialog({ open, onOpenChange, onSubmit, loading }: GuestCheckoutDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const handleContinue = async () => {
    const parsed = schema.safeParse({ name, email, phone });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setErr(null);
    await onSubmit(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Continuar con tu compra</DialogTitle>
          <DialogDescription>
            Solo necesitamos algunos datos para procesar tu pago. No necesitas crear una cuenta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Nombre completo</Label>
            <Input
              id="guest-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-email">Correo electrónico</Label>
            <Input
              id="guest-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-phone">Teléfono</Label>
            <Input
              id="guest-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              disabled={loading}
              onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleContinue} disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continuar al pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
