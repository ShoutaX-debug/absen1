'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  isProcessing?: boolean;
}

export function CameraCapture({ onCapture, isProcessing = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsVideoReady(false);
  }, [stream]);

  const startCamera = useCallback(async () => {
    // Clean up previous state
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
    setError(null);
    setIsVideoReady(false);

    try {
      // Request camera access
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      setStream(newStream);

      // Note: attachment to videoRef happens in the useEffect below
    } catch (err) {
      console.error("Error accessing camera:", err);
      let message = "An unexpected error occurred while trying to access the camera.";
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          message = "Akses kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.";
        } else if (err.name === 'NotFoundError') {
          message = "Tidak ada kamera ditemukan di perangkat ini.";
        } else {
          message = `Gagal mengakses kamera: ${err.message}.`;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: message
      });
    }
  }, [capturedImage, stopCamera, toast]);


  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (capturedImage) URL.revokeObjectURL(capturedImage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate effect to bind stream to video element whenever it's ready
  useEffect(() => {
      if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;

          const markReady = () => {
            console.log('✅ Camera ready event fired');
            setIsVideoReady(true);
          };

          videoRef.current.onloadedmetadata = markReady;
          videoRef.current.oncanplay = markReady;

          // Force ready safety net
          const timeoutId = setTimeout(() => {
             if (!isVideoReady) {
                 console.log('Force ready triggered');
                 setIsVideoReady(true);
             }
          }, 2000);

          return () => clearTimeout(timeoutId);
      }
  }, [stream, videoRef]);

  const handleCapture = () => {
    if (!isVideoReady || !videoRef.current) {
      toast({ variant: 'destructive', title: 'Capture Failed', description: 'Camera not ready.' });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    if (canvas.width === 0 || canvas.height === 0) return;

    const context = canvas.getContext('2d');
    if (context) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          onCapture(blob);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleRetake = () => {
    startCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const imageUrl = URL.createObjectURL(file);
          setCapturedImage(imageUrl);
          onCapture(file); // Passing File (which is a Blob)
          stopCamera();
      }
  };

  return (
    <div className="w-full space-y-4">
      {/* Fallback File Input (Hidden but accessible via button if camera fails) */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="w-full aspect-square bg-muted rounded-md overflow-hidden relative flex items-center justify-center border shadow-inner">
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
            <p className="text-white mt-2 font-medium">Processing...</p>
          </div>
        )}

        {/* Error State Overlay */}
        {error && !capturedImage && (
             <div className="absolute inset-0 bg-background/90 z-20 flex flex-col items-center justify-center p-4 text-center">
                 <Camera className="h-8 w-8 text-destructive mb-2" />
                 <p className="text-sm font-medium text-destructive mb-4">{error}</p>
                 <Button onClick={() => fileInputRef.current?.click()} variant="default" size="sm">
                     Upload Foto Manual
                 </Button>
                 <Button onClick={startCamera} variant="ghost" size="sm" className="mt-2 text-xs">
                     Coba Kamera Lagi
                 </Button>
             </div>
        )}

        {!isVideoReady && stream && !capturedImage && !error && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center z-10">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <p className="text-white mt-2 text-sm">Menyiapkan kamera...</p>
          </div>
        )}

        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        ) : stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
             {!error && (
                <>
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Memulai kamera...</p>
                </>
             )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {capturedImage ? (
          <Button onClick={handleRetake} variant="default" className="w-full col-span-2" disabled={isProcessing}>
            <RefreshCw className="mr-2 h-4 w-4" /> Foto Ulang
          </Button>
        ) : (
            <>
             <Button
                onClick={handleCapture}
                disabled={!isVideoReady || !stream || isProcessing}
                className="w-full"
                variant="default"
             >
                <Camera className="mr-2 h-4 w-4" /> {isVideoReady ? 'Ambil Foto' : 'Loading...'}
             </Button>

             {/* Manual Upload Button always visible as option */}
             <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full"
             >
                 Upload File
             </Button>
            </>
        )}
      </div>
    </div>
  );
}
