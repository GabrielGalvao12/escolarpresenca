import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { createUserSchema } from "@/lib/validation";
import { z } from "zod";

interface ManageUsersProps {
  onUpdate: () => void;
}

const ManageUsers = ({ onUpdate }: ManageUsersProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    registrationNumber: "",
    role: "teacher",
    classId: "",
    teacherClasses: [] as string[],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
    loadClasses();
  }, []);

  const loadUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(`
        *,
        user_roles(role),
        classes(name)
      `)
      .order("full_name");

    if (profiles) {
      setUsers(profiles);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    try {
      createUserSchema.parse({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        registrationNumber: formData.registrationNumber,
        role: formData.role,
        classId: formData.classId || undefined,
        teacherClasses: formData.teacherClasses,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            registration_number: formData.registrationNumber,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with class if provided
        if (formData.classId) {
          await supabase
            .from("profiles")
            .update({ class_id: formData.classId })
            .eq("id", authData.user.id);
        }

        // Update role if not student
        if (formData.role !== "student") {
          await supabase
            .from("user_roles")
            .update({ role: formData.role as "teacher" | "admin" })
            .eq("user_id", authData.user.id);
        }

        // Assign teacher to classes if role is teacher
        if (formData.role === "teacher" && formData.teacherClasses.length > 0) {
          const assignments = formData.teacherClasses.map(classId => ({
            teacher_id: authData.user.id,
            class_id: classId,
          }));
          await supabase.from("teacher_classes").insert(assignments);
        }

        toast.success(`${formData.role === "teacher" ? "Professor" : "Aluno"} criado com sucesso!`);
        setIsDialogOpen(false);
        setFormData({
          email: "",
          password: "",
          fullName: "",
          registrationNumber: "",
          role: "teacher",
          classId: "",
          teacherClasses: [],
        });
        loadUsers();
        onUpdate();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      // Note: In production, you'd need an admin API to delete auth users
      // For now, we'll just delete from profiles
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast.success("Usuário removido");
      loadUsers();
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao remover usuário");
    }
  };

  const getRoleBadge = (userRoles: any) => {
    const role = userRoles?.[0]?.role || "student";
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      teacher: "secondary",
      student: "outline",
    };
    const labels: Record<string, string> = {
      admin: "Admin",
      teacher: "Professor",
      student: "Aluno",
    };
    return <Badge variant={variants[role] || "outline"}>{labels[role] || "Aluno"}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>
              Adicione professores e alunos ao sistema
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do novo usuário
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Tipo de Usuário</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Professor</SelectItem>
                        <SelectItem value="student">Aluno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Matrícula</Label>
                    <Input
                      id="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  {formData.role === "student" && (
                    <div className="space-y-2">
                      <Label htmlFor="class">Turma (opcional)</Label>
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
                  )}
                  {formData.role === "teacher" && (
                    <div className="space-y-2">
                      <Label>Turmas do Professor</Label>
                      <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                        {classes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma turma disponível</p>
                        ) : (
                          classes.map((cls) => (
                            <div key={cls.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`teacher-class-${cls.id}`}
                                checked={formData.teacherClasses.includes(cls.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      teacherClasses: [...formData.teacherClasses, cls.id]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      teacherClasses: formData.teacherClasses.filter(id => id !== cls.id)
                                    });
                                  }
                                }}
                                className="h-4 w-4 rounded border-input"
                              />
                              <label
                                htmlFor={`teacher-class-${cls.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {cls.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Selecione as turmas que este professor poderá gerenciar
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Usuário"
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
              <TableHead>Nome</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.registration_number}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleBadge(user.user_roles)}</TableCell>
                <TableCell>{user.classes?.name || "-"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ManageUsers;
