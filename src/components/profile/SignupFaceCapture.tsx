import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as faceapi from "face-api.js";
import { Camera, Loader2, CheckCircle2, X } from "lucide-react";
import CameraDiagnostic from "@/components/camera/CameraDiagnostic";

interface SignupFaceCaptureProps {
  onCapture: (descriptor: number[]) => void;
  onReset: () => void;
  isCaptured: boolean;
}

const SignupFaceCapture = ({ onCapture, onReset, isCaptured }: SignupFaceCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (showCamera && !showDiagnostic) {
      (async () => {
        await loadModels();
        await startVideo();
      })();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera, showDiagnostic]);

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
      console.log("🎥 Solicitando permissão de câmera...");
      
      // Verificar se videoRef está disponível
      if (!videoRef.current) {
        console.error("❌ Elemento de vídeo não está disponível");
        toast.error("Erro ao inicializar câmera. Tente novamente.");
        setLoading(false);
        return;
      }
      
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
      
      console.log("✅ Permissão concedida, stream obtido");
      setStream(mediaStream);
      
      if (videoRef.current) {
        console.log("📹 Atribuindo stream ao elemento de vídeo...");
        videoRef.current.srcObject = mediaStream;
        
        // Tentar iniciar imediatamente
        try {
          await videoRef.current.play();
          console.log("🎥 Vídeo iniciado com sucesso (play direto)");
          setLoading(false);
        } catch (playError) {
          console.log("⚠️ Play direto falhou, aguardando loadedmetadata...");
          
          // Fallback: aguardar loadedmetadata
          videoRef.current.onloadedmetadata = async () => {
            try {
              if (videoRef.current) {
                await videoRef.current.play();
                console.log("🎥 Vídeo iniciado com sucesso (após loadedmetadata)");
                setLoading(false);
              }
            } catch (metadataPlayError) {
              console.error("❌ Erro ao reproduzir vídeo:", metadataPlayError);
              toast.error("Erro ao iniciar vídeo da câmera");
              setLoading(false);
            }
          };
        }
      } else {
        console.error("❌ videoRef.current não está disponível após obter stream");
        toast.error("Erro ao inicializar vídeo");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("❌ Erro ao acessar câmera:", error);
      
      if (error.name === "NotAllowedError") {
        toast.error("🚫 Permissão de câmera negada. Por favor, permita o acesso à câmera.");
      } else if (error.name === "NotFoundError") {
        toast.error("📷 Nenhuma câmera encontrada no dispositivo.");
      } else if (error.name === "NotReadableError") {
        toast.error("⚠️ Câmera em uso por outro aplicativo.");
      } else {
        toast.error("❌ Erro ao acessar câmera. Verifique se está usando HTTPS ou localhost.");
      }
      
      setLoading(false);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
      toast.error("Câmera ou modelos não estão prontos");
      return;
    }

    setCapturing(true);
    toast.info("Detectando rosto...");

    try {
      // Pause video during capture
      videoRef.current.pause();

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
        toast.error("Nenhum rosto detectado. Posicione seu rosto na câmera e tente novamente.");
        setCapturing(false);
        // Resume video
        if (videoRef.current) {
          videoRef.current.play();
        }
        return;
      }

      // Draw the detected face on canvas for preview
      const canvas = canvasRef.current;
      const displaySize = { 
        width: videoRef.current.videoWidth, 
        height: videoRef.current.videoHeight 
      };
      faceapi.matchDimensions(canvas, displaySize);
      
      const resizedDetections = faceapi.resizeResults(detection, displaySize);
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

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
      toast.error("Erro ao processar rosto. Tente novamente.");
      setCapturing(false);
      // Resume video on error
      if (videoRef.current) {
        videoRef.current.play();
      }
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
            onClick={() => {
              setShowDiagnostic(true);
              setShowCamera(true);
            }}
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

  if (showDiagnostic) {
    return (
      <CameraDiagnostic 
        onSuccess={() => setShowDiagnostic(false)} 
        onCancel={() => {
          setShowDiagnostic(false);
          setShowCamera(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video border-2 border-primary/20">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <p className="text-white text-sm">
              {!modelsLoaded ? "Carregando modelos de reconhecimento..." : "Iniciando câmera..."}
            </p>
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
              Detectando rosto...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              {modelsLoaded ? "Capturar Foto" : "Carregando..."}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SignupFaceCapture;
