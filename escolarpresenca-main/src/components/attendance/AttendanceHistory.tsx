import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";

interface AttendanceHistoryProps {
  userId: string;
}

const AttendanceHistory = ({ userId }: AttendanceHistoryProps) => {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendances();
  }, [userId]);

  const loadAttendances = async () => {
    const { data } = await supabase
      .from("attendances")
      .select("*")
      .eq("student_id", userId)
      .order("attendance_date", { ascending: false })
      .limit(10);

    if (data) {
      setAttendances(data);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Histórico de Presenças
        </CardTitle>
        <CardDescription>Últimas 10 presenças registradas</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
        ) : attendances.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma presença registrada ainda
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Distância</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell className="font-medium">
                      {formatDate(attendance.attendance_date)}
                    </TableCell>
                    <TableCell>{attendance.attendance_time}</TableCell>
                    <TableCell>
                      {attendance.distance_meters 
                        ? `${Math.round(attendance.distance_meters)}m`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {attendance.is_valid ? (
                        <Badge variant="default" className="bg-secondary">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Válida
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Fora do raio
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceHistory;