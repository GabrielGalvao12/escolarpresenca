import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Calendar } from "lucide-react";
import AttendanceMap from "@/components/teacher/AttendanceMap";
import AttendanceList from "@/components/teacher/AttendanceList";

const TeacherDashboard = () => {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    validAttendances: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load all profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (profilesData) {
      setProfiles(profilesData);
    }

    // Load today's attendances
    const today = new Date().toISOString().split("T")[0];
    const { data: attendancesData } = await supabase
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

    if (attendancesData) {
      setAttendances(attendancesData);
      
      const validCount = attendancesData.filter(a => a.is_valid).length;
      
      setStats({
        totalStudents: profilesData?.length || 0,
        presentToday: attendancesData.length,
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

      <AttendanceMap attendances={attendances} />
      
      <AttendanceList attendances={attendances} />
    </div>
  );
};

export default TeacherDashboard;