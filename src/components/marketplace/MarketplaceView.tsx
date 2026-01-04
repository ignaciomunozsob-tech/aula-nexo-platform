import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Video, Calendar, FileText, Clock, Users, Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function MarketplaceView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch published courses
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['marketplace-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles:creator_id (name, avatar_url, creator_slug),
          categories:category_id (name, slug)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch published ebooks
  const { data: ebooks, isLoading: loadingEbooks } = useQuery({
    queryKey: ['marketplace-ebooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ebooks')
        .select(`
          *,
          categories:category_id (name, slug)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch published events
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['marketplace-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:creator_id (name, avatar_url, creator_slug),
          categories:category_id (name, slug)
        `)
        .eq('status', 'published')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratis';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Filter courses
  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || course.category_id === selectedCategory;
    const matchesFormat = selectedFormat === 'all' || course.format === selectedFormat;
    return matchesSearch && matchesCategory && matchesFormat;
  });

  // Filter ebooks
  const filteredEbooks = ebooks?.filter((ebook) => {
    const matchesSearch = ebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ebook.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ebook.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter events
  const filteredEvents = events?.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedFormat('all');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedFormat !== 'all';

  const isLoading = loadingCourses || loadingEbooks || loadingEvents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-2">🎓 Marketplace de AulaNexo</h2>
        <p className="text-muted-foreground">
          Descubre cursos, ebooks y eventos para potenciar tus habilidades
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="recorded">Grabado</SelectItem>
              <SelectItem value="live">En vivo</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="outline" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for different product types */}
      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
          <TabsTrigger value="courses" className="gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Cursos</span>
            <Badge variant="secondary" className="ml-1">
              {filteredCourses?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ebooks" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Ebooks</span>
            <Badge variant="secondary" className="ml-1">
              {filteredEbooks?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
            <Badge variant="secondary" className="ml-1">
              {filteredEvents?.length || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses">
          {isLoading ? (
            <LoadingGrid />
          ) : filteredCourses && filteredCourses.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} formatPrice={formatPrice} />
              ))}
            </div>
          ) : (
            <EmptyState type="cursos" />
          )}
        </TabsContent>

        {/* Ebooks Tab */}
        <TabsContent value="ebooks">
          {isLoading ? (
            <LoadingGrid />
          ) : filteredEbooks && filteredEbooks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEbooks.map((ebook) => (
                <EbookCard key={ebook.id} ebook={ebook} formatPrice={formatPrice} />
              ))}
            </div>
          ) : (
            <EmptyState type="ebooks" />
          )}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          {isLoading ? (
            <LoadingGrid />
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} formatPrice={formatPrice} />
              ))}
            </div>
          ) : (
            <EmptyState type="eventos" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Course Card Component
function CourseCard({ course, formatPrice }: { course: any; formatPrice: (price: number) => string }) {
  const creator = course.profiles;
  const category = course.categories;

  return (
    <Link
      to={`/course/${course.slug}`}
      className="bg-card border border-border rounded-lg overflow-hidden card-hover group"
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {course.cover_image_url ? (
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="h-12 w-12 text-primary/30" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-2">
          {course.format === 'live' && (
            <Badge className="bg-red-500 text-white">
              <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
              En vivo
            </Badge>
          )}
          {category && (
            <Badge variant="secondary">{category.name}</Badge>
          )}
        </div>
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-primary text-primary-foreground font-semibold">
            {formatPrice(course.price_clp)}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        {creator && (
          <p className="text-sm text-muted-foreground mt-1">
            Por {creator.name}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {course.duration_minutes_est && course.duration_minutes_est > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(course.duration_minutes_est / 60)}h
            </span>
          )}
          <span className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            {course.format === 'live' ? 'En vivo' : 'Grabado'}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Ebook Card Component
function EbookCard({ ebook, formatPrice }: { ebook: any; formatPrice: (price: number) => string }) {
  const category = ebook.categories;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden card-hover group">
      <div className="aspect-[3/4] bg-muted relative overflow-hidden">
        {ebook.cover_image_url ? (
          <img
            src={ebook.cover_image_url}
            alt={ebook.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/5">
            <FileText className="h-12 w-12 text-secondary/30" />
          </div>
        )}
        {category && (
          <Badge variant="secondary" className="absolute top-2 left-2">
            {category.name}
          </Badge>
        )}
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-primary text-primary-foreground font-semibold">
            {formatPrice(ebook.price_clp)}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {ebook.title}
        </h3>
        {ebook.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {ebook.description}
          </p>
        )}
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, formatPrice }: { event: any; formatPrice: (price: number) => string }) {
  const creator = event.profiles;
  const category = event.categories;
  const eventDate = new Date(event.event_date);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden card-hover group">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5">
            <Calendar className="h-12 w-12 text-accent/30" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-2">
          <Badge className={event.event_type === 'online' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}>
            {event.event_type === 'online' ? 'Online' : 'Presencial'}
          </Badge>
          {category && (
            <Badge variant="secondary">{category.name}</Badge>
          )}
        </div>
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-primary text-primary-foreground font-semibold">
            {formatPrice(event.price_clp)}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        {creator && (
          <p className="text-sm text-muted-foreground mt-1">
            Por {creator.name}
          </p>
        )}
        
        {/* Event Date - Prominent */}
        <div className="mt-3 p-2 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">
              {format(eventDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{format(eventDate, 'HH:mm', { locale: es })} hrs</span>
            {event.duration_minutes && (
              <span>• {event.duration_minutes} min</span>
            )}
          </div>
        </div>

        {event.max_attendees && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>Máx. {event.max_attendees} participantes</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading Grid
function LoadingGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
          <div className="aspect-video bg-muted" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ type }: { type: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-12 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No hay {type} disponibles</h3>
      <p className="text-muted-foreground">
        No encontramos {type} que coincidan con tus filtros. Intenta con otros criterios.
      </p>
    </div>
  );
}
