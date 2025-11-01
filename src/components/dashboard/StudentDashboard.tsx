import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import FaceCapture from "@/components/attendance/FaceCapture";
import AttendanceHistory from "@/components/attendance/AttendanceHistory";

interface StudentDashboardProps {
  userId: string;
}

const StudentDashboard = ({ userId }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    checkTodayAttendance();
  }, [userId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const checkTodayAttendance = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendances")
      .select("*")
      .eq("student_id", userId)
      .eq("attendance_date", today)
      .single();

    if (data) {
      setAttendanceToday(data);
    }
  };

  const handleRegisterAttendance = () => {
    if (!profile?.face_descriptors) {
      toast.error("Você precisa cadastrar seu rosto primeiro!");
      navigate("/profile-setup");
      return;
    }
    setShowCamera(true);
  };

  const handleAttendanceSuccess = () => {
    setShowCamera(false);
    checkTodayAttendance();
    toast.success("Presença registrada com sucesso!");
  };

  if (!profile) {
    return <div>Carregando perfil...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Registrar Presença
            </CardTitle>
            <CardDescription>
              Use reconhecimento facial e geolocalização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceToday ? (
              <div className="flex items-start gap-3 p-4 bg-secondary/20 rounded-lg border border-secondary">
                <CheckCircle2 className="w-6 h-6 text-secondary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-secondary">Presença já registrada hoje!</p>
                  <p className="text-sm text-muted-foreground">
                    Horário: {attendanceToday.attendance_time}
                  </p>
                  {attendanceToday.distance_meters && (
                    <p className="text-sm text-muted-foreground">
                      Distância: {Math.round(attendanceToday.distance_meters)}m da escola
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {!profile.face_descriptors && (
                  <div className="flex items-start gap-3 p-4 bg-accent/20 rounded-lg border border-accent">
                    <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-accent">Cadastre seu rosto primeiro!</p>
                      <p className="text-sm text-muted-foreground">
                        Você precisa cadastrar seu rosto para registrar presença.
                      </p>
                    </div>
                  </div>
                )}
                <Button 
                  className="w-full" 
                  onClick={handleRegisterAttendance}
                  disabled={!profile.face_descriptors || loading}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Registrar Presença Agora
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Informações do Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-semibold">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Matrícula</p>
              <p className="font-semibold">{profile.registration_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status do Rosto</p>
              <p className={`font-semibold ${profile.face_descriptors ? 'text-secondary' : 'text-accent'}`}>
                {profile.face_descriptors ? '✓ Cadastrado' : '✗ Não cadastrado'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showCamera && (
        <FaceCapture
          userId={userId}
          onSuccess={handleAttendanceSuccess}
          onCancel={() => setShowCamera(false)}
        />
      )}

      <AttendanceHistory userId={userId} />
    </div>
  );
};

export default StudentDashboard;