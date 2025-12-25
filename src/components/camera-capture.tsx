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
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;

        // Multiple event listeners for better compatibility
        const markReady = () => {
          console.log('✅ Camera ready');
          setIsVideoReady(true);
        };

        videoRef.current.onloadedmetadata = markReady;
        videoRef.current.onloadeddata = markReady;
        videoRef.current.oncanplay = markReady;
        videoRef.current.onplaying = markReady;

        // Fallback: Force ready after 3 seconds if events don't fire
        setTimeout(() => {
          console.log('⏱️ Fallback timeout - forcing camera ready');
          setIsVideoReady(true);
        }, 3000);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      let message = "An unexpected error occurred while trying to access the camera.";
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          message = "Camera access was denied. Please enable camera permissions in your browser settings for this site.";
        } else if (err.name === 'NotFoundError') {
          message = "No camera was found on your device.";
        } else {
          message = `Could not access camera: ${err.message}. Please check browser permissions.`;
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

    // Cleanup function to stop the camera when the component unmounts
    return () => {
      stopCamera();
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    if (!isVideoReady || !videoRef.current) {
      toast({
        variant: 'destructive',
        title: 'Capture Failed',
        description: 'Camera is not ready yet. Please wait a moment.'
      });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    if (canvas.width === 0 || canvas.height === 0) {
      toast({
        variant: 'destructive',
        title: 'Capture Failed',
        description: 'Video dimensions not available. Please wait.'
      });
      return;
    }

    const context = canvas.getContext('2d');
    if (context) {
      // Flip the image horizontally for a mirror effect
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          onCapture(blob); // Pass blob to parent
          stopCamera(); // Stop camera after capture
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleRetake = () => {
    startCamera();
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <Camera className="h-4 w-4" />
        <AlertTitle>Camera Not Available</AlertTitle>
        <AlertDescription>
          {error}
          <Button onClick={startCamera} variant="link" className="p-0 h-auto mt-2 text-destructive">
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="w-full aspect-square bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
            <p className="text-white mt-2">Processing...</p>
          </div>
        )}
        {!isVideoReady && stream && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center z-10">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <p className="text-white mt-2 text-sm">Preparing camera...</p>
          </div>
        )}
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        ) : stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground mt-2">Starting camera...</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {capturedImage ? (
          <Button onClick={handleRetake} variant="outline" className="w-full" disabled={isProcessing}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retake
          </Button>
        ) : (
          <Button onClick={handleCapture} disabled={!isVideoReady || !stream || isProcessing} className="w-full">
            <Camera className="mr-2 h-4 w-4" /> {isVideoReady ? 'Capture' : 'Preparing...'}
          </Button>
        )}
      </div>
    </div>
  );
}
