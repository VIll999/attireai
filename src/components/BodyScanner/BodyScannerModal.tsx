"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { usePoseLandmarker } from "./usePoseLandmarker";
import { calculateMeasurements, DetectedMeasurements } from "./landmarkCalculations";
import { evaluateGuidance, resetGuidance, GuidanceState } from "./poseGuidance";

interface BodyScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  heightCm: number;
  onMeasurementsDetected: (measurements: DetectedMeasurements) => void;
  onColorDetected: (color: {
    skin_tone: string;
    skin_tone_hex: string;
    hair_color: string;
    hair_color_hex: string;
  }) => void;
  onColorError: () => void;
  firebaseUid: string;
}

// Pose skeleton connections for drawing
const POSE_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso sides
  [23, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
];

export default function BodyScannerModal({
  isOpen,
  onClose,
  heightCm,
  onMeasurementsDetected,
  onColorDetected,
  onColorError,
  firebaseUid,
}: BodyScannerModalProps) {
  const { isReady: mediaPipeReady, error: mediaPipeError, detect } = usePoseLandmarker();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastGuidanceRef = useRef<GuidanceState | null>(null);
  const lastLandmarksRef = useRef<any[] | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [guidance, setGuidance] = useState<GuidanceState | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [status, setStatus] = useState<string>("Initializing...");

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setStatus("Loading body detection...");
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setCameraError("Camera access denied. Please allow camera permissions in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found. Please connect a camera and try again.");
      } else {
        setCameraError("Failed to access camera. Please try again.");
      }
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    resetGuidance();
  }, []);

  // Open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  // Detection loop
  useEffect(() => {
    if (!cameraReady || !mediaPipeReady || !isOpen || isCapturing) return;
    setStatus("Stand in front of the camera");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    function loop() {
      if (!running || !video || !canvas || !ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const result = detect(video, performance.now());
      if (result && result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        lastLandmarksRef.current = landmarks;

        // Draw skeleton
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#14b8a6"; // teal
        ctx.lineWidth = 3;

        for (const [start, end] of POSE_CONNECTIONS) {
          const a = landmarks[start];
          const b = landmarks[end];
          if ((a.visibility ?? 0) > 0.3 && (b.visibility ?? 0) > 0.3) {
            ctx.beginPath();
            ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
            ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
            ctx.stroke();
          }
        }

        // Draw joints
        ctx.fillStyle = "#ffffff";
        for (const idx of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
          const lm = landmarks[idx];
          if ((lm.visibility ?? 0) > 0.3) {
            ctx.beginPath();
            ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }

        // Evaluate guidance
        const g = evaluateGuidance(landmarks);
        lastGuidanceRef.current = g;
        setGuidance(g);

        // Auto-capture when ready
        if (g.isReady) {
          running = false;
          handleCapture();
          return;
        }
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setGuidance(null);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [cameraReady, mediaPipeReady, isOpen, isCapturing, detect]);

  // Capture and process
  const handleCapture = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setShowFlash(true);
    setStatus("Processing...");
    setTimeout(() => setShowFlash(false), 300);

    const video = videoRef.current;
    const captureCanvas = captureCanvasRef.current;
    const landmarks = lastLandmarksRef.current;

    if (!video || !captureCanvas) {
      setIsCapturing(false);
      return;
    }

    // Draw the capture frame
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext("2d");
    if (!ctx) { setIsCapturing(false); return; }
    ctx.drawImage(video, 0, 0);

    // 1. Extract measurements from landmarks (local)
    if (landmarks && landmarks.length > 0) {
      const measurements = calculateMeasurements(
        landmarks,
        heightCm,
        video.videoWidth,
        video.videoHeight,
      );
      onMeasurementsDetected(measurements);
    }

    // 2. Send photo to Gemini Vision for color analysis (remote)
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        captureCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
      });

      if (blob) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Strip the data:image/jpeg;base64, prefix
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const API_URL = "/api";
        const response = await fetch(`${API_URL}/vision/analyze-colors`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Firebase-UID": firebaseUid,
          },
          body: JSON.stringify({ photo_base64: base64 }),
        });

        if (response.ok) {
          const colorResult = await response.json();
          onColorDetected(colorResult);
        } else {
          onColorError();
        }
      } else {
        onColorError();
      }
    } catch (err) {
      console.error("Color analysis failed:", err);
      onColorError();
    }

    stopCamera();
    onClose();
  }, [isCapturing, heightCm, firebaseUid, onMeasurementsDetected, onColorDetected, onColorError, stopCamera, onClose]);

  // Manual capture button
  const handleManualCapture = () => {
    if (lastLandmarksRef.current && lastLandmarksRef.current.length > 0) {
      handleCapture();
    }
  };

  if (!isOpen) return null;

  const progressPercent = guidance
    ? Math.min((guidance.stableSeconds / 3) * 100, 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-white text-lg font-semibold">AI Body Scanner</h2>
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="text-white/70 hover:text-white px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Camera area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {cameraError ? (
          <div className="text-center px-8">
            <div className="text-red-400 text-lg mb-4">{cameraError}</div>
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Video feed */}
            <video
              ref={videoRef}
              className="max-h-full max-w-full object-contain"
              playsInline
              muted
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Skeleton overlay canvas */}
            <canvas
              ref={canvasRef}
              className="absolute top-1/2 left-1/2 max-h-full max-w-full object-contain pointer-events-none"
              style={{
                transform: "translate(-50%, -50%) scaleX(-1)",
                width: videoRef.current?.clientWidth,
                height: videoRef.current?.clientHeight,
              }}
            />

            {/* Capture canvas (hidden) */}
            <canvas ref={captureCanvasRef} className="hidden" />

            {/* Flash effect */}
            {showFlash && (
              <div className="absolute inset-0 bg-white/80 animate-pulse pointer-events-none" />
            )}

            {/* Loading overlay */}
            {(!cameraReady || !mediaPipeReady) && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/80">
                    {!cameraReady ? "Starting camera..." : "Loading body detection model..."}
                  </p>
                  {mediaPipeError && (
                    <p className="text-red-400 mt-2 text-sm">{mediaPipeError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Processing overlay */}
            {isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/80">Analyzing measurements and colors...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom guidance panel */}
      <div className="px-6 py-5 bg-black/80 border-t border-white/10">
        {/* Status text */}
        <div className="text-center mb-4">
          {guidance?.poseHint ? (
            <p className="text-yellow-400 text-lg font-medium">{guidance.poseHint}</p>
          ) : guidance?.isReady ? (
            <p className="text-green-400 text-lg font-medium">Capturing...</p>
          ) : (
            <p className="text-white/60 text-lg">{status}</p>
          )}
        </div>

        {/* Checklist */}
        {cameraReady && mediaPipeReady && (
          <div className="flex justify-center gap-6 mb-4">
            <CheckItem label="Full body visible" checked={guidance?.isFullBodyVisible ?? false} />
            <CheckItem label="Facing camera" checked={guidance?.isFacingCamera ?? false} />
            <CheckItem label="Holding still" checked={guidance?.isPoseStable ?? false} />
          </div>
        )}

        {/* Progress bar */}
        {guidance && guidance.stableSeconds > 0 && !guidance.isReady && (
          <div className="w-full max-w-md mx-auto h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Manual capture button */}
        {cameraReady && mediaPipeReady && !isCapturing && (
          <div className="flex justify-center">
            <button
              onClick={handleManualCapture}
              disabled={!lastLandmarksRef.current}
              className="px-6 py-3 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Capture Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${
          checked ? "bg-green-500 text-white" : "bg-white/10 text-white/30"
        }`}
      >
        {checked ? "✓" : ""}
      </div>
      <span className={`text-sm ${checked ? "text-green-400" : "text-white/40"}`}>
        {label}
      </span>
    </div>
  );
}
