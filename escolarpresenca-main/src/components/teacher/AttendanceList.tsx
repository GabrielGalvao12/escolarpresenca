import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, XCircle, Download, FileText } from "lucide-react";
import { toast } from "sonner";

interface AttendanceListProps {
  attendances: any[];
  showExport?: boolean;
}

const AttendanceList = ({ attendances, showExport = false }: AttendanceListProps) => {
  const exportToCSV = () => {
    if (attendances.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const headers = ["Nome", "Matrícula", "Horário", "Data", "Distância (m)", "Status"];
    const rows = attendances.map((a) => [
      a.profiles?.full_name || "",
      a.profiles?.registration_number || "",
      a.attendance_time || "",
      a.attendance_date || "",
      Math.round(a.distance_meters || 0),
      a.is_valid ? "Válida" : "Fora do raio",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `presencas_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Arquivo CSV exportado com sucesso!");
  };

  const exportToPDF = () => {
    toast.info("Funcionalidade de exportação PDF em desenvolvimento");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Presenças de Hoje
            </CardTitle>
            <CardDescription>
              {attendances.length} {attendances.length === 1 ? 'aluno presente' : 'alunos presentes'}
            </CardDescription>
          </div>
          {showExport && attendances.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          )}
        </div>
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