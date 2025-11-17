import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCog, Trash2, Loader2 } from "lucide-react";

const ManageTeacherClasses = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: "",
    classId: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadAssignments();
    loadTeachers();
    loadClasses();
  }, []);

  const loadAssignments = async () => {
    const { data } = await supabase
      .from("teacher_classes")
      .select(`
        *,
        profiles!teacher_classes_teacher_id_fkey(full_name, registration_number),
        classes(name)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setAssignments(data);
    }
  };

  const loadTeachers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select(`
        *,
        user_roles!inner(role)
      `)
      .eq("user_roles.role", "teacher")
      .order("full_name");

    if (data) {
      setTeachers(data);
    }
  };

  const loadClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (data) {
      setClasses(data);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.teacherId || !formData.classId) {
      toast.error("Selecione professor e turma");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("teacher_classes")
        .insert({
          teacher_id: formData.teacherId,
          class_id: formData.classId,
        });

      if (error) throw error;

      toast.success("Turma atribuída ao professor!");
      setIsDialogOpen(false);
      setFormData({ teacherId: "", classId: "" });
      loadAssignments();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Este professor já está atribuído a esta turma");
      } else {
        toast.error("Erro ao atribuir turma");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm("Remover esta atribuição?")) return;

    try {
      const { error } = await supabase
        .from("teacher_classes")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Atribuição removida");
      loadAssignments();
    } catch (error) {
      toast.error("Erro ao remover atribuição");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Turmas dos Professores</CardTitle>
            <CardDescription>
              Atribua turmas aos professores para controle de acesso
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserCog className="mr-2 h-4 w-4" />
                Atribuir Turma
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAssign}>
                <DialogHeader>
                  <DialogTitle>Atribuir Turma a Professor</DialogTitle>
                  <DialogDescription>
                    Professores só poderão ver dados de alunos das turmas atribuídas
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Professor</Label>
                    <Select
                      value={formData.teacherId}
                      onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um professor" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.full_name} - {teacher.registration_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class">Turma</Label>
                    <Select
                      value={formData.classId}
                      onValueChange={(value) => setFormData({ ...formData, classId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Atribuindo...
                      </>
                    ) : (
                      "Atribuir"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhuma atribuição cadastrada
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {assignment.profiles?.full_name}
                  </TableCell>
                  <TableCell>
                    {assignment.profiles?.registration_number}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {assignment.classes?.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ManageTeacherClasses;
