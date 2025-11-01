import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, XCircle } from "lucide-react";

interface AttendanceListProps {
  attendances: any[];
}

const AttendanceList = ({ attendances }: AttendanceListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Lista de Presenças de Hoje
        </CardTitle>
        <CardDescription>
          {attendances.length} {attendances.length === 1 ? 'aluno presente' : 'alunos presentes'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {attendances.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma presença registrada hoje
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Distância</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell className="font-medium">
                      {attendance.profiles?.full_name}
                    </TableCell>
                    <TableCell>{attendance.profiles?.registration_number}</TableCell>
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

export default AttendanceList;