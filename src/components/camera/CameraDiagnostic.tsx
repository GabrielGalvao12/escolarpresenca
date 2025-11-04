import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface DiagnosticResult {
  https: boolean;
  mediaDevices: boolean;
  permission: boolean | null;
  cameraAvailable: boolean | null;
}

interface CameraDiagnosticProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

const CameraDiagnostic = ({ onSuccess, onCancel }: CameraDiagnosticProps) => {
  const [checking, setChecking] = useState(true);
  const [results, setResults] = useState<DiagnosticResult>({
    https: false,
    mediaDevices: false,
    permission: null,
    cameraAvailable: null,
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setChecking(true);

    // Check HTTPS
    const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost";

    // Check MediaDevices API
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    setResults({
      https: isHttps,
      mediaDevices: hasMediaDevices,
      permission: null,
      cameraAvailable: null,
    });

    if (!hasMediaDevices) {
      setChecking(false);
      return;
    }

    // Check camera permission and availability
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });

      // Camera is available and permission granted
      setResults(prev => ({
        ...prev,
        permission: true,
        cameraAvailable: true,
      }));

      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());

      setChecking(false);
    } catch (error: any) {
      console.error("Camera diagnostic error:", error);

      setResults(prev => ({
        ...prev,
        permission: error.name === "NotAllowedError" ? false : null,
        cameraAvailable: error.name === "NotFoundError" ? false : null,
      }));

      setChecking(false);
    }
  };

  const allChecksPassed = results.https && results.mediaDevices && results.permission === true && results.cameraAvailable === true;

  const getStatusIcon = (status: boolean | null) => {
    if (status === true) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === false) return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusText = (status: boolean | null) => {
    if (status === true) return "OK";
    if (status === false) return "Falhou";
    return "Não testado";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Diagnóstico de Câmera</CardTitle>
        <CardDescription>
          Verificando requisitos para captura facial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="font-medium">Conexão Segura (HTTPS)</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.https)}
              <span className="text-sm">{getStatusText(results.https)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="font-medium">API de Mídia Disponível</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.mediaDevices)}
              <span className="text-sm">{getStatusText(results.mediaDevices)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="font-medium">Permissão de Câmera</span>
            <div className="flex items-center gap-2">
              {checking && results.permission === null ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                getStatusIcon(results.permission)
              )}
              <span className="text-sm">{getStatusText(results.permission)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="font-medium">Câmera Disponível</span>
            <div className="flex items-center gap-2">
              {checking && results.cameraAvailable === null ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                getStatusIcon(results.cameraAvailable)
              )}
              <span className="text-sm">{getStatusText(results.cameraAvailable)}</span>
            </div>
          </div>
        </div>

        {!checking && !allChecksPassed && (
          <Alert variant="destructive">
            <AlertDescription>
              {!results.https && "⚠️ Use HTTPS ou localhost para acessar a câmera. "}
              {!results.mediaDevices && "❌ Seu navegador não suporta acesso à câmera. "}
              {results.permission === false && "🚫 Permissão de câmera negada. Permita o acesso nas configurações do navegador. "}
              {results.cameraAvailable === false && "📷 Nenhuma câmera encontrada no dispositivo."}
            </AlertDescription>
          </Alert>
        )}

        {allChecksPassed && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              ✅ Todos os requisitos atendidos! Pronto para captura facial.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {!allChecksPassed && !checking && (
            <Button onClick={runDiagnostics} className="w-full">
              Testar Novamente
            </Button>
          )}
          {allChecksPassed && (
            <Button onClick={onSuccess} className="w-full">
              Continuar para Captura
            </Button>
          )}
          {onCancel && (
            <Button onClick={onCancel} variant="outline" className="w-full">
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraDiagnostic;
