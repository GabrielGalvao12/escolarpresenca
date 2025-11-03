import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, GraduationCap, UserCog, BookOpen } from "lucide-react";
import ManageUsers from "@/components/admin/ManageUsers";
import ManageClasses from "@/components/admin/ManageClasses";
import AttendanceMap from "@/components/teacher/AttendanceMap";
import AttendanceList from "@/components/teacher/AttendanceList";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    presentToday: 0,
  });
  const [attendances, setAttendances] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadAttendances();
  }, []);

  const loadStats = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_roles(role)");

    const { data: classes } = await supabase
      .from("classes")
      .select("id");

    const today = new Date().toISOString().split("T")[0];
    const { data: todayAttendances } = await supabase
      .from("attendances")
      .select("id")
      .eq("attendance_date", today);

    if (profiles) {
      const students = profiles.filter((p: any) => 
        p.user_roles?.some((r: any) => r.role === "student")
      ).length;
      const teachers = profiles.filter((p: any) => 
        p.user_roles?.some((r: any) => r.role === "teacher")
      ).length;

      setStats({
        totalStudents: students,
        totalTeachers: teachers,
        totalClasses: classes?.length || 0,
        presentToday: todayAttendances?.length || 0,
      });
    }
  };

  const loadAttendances = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendances")
      .select(`
        *,
        profiles:student_id (
          full_name,
          registration_number
        )
      `)
      .eq("attendance_date", today)
      .order("attendance_time", { ascending: false });

    if (data) {
      setAttendances(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Professores</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.totalTeachers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.totalClasses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presentes Hoje</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.presentToday}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="classes">Turmas</TabsTrigger>
          <TabsTrigger value="attendances">Presenças</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <ManageUsers onUpdate={loadStats} />
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <ManageClasses onUpdate={loadStats} />
        </TabsContent>

        <TabsContent value="attendances" className="space-y-6">
          <AttendanceMap attendances={attendances} />
          <AttendanceList attendances={attendances} showExport={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
