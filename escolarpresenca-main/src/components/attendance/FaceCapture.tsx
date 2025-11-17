import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as faceapi from "face-api.js";
import { Camera, Loader2, X, CheckCircle2 } from "lucide-react";
import CameraDiagnostic from "@/components/camera/CameraDiagnostic";

interface FaceCaptureProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const FaceCapture = ({ userId, onSuccess, onCancel }: FaceCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'connecting' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!showDiagnostic) {
      // Aguardar o próximo ciclo de renderização para garantir que o elemento de vídeo existe
      const timer = setTimeout(() => {
        (async () => {
          await loadModels();
          await startVideo();
        })();
      }, 100);
      
      return () => clearTimeout(timer);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showDiagnostic]);

  const loadModels = async () => {
    try {
      console.log("Carregando modelos de reconhecimento facial...");

      // Caminho local (mais rápido e confiável)
      const LOCAL_MODEL_URL = "/models";
      const CDN_MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_MODEL_URL),
        ]);
        console.log("✅ Modelos carregados localmente com sucesso");
      } catch (localError) {
        console.warn("⚠️ Modelos locais não encontrados, tentando CDN...");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_URL),
        ]);
        console.log("✅ Modelos carregados via CDN com sucesso");
      }

      setModelsLoaded(true);
    } catch (error) {
      console.error("❌ Erro ao carregar modelos:", error);
      toast.error("Erro ao carregar modelos de reconhecimento facial");
      setLoading(false);
    }
  };

  const startVideo = async () => {
    try {
      setCameraStatus('connecting');
      console.log("🎥 Solicitando permissão de câmera...");
      
      // Aguardar um pouco mais para garantir que o elemento está no DOM
      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        console.log(`⏳ Aguardando elemento de vídeo (tentativa ${attempts + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // Verificar se videoRef está disponível
      if (!videoRef.current) {
        console.error("❌ Elemento de vídeo não está disponível após 10 tentativas");
        toast.error("Erro: Elemento de vídeo não encontrado. Feche e abra a câmera novamente.");
        setCameraStatus('error');
        setLoading(false);
        return;
      }
      
      console.log("✅ Elemento de vídeo encontrado");
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = "Seu navegador não suporta acesso à câmera ou você não está em HTTPS/localhost.";
        console.error("❌", errorMsg);
        toast.error(errorMsg);
        setCameraStatus('error');
        setLoading(false);
        return;
      }

      console.log("📱 Solicitando stream de vídeo...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      
      console.log("✅ Permissão concedida, stream obtido");
      setStream(mediaStream);
      
      if (videoRef.current) {
        console.log("📹 Atribuindo stream ao elemento de vídeo...");
        videoRef.current.srcObject = mediaStream;
        
        // Tentar iniciar imediatamente
        try {
          await videoRef.current.play();
          console.log("🎥 Vídeo iniciado com sucesso (play direto)");
          setCameraStatus('ready');
          setLoading(false);
        } catch (playError) {
          console.log("⚠️ Play direto falhou, aguardando loadedmetadata...", playError);
          
          // Fallback: aguardar loadedmetadata
          videoRef.current.onloadedmetadata = async () => {
            try {
              if (videoRef.current) {
                await videoRef.current.play();
                console.log("🎥 Vídeo iniciado com sucesso (após loadedmetadata)");
                setCameraStatus('ready');
                setLoading(false);
              }
            } catch (metadataPlayError) {
              console.error("❌ Erro ao reproduzir vídeo:", metadataPlayError);
              toast.error("Erro ao iniciar vídeo. Tente novamente ou use outro navegador.");
              setCameraStatus('error');
              setLoading(false);
            }
          };
          
          // Timeout de segurança
          setTimeout(() => {
            if (loading && videoRef.current && videoRef.current.readyState < 2) {
              console.warn("⚠️ Timeout esperando loadedmetadata, forçando play...");
              videoRef.current.play().catch(err => {
                console.error("❌ Erro no play forçado:", err);
                setCameraStatus('error');
              });
            }
          }, 3000);
        }
      } else {
        console.error("❌ videoRef.current não está disponível após obter stream");
        toast.error("Erro ao inicializar vídeo. Recarregue a página.");
        setCameraStatus('error');
        setLoading(false);
      }
    } catch (error: any) {
      console.error("❌ Erro ao acessar câmera:", error);
      console.error("Erro completo:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      setCameraStatus('error');
      
      if (error.name === "NotAllowedError") {
        toast.error("🚫 Permissão de câmera negada. Clique no ícone de câmera na barra de endereço e permita o acesso.");
      } else if (error.name === "NotFoundError") {
        toast.error("📷 Nenhuma câmera encontrada. Conecte uma câmera e tente novamente.");
      } else if (error.name === "NotReadableError") {
        toast.error("⚠️ Câmera em uso por outro aplicativo. Feche outros programas que usam a câmera.");
      } else if (error.name === "OverconstrainedError") {
        toast.error("⚙️ Configurações de câmera não suportadas. Tentando com configurações padrão...");
        // Tentar novamente com configurações mais simples
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            setStream(simpleStream);
            await videoRef.current.play();
            setCameraStatus('ready');
            setLoading(false);
            toast.success("Câmera iniciada com configurações simplificadas");
            return;
          }
        } catch (retryError) {
          console.error("Erro na segunda tentativa:", retryError);
        }
      } else {
        toast.error(`❌ Erro ao acessar câmera: ${error.message || 'Erro desconhecido'}. Verifique se está em HTTPS/localhost.`);
      }
      
      setLoading(false);
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    setCapturing(true);

    try {
      // Detect face with improved settings
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.5
          })
        )
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

      // Compare faces with improved threshold
      const savedDescriptor = new Float32Array(Object.values(profile.face_descriptors));
      const distance = faceapi.euclideanDistance(savedDescriptor, detection.descriptor);

      console.log("Face recognition distance:", distance);

      // Lower threshold = stricter matching (0.4 is more strict than 0.6)
      if (distance > 0.5) {
        toast.error(`Rosto não reconhecido (confiança: ${(1 - distance).toFixed(2)}). Tente novamente com melhor iluminação.`);
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

  if (showDiagnostic) {
    return (
      <CameraDiagnostic 
        onSuccess={() => setShowDiagnostic(false)} 
        onCancel={onCancel}
      />
    );
  }

  const getCameraStatusIndicator = () => {
    switch (cameraStatus) {
      case 'connecting':
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
            <span className="text-sm font-medium text-yellow-500">Conectando câmera...</span>
          </div>
        );
      case 'ready':
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">Câmera pronta</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
            <X className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Erro na câmera</span>
          </div>
        );
      default:
        return null;
    }
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
        {getCameraStatusIndicator()}
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