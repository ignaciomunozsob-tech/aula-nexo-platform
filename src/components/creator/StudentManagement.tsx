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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type StudentEntry = {
  name: string;
  email: string;
};

interface StudentManagementProps {
  productId: string;
  productType: "course" | "ebook" | "event";
}

export default function StudentManagement({ productId, productType }: StudentManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<StudentEntry[]>([{ name: "", email: "" }]);
  const [isAdding, setIsAdding] = useState(false);

  const tableName = productType === "event" ? "event_registrations" : "enrollments";
  const foreignKey = productType === "event" ? "event_id" : "course_id";

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
  };

  const updateStudent = (index: number, field: "name" | "email", value: string) => {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);
  };

  const handleAddStudents = async () => {
    // Validate entries
    const validStudents = students.filter(
      (s) => s.name.trim() && s.email.trim() && s.email.includes("@")
    );

    if (validStudents.length === 0) {
      toast({
        title: "Error",
        description: "Agrega al menos un alumno con nombre y correo válido",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    try {
      for (const student of validStudents) {
        // Check if user exists
        const { data: existingProfiles } = await supabase
          .from("profiles")
          .select("id")
          .ilike("name", student.email)
          .limit(1);

        let userId: string;

        // Try to find user by checking if there's a profile with matching name (email as identifier)
        // Since we can't query auth.users directly, we'll create a new user
        const randomPassword = Math.random().toString(36).slice(-12) + "Aa1!";
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: student.email,
          password: randomPassword,
          options: {
            data: {
              name: student.name,
            },
          },
        });

        if (signUpError) {
          // User might already exist - try to find them
          if (signUpError.message.includes("already registered")) {
            // Query profiles to find user by looking for profile with similar email pattern in name
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, name")
              .limit(100);

            // We need to find the user - since we can't query by email directly,
            // we'll skip this user and notify
            toast({
              title: "Usuario ya existe",
              description: `El correo ${student.email} ya está registrado. El alumno debe inscribirse manualmente o ya está inscrito.`,
            });
            continue;
          }
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error("No se pudo crear el usuario");
        }

        userId = signUpData.user.id;

        // Create enrollment/registration
        if (productType === "event") {
          const { error: regError } = await supabase.from("event_registrations").insert({
            event_id: productId,
            user_id: userId,
            status: "registered",
          });
          if (regError && !regError.message.includes("duplicate")) throw regError;
        } else {
          const { error: enrollError } = await supabase.from("enrollments").insert({
            course_id: productId,
            user_id: userId,
            status: "active",
          });
          if (enrollError && !enrollError.message.includes("duplicate")) throw enrollError;
        }
      }

      toast({
        title: "Alumnos agregados",
        description: `Se agregaron ${validStudents.length} alumno(s) correctamente`,
      });

      // Reset form and close dialog
      setStudents([{ name: "", email: "" }]);
      setOpen(false);
      
      // Refresh the list
      queryClient.invalidateQueries({ queryKey: [tableName, productId] });
    } catch (error: any) {
      console.error("Error adding students:", error);
      toast({
        title: "Error al agregar alumnos",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
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
                Máximo 10 alumnos por vez.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {students.map((student, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={student.name}
                      onChange={(e) => updateStudent(index, "name", e.target.value)}
                      placeholder="Nombre del alumno"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Correo electrónico</Label>
                    <Input
                      type="email"
                      value={student.email}
                      onChange={(e) => updateStudent(index, "email", e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStudentRow(index)}
                    disabled={students.length === 1}
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

                <Button onClick={handleAddStudents} disabled={isAdding}>
                  {isAdding ? (
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
