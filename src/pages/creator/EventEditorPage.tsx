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
import { ArrowLeft, Loader2, Upload, Trash2, Calendar, Clock, Users, Video } from 'lucide-react';
import { generateSlug, formatPrice } from '@/lib/utils';

export default function EventEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceClp, setPriceClp] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState('draft');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Event specific fields
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxAttendees, setMaxAttendees] = useState<number | null>(null);
  const [meetingUrl, setMeetingUrl] = useState('');

  // Fetch existing event if editing
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
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

  // Load event data into form
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setPriceClp(event.price_clp);
      setCategoryId(event.category_id);
      setStatus(event.status);
      setCoverImageUrl(event.cover_image_url);
      setMeetingUrl(event.meeting_url || '');
      setDurationMinutes(event.duration_minutes || 60);
      setMaxAttendees(event.max_attendees);

      // Parse date and time from event_date
      if (event.event_date) {
        const date = new Date(event.event_date);
        setEventDate(date.toISOString().split('T')[0]);
        setEventTime(date.toTimeString().slice(0, 5));
      }
    }
  }, [event]);

  // Handle cover upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `events/${user.id}/cover-${Date.now()}.${fileExt}`;

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
      if (!eventDate || !eventTime) {
        throw new Error('Fecha y hora son requeridos');
      }

      const slug = generateSlug(title);
      const eventDateTime = new Date(`${eventDate}T${eventTime}:00`).toISOString();

      const payload = {
        title,
        slug,
        description,
        price_clp: priceClp,
        category_id: categoryId,
        status,
        cover_image_url: coverImageUrl,
        event_type: 'online',
        event_date: eventDateTime,
        duration_minutes: durationMinutes,
        max_attendees: maxAttendees,
        meeting_url: meetingUrl,
        creator_id: user!.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', id!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-events'] });
      toast({ title: isEditing ? 'Evento actualizado' : 'Evento creado' });
      navigate('/creator-app/products');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (isEditing && isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate('/creator-app/products')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Productos
      </Button>

      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Editar Evento' : 'Nuevo Evento Online'}
      </h1>

      <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título del Evento *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Masterclass de Fotografía"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe tu evento..."
                className="mt-1"
                rows={4}
              />
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
            <CardTitle>Imagen del Evento</CardTitle>
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
              <div className="relative w-64">
                <img src={coverImageUrl} alt="Portada" className="w-full rounded-lg aspect-video object-cover" />
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
                Subir imagen
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fecha y Hora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duración (minutos)
                </Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min={15}
                  step={15}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Cupos máximos
                </Label>
                <Input
                  type="number"
                  value={maxAttendees || ''}
                  onChange={(e) => setMaxAttendees(e.target.value ? Number(e.target.value) : null)}
                  min={1}
                  placeholder="Sin límite"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Deja vacío para sin límite</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Link de la Reunión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>URL de Zoom, Meet u otra plataforma</Label>
              <Input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Este link será visible solo para los inscritos
              </p>
            </div>
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

        <div className="flex gap-3">
          <Button type="submit" disabled={saveMutation.isPending || !title || !eventDate || !eventTime}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Evento'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/creator-app/products')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
