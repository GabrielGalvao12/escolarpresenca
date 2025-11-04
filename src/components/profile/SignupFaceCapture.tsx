import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as faceapi from "face-api.js";
import { Camera, Loader2, CheckCircle2, X } from "lucide-react";

interface SignupFaceCaptureProps {
  onCapture: (descriptor: number[]) => void;
  onReset: () => void;
  isCaptured: boolean;
}

const SignupFaceCapture = ({ onCapture, onReset, isCaptured }: SignupFaceCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (showCamera) {
      loadModels();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  const loadModels = async () => {
    try {
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      setModelsLoaded(true);
      await startVideo();
    } catch (error) {
      console.error("Error loading models:", error);
      toast.error("Erro ao carregar modelos de reconhecimento facial");
    }
  };

  const startVideo = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Erro ao acessar câmera. Verifique as permissões.");
      setLoading(false);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    setCapturing(true);

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("Nenhum rosto detectado. Posicione seu rosto na câmera e tente novamente.");
        setCapturing(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      
      // Stop camera
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      setShowCamera(false);
      onCapture(descriptor);
      toast.success("Foto facial capturada com sucesso!");
    } catch (error) {
      console.error("Error capturing face:", error);
      toast.error("Erro ao processar rosto");
      setCapturing(false);
    }
  };

  const handleReset = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setLoading(true);
    setModelsLoaded(false);
    onReset();
  };

  if (isCaptured) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="font-medium">Foto facial capturada</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            <X className="w-4 h-4 mr-1" />
            Refazer
          </Button>
        </div>
      </div>
    );
  }

  if (!showCamera) {
    return (
      <div className="space-y-2">
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <Camera className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-1">Cadastro Facial Obrigatório</p>
              <p className="text-sm text-muted-foreground">
                Você precisa cadastrar seu rosto para concluir o registro e poder marcar presença futuramente.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setShowCamera(true)}
            className="w-full"
            variant="outline"
          >
            <Camera className="w-4 h-4 mr-2" />
            Abrir Câmera
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video border-2 border-primary/20">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <p className="text-white text-sm">Carregando câmera...</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  const { videoWidth, videoHeight } = videoRef.current;
                  if (canvasRef.current) {
                    canvasRef.current.width = videoWidth;
                    canvasRef.current.height = videoHeight;
                  }
                }
              }}
            />
            <canvas ref={canvasRef} className="absolute top-0 left-0" />
            
            {/* Face guideline overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-60 border-4 border-primary rounded-full opacity-50"></div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Posicione seu rosto no centro da moldura</span>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Certifique-se de estar em um local bem iluminado</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={capturing}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={captureFace}
          disabled={loading || !modelsLoaded || capturing}
        >
          {capturing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Capturando...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Capturar
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SignupFaceCapture;
