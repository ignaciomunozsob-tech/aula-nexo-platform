import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ExternalLink, Upload, User, Instagram, Linkedin, Globe, Youtube, Twitter, Mail, KeyRound, BarChart3 } from 'lucide-react';
import { generateSlug } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

export default function CreatorProfileEdit() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cast profile to access new columns not yet in types
  const profileData = profile as any;

  const [name, setName] = useState(profileData?.name || '');
  const [bio, setBio] = useState(profileData?.bio || '');
  const [creatorSlug, setCreatorSlug] = useState(profileData?.creator_slug || '');
  const [introVideoUrl, setIntroVideoUrl] = useState(profileData?.intro_video_url || '');
  const [metaPixelId, setMetaPixelId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profileData?.avatar_url || '');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
      if (newPassword !== confirmPassword) throw new Error('Las contraseñas no coinciden');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Contraseña actualizada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const sendResetEmail = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Correo enviado', description: 'Revisa tu bandeja de entrada' });
    }
  };

  // Keep local form state in sync if profile refreshes
  useEffect(() => {
    setName(profileData?.name || '');
    setBio(profileData?.bio || '');
    setCreatorSlug(profileData?.creator_slug || '');
    setIntroVideoUrl(profileData?.intro_video_url || '');
    setAvatarUrl(profileData?.avatar_url || '');
    // meta_pixel_id is column-restricted; fetch via secure RPC
    supabase.rpc('get_my_meta_pixel_id').then(({ data }) => {
      setMetaPixelId((data as string | null) ?? '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.id, profileData?.updated_at]);

  // Parse existing links
  const existingLinks = Array.isArray(profileData?.links) ? profileData.links : [];
  const parsedLinks: SocialLinks = {};
  existingLinks.forEach((link: any) => {
    if (link.type) parsedLinks[link.type as keyof SocialLinks] = link.url;
  });

  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    instagram: parsedLinks.instagram || '',
    linkedin: parsedLinks.linkedin || '',
    twitter: parsedLinks.twitter || '',
    youtube: parsedLinks.youtube || '',
    website: parsedLinks.website || '',
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileData?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileData.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-assets')
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(newAvatarUrl);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', profileData.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: 'Foto de perfil actualizada' });
    } catch (error: any) {
      toast({ title: 'Error al subir imagen', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const slug = creatorSlug || generateSlug(name);

      // Build links array from social links
      const linksArray = Object.entries(socialLinks)
        .filter(([_, url]) => url && url.trim())
        .map(([type, url]) => ({
          type,
          url: url.trim(),
          label: type.charAt(0).toUpperCase() + type.slice(1),
        }));

      // IMPORTANT: Some backends might not have `intro_video_url` yet.
      // We only send it if there is a value; and we retry without it if the API complains.
      const basePayload: Record<string, any> = {
        name,
        bio,
        creator_slug: slug,
        links: linksArray,
        meta_pixel_id: metaPixelId?.trim() || null,
      };

      const trimmedIntro = introVideoUrl?.trim();
      const payloadWithIntro = trimmedIntro ? { ...basePayload, intro_video_url: trimmedIntro } : basePayload;

      const attempt = async (payload: Record<string, any>) => {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', profileData!.id);
        if (error) throw error;
      };

      try {
        await attempt(payloadWithIntro);
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (msg.includes("Could not find the 'intro_video_url' column")) {
          // Retry without intro_video_url so the rest of the profile can still be saved.
          await attempt(basePayload);
          return;
        }
        throw e;
      }
    },
    onSuccess: async () => {
      await refreshProfile();
      toast({ title: 'Perfil actualizado' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil Público</h1>

      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-6">
        {/* Account / Login Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cuenta e inicio de sesión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Correo electrónico</Label>
              <Input value={user?.email || ''} disabled className="mt-1 bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">El correo de inicio de sesión no se puede modificar desde aquí.</p>
            </div>
            <div className="border-t pt-4 space-y-3">
              <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Cambiar contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 8 caracteres)"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nueva contraseña"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => passwordMutation.mutate()}
                  disabled={passwordMutation.isPending || !newPassword || !confirmPassword}
                >
                  {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Actualizar contraseña
                </Button>
                <Button type="button" variant="outline" onClick={sendResetEmail}>
                  Enviarme un enlace de recuperación
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Foto de Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={`Foto de perfil de ${name || 'creador'}`} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-background/50 rounded-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Cambiar foto
                </Button>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG. Max 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>URL pública (slug)</Label>
              <Input
                value={creatorSlug}
                onChange={(e) => setCreatorSlug(e.target.value)}
                placeholder={generateSlug(name)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tu perfil: /creator/{creatorSlug || generateSlug(name)}
              </p>
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1" rows={4} />
            </div>
          </CardContent>
        </Card>

        {/* Video de Presentación */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Video de Presentación</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>URL del Video (YouTube, Vimeo, etc.)</Label>
              <Input
                value={introVideoUrl}
                onChange={(e) => setIntroVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si tu backend todavía no tiene esta columna, igual podrás guardar el resto del perfil.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Meta Pixel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Meta Pixel (Facebook / Instagram Ads)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>ID del Pixel</Label>
              <Input
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="Ej: 1234567890123456"
                className="mt-1"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Pega aquí el ID numérico de tu Pixel de Meta. Se disparará automáticamente
                en tu perfil público, las páginas de tus cursos y en cada compra con los
                eventos estándar: <strong>PageView</strong>, <strong>ViewContent</strong>,{' '}
                <strong>InitiateCheckout</strong> y <strong>Purchase</strong> (con monto y moneda CLP).
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ¿Cómo obtenerlo? Entra a{' '}
                <a
                  href="https://business.facebook.com/events_manager2"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Meta Events Manager
                </a>{' '}
                → Conjuntos de datos → tu Pixel → copia el ID.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Redes Sociales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Redes Sociales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <Instagram className="h-4 w-4" /> Instagram
              </Label>
              <Input
                value={socialLinks.instagram}
                onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                placeholder="https://instagram.com/tu-usuario"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Linkedin className="h-4 w-4" /> LinkedIn
              </Label>
              <Input
                value={socialLinks.linkedin}
                onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/tu-usuario"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Twitter className="h-4 w-4" /> Twitter / X
              </Label>
              <Input
                value={socialLinks.twitter}
                onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                placeholder="https://twitter.com/tu-usuario"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Youtube className="h-4 w-4" /> YouTube
              </Label>
              <Input
                value={socialLinks.youtube}
                onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                placeholder="https://youtube.com/@tu-canal"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" /> Sitio Web
              </Label>
              <Input
                value={socialLinks.website}
                onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                placeholder="https://tu-sitio.com"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar Cambios
          </Button>
          {profileData?.creator_slug && (
            <Button variant="outline" asChild>
              <Link to={`/creator/${profileData.creator_slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver perfil público
              </Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
