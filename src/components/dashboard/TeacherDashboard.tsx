import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AttendanceMap from "@/components/teacher/AttendanceMap";
import AttendanceList from "@/components/teacher/AttendanceList";

const TeacherDashboard = () => {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    classId: "all",
    studentId: "all",
  });
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    validAttendances: 0,
  });

  useEffect(() => {
    loadData();
    loadClasses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, allAttendances]);

  const loadClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (data) {
      setClasses(data);
    }
  };

  const applyFilters = () => {
    let filtered = [...allAttendances];

    // Filter by date
    if (filters.date) {
      filtered = filtered.filter(a => a.attendance_date === filters.date);
    }

    // Filter by class
    if (filters.classId !== "all") {
      filtered = filtered.filter(a => a.profiles?.class_id === filters.classId);
    }

    // Filter by student
    if (filters.studentId !== "all") {
      filtered = filtered.filter(a => a.student_id === filters.studentId);
    }

    setAttendances(filtered);

    // Update stats based on filtered data
    const validCount = filtered.filter(a => a.is_valid).length;
    setStats(prev => ({
      ...prev,
      presentToday: filtered.length,
      validAttendances: validCount,
    }));
  };

  const loadData = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get teacher's assigned classes
    const { data: teacherClasses } = await supabase
      .from("teacher_classes")
      .select("class_id")
      .eq("teacher_id", user.id);

    // Load profiles from assigned classes only
    let profilesQuery = supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    // Filter by assigned classes if teacher has specific assignments
    if (teacherClasses && teacherClasses.length > 0) {
      const classIds = teacherClasses.map(tc => tc.class_id);
      profilesQuery = profilesQuery.in("class_id", classIds);
    }

    const { data: profilesData } = await profilesQuery;

    if (profilesData) {
      setProfiles(profilesData);
    }

    // Load attendances from assigned classes
    const today = new Date().toISOString().split("T")[0];
    let attendancesQuery = supabase
      .from("attendances")
      .select(`
        *,
        profiles:student_id (
          full_name,
          registration_number,
          class_id
        )
      `)
      .order("attendance_date", { ascending: false })
      .order("attendance_time", { ascending: false });

    // Filter by assigned classes if teacher has specific assignments
    if (teacherClasses && teacherClasses.length > 0) {
      const classIds = teacherClasses.map(tc => tc.class_id);
      attendancesQuery = attendancesQuery.in("profiles.class_id", classIds);
    }

    const { data: attendancesData } = await attendancesQuery;

    if (attendancesData) {
      setAllAttendances(attendancesData);
      
      // Filter for today
      const todayAttendances = attendancesData.filter(a => a.attendance_date === today);
      setAttendances(todayAttendances);
      
      const validCount = todayAttendances.filter(a => a.is_valid).length;
      
      setStats({
        totalStudents: profilesData?.length || 0,
        presentToday: todayAttendances.length,
        validAttendances: validCount,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presentes Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStudents > 0 
                ? `${Math.round((stats.presentToday / stats.totalStudents) * 100)}% de presença`
                : "Sem dados"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validadas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.validAttendances}</div>
            <p className="text-xs text-muted-foreground">
              {stats.presentToday > 0
                ? `${Math.round((stats.validAttendances / stats.presentToday) * 100)}% dentro do raio`
                : "Sem dados"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre as presenças por data, turma ou aluno</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select
                value={filters.classId}
                onValueChange={(value) => setFilters({ ...filters, classId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select
                value={filters.studentId}
                onValueChange={(value) => setFilters({ ...filters, studentId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alunos</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <AttendanceMap attendances={attendances} />
      
      <AttendanceList attendances={attendances} showExport={true} />
    </div>
  );
};

export default TeacherDashboard;