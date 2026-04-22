import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

export default function AdminInstructorsPage() {
  // Aggregate distinct instructors used across NOVU courses
  const { data: instructors, isLoading } = useQuery({
    queryKey: ['admin-instructors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('instructor_name, instructor_bio, instructor_avatar_url')
        .eq('is_novu_official', true)
        .not('instructor_name', 'is', null);
      if (error) throw error;

      const map = new Map<string, any>();
      (data || []).forEach((c: any) => {
        if (!c.instructor_name) return;
        if (!map.has(c.instructor_name)) {
          map.set(c.instructor_name, {
            name: c.instructor_name,
            bio: c.instructor_bio,
            avatar: c.instructor_avatar_url,
            courseCount: 1,
          });
        } else {
          map.get(c.instructor_name).courseCount += 1;
        }
      });
      return Array.from(map.values());
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          Instructores NOVU
        </h1>
        <p className="text-muted-foreground mt-1">
          Profesores oficiales que dictan cursos y carreras de NOVU
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profesores activos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Cargando…</p>
          ) : !instructors || instructors.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Aún no hay instructores. Agrega uno al crear un curso NOVU.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {instructors.map((i: any) => (
                <div
                  key={i.name}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border"
                >
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={i.avatar || ''} alt={i.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {i.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{i.name}</h3>
                    {i.bio && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{i.bio}</p>
                    )}
                    <p className="text-xs text-primary font-medium mt-2">
                      {i.courseCount} {i.courseCount === 1 ? 'curso' : 'cursos'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
