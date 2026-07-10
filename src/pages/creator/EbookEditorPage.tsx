import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Upload, FileText, Trash2 } from 'lucide-react';
import { generateSlug, formatPrice } from '@/lib/utils';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

type EbookFormSnapshot = {
  title: string;
  description: string;
  priceClp: number;
  redirectUrl: string;
  categoryId: string | null;
  status: string;
  fileUrl: string | null;
  coverImageUrl: string | null;
};

const getEbookSnapshot = (values: EbookFormSnapshot): EbookFormSnapshot => ({
  ...values,
  title: values.title || '',
  description: values.description || '',
  priceClp: Number(values.priceClp || 0),
  redirectUrl: values.redirectUrl || '',
  categoryId: values.categoryId || null,
  fileUrl: values.fileUrl || null,
  coverImageUrl: values.coverImageUrl || null,
});

export default function EbookEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceClp, setPriceClp] = useState(0);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState('draft');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [hasChanges, setHasChanges] = useState(!isEditing);
  const initialFormRef = useRef<EbookFormSnapshot | null>(null);

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: 'Título requerido', description: 'Agrega un título antes de guardar.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate();
  };

  // Fetch existing ebook if editing (file_url is column-restricted, fetched via RPC)
  const { data: ebook, isLoading } = useQuery({
    queryKey: ['ebook', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ebooks')
        .select('id, title, description, price_clp, category_id, status, cover_image_url, creator_id, slug, is_novu_official, redirect_url')
        .eq('id', id!)
        .single();
      if (error) throw error;

      const { data: fUrl } = await supabase.rpc('get_ebook_file_url', { _ebook_id: id! });
      return { ...data, file_url: (fUrl as string) ?? '' };
    },
    enabled: isEditing,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Load ebook data into form
  useEffect(() => {
    if (!ebook) return;
    if (initialFormRef.current) return;

    const initial = getEbookSnapshot({
      title: ebook.title,
      description: ebook.description || '',
      priceClp: ebook.price_clp,
      redirectUrl: (ebook as any).redirect_url || '',
      categoryId: ebook.category_id,
      status: ebook.status,
      fileUrl: ebook.file_url || null,
      coverImageUrl: ebook.cover_image_url,
    });

    setTitle(initial.title);
    setDescription(initial.description);
    setPriceClp(initial.priceClp);
    setRedirectUrl(initial.redirectUrl);
    setCategoryId(initial.categoryId);
    setStatus(initial.status);
    setFileUrl(initial.fileUrl);
    setCoverImageUrl(initial.coverImageUrl);
    initialFormRef.current = initial;
    setHasChanges(false);
  }, [ebook]);

  useEffect(() => {
    if (!isEditing) {
      setHasChanges(true);
      return;
    }
    if (!initialFormRef.current) return;

    const current = getEbookSnapshot({
      title,
      description,
      priceClp,
      redirectUrl,
      categoryId,
      status,
      fileUrl,
      coverImageUrl,
    });

    setHasChanges(JSON.stringify(current) !== JSON.stringify(initialFormRef.current));
  }, [isEditing, title, description, priceClp, redirectUrl, categoryId, status, fileUrl, coverImageUrl]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Path MUST start with the creator's user_id for the protected-content RLS policies.
      const fileName = `${user.id}/ebooks/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('protected-content')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the storage PATH; readers fetch a signed URL via get-protected-url.
      setFileUrl(fileName);
      toast({ title: 'Archivo subido correctamente' });
    } catch (error: any) {
      toast({ title: 'Error al subir archivo', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle cover upload
  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/ebooks/cover-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-assets')
        .getPublicUrl(fileName);

      setCoverImageUrl(urlData.publicUrl);
      toast({ title: 'Portada subida correctamente' });
    } catch (error: any) {
      toast({ title: 'Error al subir portada', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingCover(false);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = generateSlug(title);
      const payload = {
        title,
        slug,
        description,
        price_clp: priceClp,
        category_id: categoryId,
        status,
        file_url: fileUrl,
        cover_image_url: coverImageUrl,
        creator_id: user!.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('ebooks')
          .update(payload)
          .eq('id', id!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ebooks')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-ebooks'] });
      queryClient.invalidateQueries({ queryKey: ['ebook', id] });
      initialFormRef.current = getEbookSnapshot({
        title,
        description,
        priceClp,
        categoryId,
        status,
        fileUrl,
        coverImageUrl,
      });
      setHasChanges(false);
      toast({ title: isEditing ? 'E-book actualizado' : 'E-book creado' });
      if (!isEditing) navigate('/creator-app/products');
    },
    onError: (error: any) => {
      const raw = (error?.message || '') as string;
      let title = 'Error';
      let description = raw;
      if (raw.includes('mercadopago_not_connected')) {
        title = 'Conecta MercadoPago';
        description = 'Para publicar un producto con precio debes conectar tu cuenta de MercadoPago primero.';
      }
      toast({ title, description, variant: 'destructive' });
    },
  });

  if (isEditing && isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const canSaveEbook = !saveMutation.isPending && !!title.trim();

  return (
    <div className="p-4 pb-24 sm:p-6 lg:p-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate('/creator-app/products')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Productos
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar E-book' : 'Nuevo E-book'}
        </h1>
        {isEditing && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSaveEbook}
            className="w-full sm:w-auto"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar Cambios
          </Button>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Guía completa de marketing digital"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <div className="mt-1">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe tu e-book..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={categoryId || ''} onValueChange={(v) => setCategoryId(v || null)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Precio (CLP)</Label>
                <Input
                  type="number"
                  value={priceClp}
                  onChange={(e) => setPriceClp(Number(e.target.value))}
                  min={0}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">{formatPrice(priceClp)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Image */}
        <Card>
          <CardHeader>
            <CardTitle>Portada</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            {coverImageUrl ? (
              <div className="relative w-48">
                <img src={coverImageUrl} alt={`Portada del ebook ${title || ''}`.trim()} className="w-full rounded-lg" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setCoverImageUrl(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
              >
                {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Subir portada
              </Button>
            )}
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Archivo del E-book</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub"
              className="hidden"
              onChange={handleFileUpload}
            />
            {fileUrl ? (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Archivo cargado</p>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={async () => {
                      try {
                        const { resolveProtectedUrl } = await import('@/lib/protectedMedia');
                        const url = await resolveProtectedUrl('ebook', id);
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } catch (err: any) {
                        toast({ title: 'No se pudo abrir el archivo', description: err?.message, variant: 'destructive' });
                      }
                    }}
                  >
                    Ver archivo
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFileUrl(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
              >
                {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Subir PDF o EPUB
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Status & Save */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Publicación</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={!canSaveEbook} className="w-full sm:w-auto">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? 'Guardar Cambios' : 'Crear E-book'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/creator-app/products')} className="w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </form>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
        <Button type="button" onClick={handleSave} disabled={!canSaveEbook} className="w-full" size="lg">
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isEditing ? 'Guardar Cambios' : 'Crear E-book'}
        </Button>
      </div>
    </div>
  );
}
