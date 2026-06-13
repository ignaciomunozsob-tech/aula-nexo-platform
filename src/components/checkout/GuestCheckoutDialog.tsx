import { useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const emailSchema = z.string().trim().toLowerCase().email('Email inválido').max(254);

interface GuestCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string) => Promise<void> | void;
  loading?: boolean;
}

export function GuestCheckoutDialog({ open, onOpenChange, onSubmit, loading }: GuestCheckoutDialogProps) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const handleContinue = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? 'Email inválido');
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
            Ingresa tu correo para continuar. Si ya tienes cuenta en NOVU, vincularemos la compra automáticamente.
            Si no, te enviaremos un correo después del pago para que configures tu contraseña.
          </DialogDescription>
        </DialogHeader>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleContinue();
            }}
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button asChild variant="ghost" className="sm:mr-auto">
            <Link to="/login">Ya tengo cuenta</Link>
          </Button>
          <Button onClick={handleContinue} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continuar al pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
