import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as faceapi from "face-api.js";
import { Camera, Loader2, CheckCircle2 } from "lucide-react";

interface FaceRegistrationProps {
  userId: string;
  onSuccess: () => void;
}

const FaceRegistration = ({ userId, onSuccess }: FaceRegistrationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    loadModels();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

      // Save face descriptor to database
      const descriptor = Array.from(detection.descriptor);
      
      const { error } = await supabase
        .from("profiles")
        .update({ face_descriptors: descriptor })
        .eq("id", userId);

      if (error) {
        console.error("Error saving face descriptor:", error);
        toast.error("Erro ao salvar rosto");
        setCapturing(false);
        return;
      }

      toast.success("Rosto cadastrado com sucesso!");
      
      // Stop camera
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error capturing face:", error);
      toast.error("Erro ao processar rosto");
      setCapturing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Cadastro Facial
        </CardTitle>
        <CardDescription>
          Posicione seu rosto dentro da moldura e clique em "Capturar" para registrar seu rosto no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video border-4 border-primary/20">
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
                <div className="w-64 h-80 border-4 border-primary rounded-full opacity-50"></div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Posicione seu rosto no centro da moldura</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Certifique-se de estar em um local bem iluminado</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Olhe diretamente para a câmera</span>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={captureFace}
          disabled={loading || !modelsLoaded || capturing}
          size="lg"
        >
          {capturing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Capturar Rosto
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FaceRegistration;
