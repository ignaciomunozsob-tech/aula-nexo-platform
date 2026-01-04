import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ExternalLink, Upload, User, Instagram, Linkedin, Globe, Youtube, Twitter } from 'lucide-react';
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
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [creatorSlug, setCreatorSlug] = useState(profile?.creator_slug || '');
  const [introVideoUrl, setIntroVideoUrl] = useState((profile as any)?.intro_video_url || '');
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  // Parse existing links
  const existingLinks = Array.isArray(profile?.links) ? profile.links : [];
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
    if (!file || !profile?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-assets')
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(newAvatarUrl);

      // Update profile immediately
      await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', profile.id);

      refreshProfile();
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

      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          bio,
          creator_slug: slug,
          intro_video_url: introVideoUrl || null,
          links: linksArray,
        })
        .eq('id', profile!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      toast({ title: 'Perfil actualizado' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil Público</h1>

      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-6">
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
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
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
                Este video aparecerá en tu perfil público para que los visitantes te conozcan mejor.
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
          {profile?.creator_slug && (
            <Button variant="outline" asChild>
              <Link to={`/creator/${profile.creator_slug}`} target="_blank">
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