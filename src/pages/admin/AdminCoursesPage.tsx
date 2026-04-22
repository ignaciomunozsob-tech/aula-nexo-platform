import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';

export default function AdminCoursesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-novu-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_novu_official', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Curso eliminado' });
    qc.invalidateQueries({ queryKey: ['admin-novu-courses'] });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Cursos NOVU Oficiales
          </h1>
          <p className="text-muted-foreground mt-1">
            Cursos producidos y certificados por NOVU
          </p>
        </div>
        <Button onClick={() => navigate('/admin/courses/new')} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nuevo curso
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo NOVU</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Cargando…</p>
          ) : !courses || courses.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                Aún no has creado cursos NOVU oficiales
              </p>
              <Button onClick={() => navigate('/admin/courses/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer curso
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.instructor_name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'published' ? 'default' : 'secondary'}>
                        {c.status === 'published' ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.price_clp === 0 ? 'Gratis' : formatPrice(c.price_clp)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {c.status === 'published' && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/course/${c.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/courses/${c.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar este curso?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará el curso "{c.title}" y todos sus módulos y
                              lecciones. No se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(c.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
