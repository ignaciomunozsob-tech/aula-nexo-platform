import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CourseCard } from '@/components/courses/CourseCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  
  const categoryFilter = searchParams.get('category');
  const levelFilter = searchParams.get('level');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', categoryFilter, levelFilter, searchParams.get('q')],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select(`
          *,
          profiles:creator_id (
            name,
            creator_slug
          ),
          categories:category_id (
            name,
            slug
          )
        `)
        .eq('status', 'published');

      if (categoryFilter) {
        const category = categories?.find(c => c.slug === categoryFilter);
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      if (levelFilter) {
        query = query.eq('level', levelFilter);
      }

      const q = searchParams.get('q');
      if (q) {
        query = query.ilike('title', `%${q}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!categories || !categoryFilter,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set('q', searchQuery);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const setFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery('');
  };

  const hasFilters = categoryFilter || levelFilter || searchParams.get('q');

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explorar Cursos</h1>
        <p className="text-muted-foreground">
          Encuentra el curso perfecto para ti entre nuestra selección
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cursos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select
            value={categoryFilter || ''}
            onValueChange={(value) => setFilter('category', value || null)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las categorías</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={levelFilter || ''}
            onValueChange={(value) => setFilter('level', value || null)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los niveles</SelectItem>
              <SelectItem value="beginner">Principiante</SelectItem>
              <SelectItem value="intermediate">Intermedio</SelectItem>
              <SelectItem value="advanced">Avanzado</SelectItem>
            </SelectContent>
          </Select>

          <Button type="submit">Buscar</Button>

          {hasFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </form>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <>
          <p className="text-muted-foreground mb-4">
            {courses.length} curso{courses.length !== 1 ? 's' : ''} encontrado{courses.length !== 1 ? 's' : ''}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                slug={course.slug}
                title={course.title}
                description={course.description}
                coverImageUrl={course.cover_image_url}
                priceCLP={course.price_clp}
                level={course.level}
                durationMinutes={course.duration_minutes_est}
                creatorName={(course.profiles as any)?.name}
                creatorSlug={(course.profiles as any)?.creator_slug}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No se encontraron cursos</p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
