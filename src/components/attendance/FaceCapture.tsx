import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as faceapi from "face-api.js";
import { Camera, Loader2, X } from "lucide-react";

interface FaceCaptureProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const FaceCapture = ({ userId, onSuccess, onCancel }: FaceCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    (async () => {
      await loadModels();
      await startVideo();
    })();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadModels = async () => {
    try {
      console.log("Carregando modelos de reconhecimento facial...");
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/models";
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      console.log("Modelos carregados com sucesso");
      setModelsLoaded(true);
    } catch (error) {
      console.error("Error loading models:", error);
      toast.error("Erro ao carregar modelos de reconhecimento facial");
      setLoading(false);
    }
  };

  const startVideo = async () => {
    try {
      console.log("Solicitando permissão de câmera...");
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Seu navegador não suporta acesso à câmera. Use HTTPS ou localhost.");
        setLoading(false);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      
      console.log("Permissão concedida, iniciando vídeo...");
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        // Wait for video metadata to load
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current!.play();
            console.log("Vídeo iniciado com sucesso");
            setLoading(false);
          } catch (playError) {
            console.error("Erro ao reproduzir vídeo:", playError);
            toast.error("Erro ao iniciar vídeo da câmera");
            setLoading(false);
          }
        };
      }
    } catch (error: any) {
      console.error("Erro ao acessar câmera:", error);
      
      if (error.name === "NotAllowedError") {
        toast.error("Permissão de câmera negada. Por favor, permita o acesso à câmera.");
      } else if (error.name === "NotFoundError") {
        toast.error("Nenhuma câmera encontrada no dispositivo.");
      } else if (error.name === "NotReadableError") {
        toast.error("Câmera está em uso por outro aplicativo.");
      } else {
        toast.error("Erro ao acessar câmera. Verifique se está usando HTTPS ou localhost.");
      }
      
      setLoading(false);
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    setCapturing(true);

    try {
      // Detect face
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("Nenhum rosto detectado. Tente novamente.");
        setCapturing(false);
        return;
      }

      // Get user's saved face descriptor
      const { data: profile } = await supabase
        .from("profiles")
        .select("face_descriptors")
        .eq("id", userId)
        .single();

      if (!profile?.face_descriptors) {
        toast.error("Rosto não cadastrado no sistema");
        setCapturing(false);
        return;
      }

      // Compare faces
      const savedDescriptor = new Float32Array(Object.values(profile.face_descriptors));
      const distance = faceapi.euclideanDistance(savedDescriptor, detection.descriptor);

      if (distance > 0.6) {
        toast.error("Rosto não reconhecido. Tente novamente.");
        setCapturing(false);
        return;
      }

      // Get geolocation
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Get school location
          const { data: schoolLocation } = await supabase
            .from("school_location")
            .select("*")
            .single();

          if (!schoolLocation) {
            toast.error("Localização da escola não configurada");
            setCapturing(false);
            return;
          }

          // Calculate distance
          const distance = calculateDistance(
            latitude,
            longitude,
            schoolLocation.latitude,
            schoolLocation.longitude
          );

          const isValid = distance <= schoolLocation.radius_meters;

          // Save attendance
          const { error } = await supabase.from("attendances").insert({
            student_id: userId,
            latitude,
            longitude,
            is_valid: isValid,
            distance_meters: distance,
          });

          if (error) {
            if (error.code === "23505") {
              toast.error("Você já registrou presença hoje!");
            } else {
              toast.error("Erro ao registrar presença");
            }
            setCapturing(false);
            return;
          }

          if (!isValid) {
            toast.warning(
              `Presença registrada mas você está a ${Math.round(distance)}m da escola (máximo: ${schoolLocation.radius_meters}m)`
            );
          } else {
            toast.success("Presença registrada com sucesso!");
          }

          onSuccess();
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Erro ao obter localização. Verifique as permissões.");
          setCapturing(false);
        }
      );
    } catch (error) {
      console.error("Error capturing face:", error);
      toast.error("Erro ao processar rosto");
      setCapturing(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Registrar Presença
            </CardTitle>
            <CardDescription>
              Posicione seu rosto na câmera para reconhecimento facial
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
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
            </>
          )}
        </div>

        <Button
          className="w-full"
          onClick={captureAndRecognize}
          disabled={loading || !modelsLoaded || capturing}
        >
          {capturing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Capturar e Validar Presença
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FaceCapture;