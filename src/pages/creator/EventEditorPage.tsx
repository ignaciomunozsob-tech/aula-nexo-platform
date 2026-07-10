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
import StudentManagement from '@/components/creator/StudentManagement';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

type EventFormSnapshot = {
  title: string;
  description: string;
  priceClp: number;
  redirectUrl: string;
  categoryId: string | null;
  status: string;
  coverImageUrl: string | null;
  eventDate: string;
  eventTime: string;
  durationMinutes: number;
  maxAttendees: number | null;
  eventType: 'online' | 'in_person';
  meetingUrl: string;
  location: string;
};

const getEventSnapshot = (values: EventFormSnapshot): EventFormSnapshot => ({
  ...values,
  title: values.title || '',
  description: values.description || '',
  priceClp: Number(values.priceClp || 0),
  redirectUrl: values.redirectUrl || '',
  categoryId: values.categoryId || null,
  coverImageUrl: values.coverImageUrl || null,
  eventDate: values.eventDate || '',
  eventTime: values.eventTime || '',
  durationMinutes: Number(values.durationMinutes || 60),
  maxAttendees: values.maxAttendees || null,
  eventType: values.eventType === 'in_person' ? 'in_person' : 'online',
  meetingUrl: values.meetingUrl || '',
  location: values.location || '',
});

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
  const [redirectUrl, setRedirectUrl] = useState('');
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
  const [eventType, setEventType] = useState<'online' | 'in_person'>('online');
  const [location, setLocation] = useState('');
  const [hasChanges, setHasChanges] = useState(!isEditing);
  const initialFormRef = useRef<EventFormSnapshot | null>(null);

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: 'Título requerido', description: 'Agrega un título antes de guardar.', variant: 'destructive' });
      return;
    }
    if (!eventDate || !eventTime) {
      toast({ title: 'Fecha y hora requeridas', description: 'Completa la fecha y hora antes de guardar.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate();
  };

  // Fetch existing event if editing (meeting_url is column-restricted, fetched via RPC)
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, price_clp, category_id, status, cover_image_url, duration_minutes, max_attendees, event_date, event_type, location, creator_id, slug, is_novu_official')
        .eq('id', id!)
        .single();
      if (error) throw error;

      // meeting_url is hidden from regular SELECT; fetch via SECURITY DEFINER RPC
      const { data: mUrl } = await supabase.rpc('get_event_meeting_url', { _event_id: id! });
      return { ...data, meeting_url: (mUrl as string) ?? '' };
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
    if (!event) return;
    if (initialFormRef.current) return;

    let nextEventDate = '';
    let nextEventTime = '';
    if (event.event_date) {
      const date = new Date(event.event_date);
      nextEventDate = date.toISOString().split('T')[0];
      nextEventTime = date.toTimeString().slice(0, 5);
    }

    const initial = getEventSnapshot({
      title: event.title,
      description: event.description || '',
      priceClp: event.price_clp,
      redirectUrl: (event as any).redirect_url || '',
      categoryId: event.category_id,
      status: event.status,
      coverImageUrl: event.cover_image_url,
      meetingUrl: event.meeting_url || '',
      eventType: (event.event_type === 'in_person' ? 'in_person' : 'online'),
      location: (event as any).location || '',
      durationMinutes: event.duration_minutes || 60,
      maxAttendees: event.max_attendees,
      eventDate: nextEventDate,
      eventTime: nextEventTime,
    });

    setTitle(initial.title);
    setDescription(initial.description);
    setPriceClp(initial.priceClp);
    setRedirectUrl(initial.redirectUrl);
    setCategoryId(initial.categoryId);
    setStatus(initial.status);
    setCoverImageUrl(initial.coverImageUrl);
    setMeetingUrl(initial.meetingUrl);
    setEventType(initial.eventType);
    setLocation(initial.location);
    setDurationMinutes(initial.durationMinutes);
    setMaxAttendees(initial.maxAttendees);
    setEventDate(initial.eventDate);
    setEventTime(initial.eventTime);
    initialFormRef.current = initial;
    setHasChanges(false);
  }, [event]);

  useEffect(() => {
    if (!isEditing) {
      setHasChanges(true);
      return;
    }
    if (!initialFormRef.current) return;

    const current = getEventSnapshot({
      title,
      description,
      priceClp,
      redirectUrl,
      categoryId,
      status,
      coverImageUrl,
      eventDate,
      eventTime,
      durationMinutes,
      maxAttendees,
      meetingUrl,
      eventType,
      location,
    });

    setHasChanges(JSON.stringify(current) !== JSON.stringify(initialFormRef.current));
  }, [isEditing, title, description, priceClp, redirectUrl, categoryId, status, coverImageUrl, eventDate, eventTime, durationMinutes, maxAttendees, meetingUrl, eventType, location]);

  // Handle cover upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/events/cover-${Date.now()}.${fileExt}`;

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
        redirect_url: redirectUrl?.trim() ? redirectUrl.trim() : null,
        category_id: categoryId,
        status,
        cover_image_url: coverImageUrl,
        event_type: eventType,
        event_date: eventDateTime,
        duration_minutes: durationMinutes,
        max_attendees: maxAttendees,
        meeting_url: eventType === 'online' ? meetingUrl : '',
        location: eventType === 'in_person' ? location : null,
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
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      initialFormRef.current = getEventSnapshot({
        title,
        description,
        priceClp,
        redirectUrl,
        categoryId,
        status,
        coverImageUrl,
        eventDate,
        eventTime,
        durationMinutes,
        maxAttendees,
        meetingUrl,
        eventType,
        location,
      });
      setHasChanges(false);
      toast({ title: isEditing ? 'Evento actualizado' : 'Evento creado' });
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

  const canSaveEvent = !saveMutation.isPending && !!title.trim() && !!eventDate && !!eventTime;

  return (
    <div className="p-4 pb-24 sm:p-6 lg:p-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate('/creator-app/products')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Productos
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Evento' : 'Nuevo Evento Online'}
        </h1>
        {isEditing && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSaveEvent}
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
              <div className="mt-1">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe tu evento..."
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
                <img src={coverImageUrl} alt={`Portada del evento ${title || ''}`.trim()} className="w-full rounded-lg aspect-video object-cover" />
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

        {/* Modalidad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Modalidad del Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo de evento</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as 'online' | 'in_person')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online (Zoom, Meet, etc.)</SelectItem>
                  <SelectItem value="in_person">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {eventType === 'online' ? (
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
            ) : (
              <div>
                <Label>Dirección del evento</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta dirección se mostrará públicamente en la página del evento
                </p>
              </div>
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
          <Button type="submit" disabled={!canSaveEvent} className="w-full sm:w-auto">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Evento'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/creator-app/products')} className="w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </form>

      {isEditing && id && (
        <div className="mt-8">
          <StudentManagement productId={id} productType="event" />
        </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
        <Button type="button" onClick={handleSave} disabled={!canSaveEvent} className="w-full" size="lg">
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isEditing ? 'Guardar Cambios' : 'Crear Evento'}
        </Button>
      </div>
    </div>
  );
}

