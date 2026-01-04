import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Users, UserPlus, Trash2 } from "lucide-react";
import { z } from "zod";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Validation schema for student entries
const studentSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(100, "Nombre muy largo"),
  email: z.string().email("Email inválido").max(255, "Email muy largo"),
});

type StudentEntry = z.infer<typeof studentSchema>;

interface StudentManagementProps {
  productId: string;
  productType: "course" | "ebook" | "event";
}

export default function StudentManagement({ productId, productType }: StudentManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<StudentEntry[]>([{ name: "", email: "" }]);
  const [validationErrors, setValidationErrors] = useState<Record<number, { name?: string; email?: string }>>({});

  const tableName = productType === "event" ? "event_registrations" : "enrollments";

  const { data: enrollments, isLoading } = useQuery({
    queryKey: [tableName, productId],
    queryFn: async () => {
      if (productType === "event") {
        const { data, error } = await supabase
          .from("event_registrations")
          .select("id, user_id, registered_at, status, profiles:user_id(name)")
          .eq("event_id", productId)
          .order("registered_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase
          .from("enrollments")
          .select("id, user_id, purchased_at, status, profiles:user_id(name)")
          .eq("course_id", productId)
          .order("purchased_at", { ascending: false });
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!productId,
  });

  const addStudentsMutation = useMutation({
    mutationFn: async (validStudents: StudentEntry[]) => {
      const { data, error } = await supabase.functions.invoke("add-students", {
        body: {
          students: validStudents,
          productId,
          productType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Error al agregar alumnos");
      
      return data;
    },
    onSuccess: (data) => {
      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      const failedCount = data.results?.filter((r: any) => !r.success).length || 0;

      if (successCount > 0) {
        toast({
          title: "Alumnos agregados",
          description: `Se agregaron ${successCount} alumno(s) correctamente${failedCount > 0 ? `. ${failedCount} fallaron.` : "."}`,
        });
      }

      if (failedCount > 0 && successCount === 0) {
        toast({
          title: "Error al agregar alumnos",
          description: data.results?.find((r: any) => !r.success)?.message || "Algunos alumnos no pudieron ser agregados",
          variant: "destructive",
        });
      }

      setStudents([{ name: "", email: "" }]);
      setValidationErrors({});
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: [tableName, productId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al agregar alumnos",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    },
  });

  const addStudentRow = () => {
    if (students.length >= 10) {
      toast({
        title: "Límite alcanzado",
        description: "Puedes agregar máximo 10 alumnos a la vez",
        variant: "destructive",
      });
      return;
    }
    setStudents([...students, { name: "", email: "" }]);
  };

  const removeStudentRow = (index: number) => {
    if (students.length === 1) return;
    const updated = [...students];
    updated.splice(index, 1);
    setStudents(updated);
    
    // Remove validation errors for this index
    const newErrors = { ...validationErrors };
    delete newErrors[index];
    setValidationErrors(newErrors);
  };

  const updateStudent = (index: number, field: "name" | "email", value: string) => {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);
    
    // Clear validation error for this field
    if (validationErrors[index]?.[field]) {
      const newErrors = { ...validationErrors };
      if (newErrors[index]) {
        delete newErrors[index][field];
        if (Object.keys(newErrors[index]).length === 0) {
          delete newErrors[index];
        }
      }
      setValidationErrors(newErrors);
    }
  };

  const validateStudents = (): StudentEntry[] => {
    const errors: Record<number, { name?: string; email?: string }> = {};
    const validStudents: StudentEntry[] = [];

    students.forEach((student, index) => {
      // Skip empty rows
      if (!student.name.trim() && !student.email.trim()) {
        return;
      }

      try {
        const validated = studentSchema.parse({
          name: student.name.trim(),
          email: student.email.trim().toLowerCase(),
        });
        validStudents.push(validated);
      } catch (err) {
        if (err instanceof z.ZodError) {
          errors[index] = {};
          err.errors.forEach((e) => {
            const field = e.path[0] as "name" | "email";
            errors[index][field] = e.message;
          });
        }
      }
    });

    setValidationErrors(errors);
    return validStudents;
  };

  const handleAddStudents = async () => {
    const validStudents = validateStudents();

    if (validStudents.length === 0) {
      toast({
        title: "Error",
        description: "Agrega al menos un alumno con nombre y correo válido",
        variant: "destructive",
      });
      return;
    }

    addStudentsMutation.mutate(validStudents);
  };

  const activeItems = (enrollments || []).filter(
    (e: any) => e.status === "active" || e.status === "registered"
  );

  const productLabel = productType === "course" ? "curso" : productType === "ebook" ? "e-book" : "evento";

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="font-semibold">Gestión de Alumnos</h2>
          <span className="text-sm text-muted-foreground">
            ({activeItems.length} inscrito{activeItems.length !== 1 ? "s" : ""})
          </span>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Alumnos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar Alumnos Manualmente</DialogTitle>
              <DialogDescription>
                Ingresa los datos de los alumnos que deseas inscribir en este {productLabel}. 
                Máximo 10 alumnos por vez. Se les enviará un email con instrucciones para establecer su contraseña.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {students.map((student, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={student.name}
                      onChange={(e) => updateStudent(index, "name", e.target.value)}
                      placeholder="Nombre del alumno"
                      className={`mt-1 ${validationErrors[index]?.name ? "border-destructive" : ""}`}
                    />
                    {validationErrors[index]?.name && (
                      <p className="text-xs text-destructive mt-1">{validationErrors[index].name}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Correo electrónico</Label>
                    <Input
                      type="email"
                      value={student.email}
                      onChange={(e) => updateStudent(index, "email", e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className={`mt-1 ${validationErrors[index]?.email ? "border-destructive" : ""}`}
                    />
                    {validationErrors[index]?.email && (
                      <p className="text-xs text-destructive mt-1">{validationErrors[index].email}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStudentRow(index)}
                    disabled={students.length === 1}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addStudentRow}
                  disabled={students.length >= 10}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar otro ({students.length}/10)
                </Button>

                <Button onClick={handleAddStudents} disabled={addStudentsMutation.isPending}>
                  {addStudentsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Agregando...
                    </>
                  ) : (
                    "Inscribir Alumnos"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="enrolled" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="enrolled">Alumnos Inscritos</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : activeItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              Aún no hay alumnos inscritos en este {productLabel}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Fecha de inscripción</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.profiles?.name || "Usuario"}
                    </TableCell>
                    <TableCell>
                      {formatDate(item.purchased_at || item.registered_at)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {item.status === "active" || item.status === "registered" ? "Activo" : item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
