"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import Notification from "@/components/Notification";
import { getMeasurements, MeasurementResponse } from "@/lib/api";

// Skin tone options with hex colors (updated to match design)
const SKIN_TONES = [
  { name: "Fair", hex: "#FCEBD1" },
  { name: "Light", hex: "#F7D0B2" },
  { name: "Medium", hex: "#E8B999" },
  { name: "Tan", hex: "#C68E65" },
  { name: "Olive", hex: "#B38B67" },
  { name: "Deep", hex: "#6F4F37" },
  { name: "Custom", hex: "", isSpecial: true },
];

// Hair color options
const HAIR_COLORS = [
  { name: "Blonde", hex: "#F9E076" },
  { name: "Red", hex: "#B22222" },
  { name: "Brown", hex: "#4B3621" },
  { name: "Black", hex: "#1A1A1A" },
  { name: "Gray", hex: "#A9A9A9" },
  { name: "Other", hex: "", isSpecial: true },
];

export default function ColorAnalysisPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const measurementIdFromUrl = searchParams.get("measurement_id");

  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [fromMeasurementPage, setFromMeasurementPage] = useState(!!measurementIdFromUrl);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [selectedSkinTone, setSelectedSkinTone] = useState<string | null>(null);
  const [selectedSkinToneHex, setSelectedSkinToneHex] = useState<string | null>(null);
  const [selectedHairColor, setSelectedHairColor] = useState<string | null>(null);
  const [selectedHairColorHex, setSelectedHairColorHex] = useState<string | null>(null);
  const [customSkinTone, setCustomSkinTone] = useState<string>("#E8B999"); // Default medium tone
  const [skinToneSliderValue, setSkinToneSliderValue] = useState<number>(50); // 0-100 range
  const [customHairColor, setCustomHairColor] = useState<string>("#8B4513"); // Default brown color
  const [showSkinTonePicker, setShowSkinTonePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showAlignmentGuide, setShowAlignmentGuide] = useState(false);
  const [alignmentMode, setAlignmentMode] = useState<"camera" | "upload" | null>(null);
  const [tempPhotoPreview, setTempPhotoPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Image transform states
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [showTransitionAnimation, setShowTransitionAnimation] = useState(false);

  // Fetch existing color profile data for a measurement
  const fetchColorProfile = useCallback(async (measurementId: string) => {
    if (!user) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/color-profiles?measurement_id=${measurementId}`,
        {
          headers: {
            "X-Firebase-UID": user.uid,
          },
        }
      );

      if (response.ok) {
        const profiles = await response.json();
        const profile = profiles[0]; // Should only return one profile per measurement
        if (profile) {
          // Load existing data
          setExistingProfileId(profile.id);
          setSelectedSkinTone(profile.skin_tone);
          setSelectedSkinToneHex(profile.skin_tone_hex);
          setSelectedHairColor(profile.hair_color);
          setSelectedHairColorHex(profile.hair_color_hex);
          if (profile.photo_url) {
            setPhotoPreview(profile.photo_url);
          }
        } else {
          setExistingProfileId(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch color profile:", err);
    }
  }, [user]);

  // Initialize measurement ID from URL immediately (no API wait)
  useEffect(() => {
    if (measurementIdFromUrl) {
      // Immediately set the ID and mark as ready
      setSelectedMeasurementId(measurementIdFromUrl);
      setIsLoadingProfiles(false);

      // Load color profile data in background (non-blocking)
      if (user) {
        fetchColorProfile(measurementIdFromUrl);
      }
    }
  }, [measurementIdFromUrl, user, fetchColorProfile]);

  // Fetch measurement profiles only if NOT from measurement page
  const fetchMeasurements = useCallback(async () => {
    if (!user) return;

    // Skip API call if coming from measurement page with URL parameter
    if (measurementIdFromUrl) return;

    setIsLoadingProfiles(true);
    try {
      const data = await getMeasurements(user.uid);
      setMeasurements(data);

      // Auto-select primary or first measurement
      const primary = data.find(m => m.is_primary) || data[0];
      if (primary) {
        setSelectedMeasurementId(primary.id);
        await fetchColorProfile(primary.id);
      }
    } catch (err) {
      console.error("Failed to fetch measurements:", err);
      setError("Failed to load measurement profiles. Please create one first.");
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [user, measurementIdFromUrl, fetchColorProfile]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  // Handle measurement change and load its color data
  const handleMeasurementChange = async (measurementId: string) => {
    setSelectedMeasurementId(measurementId);
    // Clear current selections first
    setSelectedSkinTone(null);
    setSelectedSkinToneHex(null);
    setSelectedHairColor(null);
    setSelectedHairColorHex(null);
    setPhotoPreview(null);
    setUploadedPhoto(null);
    // Then load data for the new measurement
    await fetchColorProfile(measurementId);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Set video stream when camera activates in modal
  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err);
      });
    }
  }, [isCameraActive, stream]);

  // Start animation sequence when modal shows
  useEffect(() => {
    if (!showTransitionAnimation) return;

    console.log('Animation starting...');

    const steps = [
      { id: 1, keyword: 'anim-keyword-1', bg: 'anim-bg-spring', dot: 'anim-dot-1', progress: 25 },
      { id: 2, keyword: 'anim-keyword-2', bg: 'anim-bg-summer', dot: 'anim-dot-2', progress: 50 },
      { id: 3, keyword: 'anim-keyword-3', bg: 'anim-bg-autumn', dot: 'anim-dot-3', progress: 75 },
      { id: 4, keyword: 'anim-keyword-4', bg: 'anim-bg-winter', dot: 'anim-dot-4', progress: 100 }
    ];

    // Clear all keywords first to prevent flashing
    setTimeout(() => {
      console.log('Initializing animation - clearing all keywords');
      steps.forEach((step, index) => {
        const keyword = document.getElementById(step.keyword);
        if (keyword) {
          keyword.classList.remove('active', 'hidden');
          // Set all except first to hidden
          if (index !== 0) {
            keyword.classList.add('hidden');
          }
          console.log(`Cleared ${step.keyword}:`, keyword.className);
        } else {
          console.log(`Could not find ${step.keyword} during initialization`);
        }
      });

      // Initialize first keyword as active
      const firstKeyword = document.getElementById('anim-keyword-1');
      if (firstKeyword) {
        firstKeyword.classList.add('active');
        console.log('First keyword activated:', firstKeyword.className);
      } else {
        console.log('Could not find first keyword!');
      }
    }, 10);

    let currentStepIdx = 0;

    function spawnConvergenceParticles() {
      console.log('Spawning particles...');

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const container = document.getElementById('anim-convergence-container');
        if (!container) {
          console.log('Container not found after RAF!');
          console.log('Document body:', document.body);
          return;
        }

        console.log('Container found:', container);
        const colors = ['#0B5563', '#D4AF37', '#148296', '#C5A028', '#FFFFFF'];

        for (let i = 0; i < 120; i++) {
          const particle = document.createElement('div');
          particle.className = 'anim-particle';

          const edge = Math.floor(Math.random() * 4);
          let startX, startY;
          if(edge === 0) { startX = '-50vw'; startY = (Math.random()*100-50) + 'vh'; }
          else if(edge === 1) { startX = '50vw'; startY = (Math.random()*100-50) + 'vh'; }
          else if(edge === 2) { startX = (Math.random()*100-50) + 'vw'; startY = '-50vh'; }
          else { startX = (Math.random()*100-50) + 'vw'; startY = '50vh'; }

          const color = colors[Math.floor(Math.random() * colors.length)];
          const size = Math.random() * 12 + 4 + 'px';

          particle.style.width = size;
          particle.style.height = size;
          particle.style.backgroundColor = color;
          particle.style.borderRadius = i % 3 === 0 ? '50%' : '2px';
          particle.style.left = '50%';
          particle.style.top = '50%';
          particle.style.setProperty('--start-x', startX);
          particle.style.setProperty('--start-y', startY);
          particle.style.animationDelay = (Math.random() * 0.5) + 's';

          container.appendChild(particle);
        }
        console.log('120 particles created');
      });
    }

    function showSuccessAnimation() {
      console.log('Success animation starting...');

      const headerText = document.getElementById('anim-header-text');
      if (headerText) {
        headerText.style.opacity = '0';
        headerText.style.transform = 'translateY(-20px)';
      }

      const lastKeyword = document.getElementById(steps[steps.length - 1].keyword);
      if (lastKeyword) {
        lastKeyword.classList.remove('active');
        lastKeyword.classList.add('hidden');
      }

      spawnConvergenceParticles();

      setTimeout(() => {
        const finalBg = document.getElementById('anim-bg-final');
        if (finalBg) {
          finalBg.classList.add('active');
          console.log('Final background activated');
        }
      }, 1800);
    }

    function advanceStep() {
      console.log(`Step ${currentStepIdx} -> ${currentStepIdx + 1}`);

      // Check if we should stop (after the last transition is done)
      if (currentStepIdx >= steps.length) {
        console.log('All steps completed, stopping interval');
        return;
      }

      // Check if this is the last step to transition
      if (currentStepIdx >= steps.length - 1) {
        console.log('Reached last step, scheduling success animation');
        setTimeout(showSuccessAnimation, 600);
        currentStepIdx++; // Increment to prevent calling again
        return;
      }

      const current = steps[currentStepIdx];
      const nextIdx = currentStepIdx + 1;
      const next = steps[nextIdx];

      // Transition Keywords - hide current in place, then show next
      const currentText = document.getElementById(current.keyword);
      const nextText = document.getElementById(next.keyword);

      // Hide current in place (opacity to 0 without moving)
      if (currentText) {
        currentText.classList.remove('active');
        currentText.classList.add('hidden');
      }

      // Start the next one immediately
      if (nextText) {
        nextText.classList.remove('hidden');
        nextText.classList.add('active');
        console.log(`Added 'active' to ${next.keyword}`, nextText.className);
      } else {
        console.log(`Could not find element: ${next.keyword}`);
      }

      // Transition Backgrounds
      const currentBg = document.getElementById(current.bg);
      const nextBg = document.getElementById(next.bg);
      if (currentBg) currentBg.classList.remove('active');
      if (nextBg) nextBg.classList.add('active');

      // Update Progress UI
      const progressBar = document.getElementById('anim-main-progress');
      if (progressBar) progressBar.style.width = next.progress + '%';

      const nextDot = document.getElementById(next.dot);
      if (nextDot) {
        nextDot.classList.add('completed');
        nextDot.classList.remove('bg-white/20');
      }

      currentStepIdx = nextIdx;
    }

    const stepInterval = setInterval(advanceStep, 1500);

    // Don't cleanup - let animation run to completion
    return () => {
      console.log('Cleaning up animation...');
      // Only clear interval, don't remove DOM elements
      clearInterval(stepInterval);
    };
  }, [showTransitionAnimation]);

  // Reset image transform
  const resetImageTransform = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview and show alignment guide
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setTempPhotoPreview(result);
        setUploadedPhoto(file);
        setAlignmentMode("upload");
        setShowAlignmentGuide(true);
        resetImageTransform();
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle zoom
  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.1, 0.5));
  };

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tempPhotoPreview || isCameraActive) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Open camera
  const openCamera = async () => {
    setCameraError(null);
    resetImageTransform();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err: any) {
      let errorMessage = "Failed to access camera. Please allow camera permissions in your browser settings.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage = "Camera access denied. Please allow camera permissions in your browser settings and try again.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found. Please connect a camera and try again.";
      }
      setCameraError(errorMessage);
      console.error("Camera error:", err);
    }
  };

  // Close camera
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Take photo from camera
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            setUploadedPhoto(file);
            setPhotoPreview(canvas.toDataURL("image/jpeg"));
            closeCamera();
          }
        }, "image/jpeg");
      }
    }
  };

  // Handle skin tone selection
  const handleSkinToneSelect = (tone: string, hex: string) => {
    setSelectedSkinTone(tone);
    setSelectedSkinToneHex(hex);
  };

  // Handle hair color selection
  const handleHairColorSelect = (color: string, hex: string) => {
    setSelectedHairColor(color);
    setSelectedHairColorHex(hex);
  };

  // Convert slider value to skin tone color (from lightest to darkest)
  const getSkinToneFromSlider = (value: number): string => {
    // Define skin tone range from lightest to darkest
    const lightestTone = { r: 252, g: 235, b: 209 }; // #FCEBD1
    const darkestTone = { r: 61, g: 40, b: 23 }; // #3D2817

    // Interpolate between lightest and darkest
    const percent = value / 100;
    const r = Math.round(lightestTone.r + (darkestTone.r - lightestTone.r) * percent);
    const g = Math.round(lightestTone.g + (darkestTone.g - lightestTone.g) * percent);
    const b = Math.round(lightestTone.b + (darkestTone.b - lightestTone.b) * percent);

    // Convert to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  };

  // Handle custom skin tone slider change
  const handleSkinToneSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSkinToneSliderValue(value);
    const newColor = getSkinToneFromSlider(value);
    setCustomSkinTone(newColor);
  };

  // Open skin tone picker modal
  const handleOpenSkinTonePicker = () => {
    setShowSkinTonePicker(true);
  };

  // Close skin tone picker and apply color
  const handleApplySkinTone = () => {
    setSelectedSkinTone("Custom");
    setSelectedSkinToneHex(customSkinTone);
    setShowSkinTonePicker(false);
  };

  // Handle custom hair color selection
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomHairColor(newColor);
  };

  // Open color picker modal
  const handleOpenColorPicker = () => {
    setShowColorPicker(true);
  };

  // Close color picker and apply color
  const handleApplyColor = () => {
    setSelectedHairColor("Other");
    setSelectedHairColorHex(customHairColor);
    setShowColorPicker(false);
  };

  // Handle proceed to analysis
  const handleProceed = async () => {
    // Validation
    if (!selectedMeasurementId) {
      setError("Please select a measurement profile first.");
      return;
    }

    if (!selectedSkinTone && !uploadedPhoto) {
      setError("Please select a skin tone or upload a photo.");
      return;
    }

    setError("");
    setSuccessMessage("");

    // Show transition animation immediately
    setShowTransitionAnimation(true);

    try {
      // Parallel execution: animation + data processing
      const [, savedProfile] = await Promise.all([
        // Minimum animation duration (10 seconds total: 4 steps * 1.5s + 1.5s wait + 2s particles + 1.5s gradient)
        new Promise(resolve => setTimeout(resolve, 10000)),

        // Backend data processing
        (async () => {
          // TODO: Upload photo to S3 if exists
          let photoUrl = null;
          if (uploadedPhoto) {
            console.log("Photo upload not implemented yet");
          }

          if (!user?.uid) {
            throw new Error("Not authenticated");
          }

          // Save color profile to backend
          const profileData = {
            measurement_id: selectedMeasurementId,
            skin_tone: selectedSkinTone,
            skin_tone_hex: selectedSkinToneHex,
            hair_color: selectedHairColor,
            hair_color_hex: selectedHairColorHex,
            photo_url: photoUrl,
          };

          let response;
          if (existingProfileId) {
            response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/color-profiles/${existingProfileId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-Firebase-UID": user.uid,
              },
              body: JSON.stringify(profileData),
            });
          } else {
            response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/color-profiles`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Firebase-UID": user.uid,
              },
              body: JSON.stringify(profileData),
            });
          }

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "Failed to save color profile");
          }

          return await response.json();
        })()
      ]);

      // Animation complete and data saved, redirect to results
      router.push("/color-results");

    } catch (err: any) {
      console.error("Error saving color profile:", err);
      setError(err.message || "Failed to save color profile");
      setShowTransitionAnimation(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#FAFAFC] dark:bg-stone-950">
      {/* Custom Slider Styles */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 4px solid #0B5563;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        input[type="range"]::-moz-range-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 4px solid #0B5563;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
      `}</style>

      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-full h-full -z-10 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(11, 85, 99, 0.12) 0%, transparent 60%)" }}></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] -z-10 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, transparent 100%)", filter: "blur(100px)" }}></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-[float_5s_ease-in-out_infinite]"></div>

      {/* Persistent Navigation */}
      <header className="w-full px-6 lg:px-12 py-6 relative z-50 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="w-8 h-8 rounded-lg bg-brand dark:bg-brand-400 flex items-center justify-center text-white dark:text-gray-900 shadow-glow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="font-cabinet font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">AttireAI</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 lg:py-12">
        {/* Progress Stepper */}
        <div className="w-full max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[37.5%] h-1 bg-brand dark:bg-brand-400 -z-10 rounded-full"></div>

            {/* Step 1 (Body Size - Completed) */}
            <Link href="/measurements" className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-brand dark:text-brand-400 uppercase tracking-widest">Body Size</span>
            </Link>

            {/* Step 1.5 (Color Capture - Active) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-stone-900 border-4 border-brand dark:border-brand-400 text-brand dark:text-brand-400 flex items-center justify-center shadow-glow relative">
                <span className="absolute inset-0 rounded-full border border-brand dark:border-brand-400 animate-ping opacity-30"></span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Color Capture</span>
            </div>

            {/* Step 2 (Color Results - Inactive) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Analysis</span>
            </div>

            {/* Step 3 (Virtual Try-on - Inactive) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Try-on</span>
            </div>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 max-w-3xl mx-auto">
            <Notification
              type="error"
              variant="inline"
              message={error}
              onClose={() => setError("")}
              dismissible
            />
          </div>
        )}
        {successMessage && (
          <div className="mb-6 max-w-3xl mx-auto">
            <Notification
              type="success"
              variant="inline"
              message={successMessage}
              onClose={() => setSuccessMessage("")}
              dismissible
              autoClose={3000}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          {/* Left Column: AI Photo Path */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-panel rounded-[2.5rem] p-6 shadow-glass border-white/90 dark:border-stone-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand dark:text-brand-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-cabinet font-extrabold text-2xl text-gray-900 dark:text-white">AI Quick-Scan</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Most accurate analysis</p>
                </div>
              </div>

              {/* Camera View Section */}
              <div className="relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden bg-gray-900 mb-6">
                {isCameraActive && !showAlignmentGuide ? (
                  /* Camera Active (only when modal not open) */
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {/* Camera HUD */}
                    <div className="absolute inset-0 flex flex-col justify-between p-6">
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-t-2 border-l-2 border-white/60"></div>
                        <div className="w-8 h-8 border-t-2 border-r-2 border-white/60"></div>
                      </div>
                      <div className="text-center">
                        <p className="text-white text-xs font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md px-4 py-2 rounded-full inline-block">
                          Position face in frame
                        </p>
                      </div>
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-b-2 border-l-2 border-white/60"></div>
                        <div className="w-8 h-8 border-b-2 border-r-2 border-white/60"></div>
                      </div>
                    </div>
                  </div>
                ) : photoPreview ? (
                  /* Photo Preview */
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  /* Placeholder State */
                  <>
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80"
                      className="w-full h-full object-cover opacity-60 grayscale-[40%]"
                      alt="Camera Preview"
                    />
                    <div className="absolute inset-0 border-[20px] border-white/5"></div>
                    {/* Scanning Line */}
                    <div className="absolute left-0 w-full h-[3px] bg-brand shadow-[0_0_20px_4px_rgba(11,85,99,0.6)] animate-[scan_3s_ease-in-out_infinite]"></div>
                    {/* Overlay HUD */}
                    <div className="absolute inset-0 flex flex-col justify-between p-8">
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-t-2 border-l-2 border-white/60"></div>
                        <div className="w-8 h-8 border-t-2 border-r-2 border-white/60"></div>
                      </div>
                      <div className="text-center">
                        <p className="text-white text-xs font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md px-4 py-2 rounded-full inline-block">
                          Position face in frame
                        </p>
                      </div>
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-b-2 border-l-2 border-white/60"></div>
                        <div className="w-8 h-8 border-b-2 border-r-2 border-white/60"></div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {isCameraActive ? (
                  <>
                    <button
                      onClick={takePhoto}
                      className="w-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow active:scale-[0.98]"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Take Photo
                    </button>
                    <button
                      onClick={closeCamera}
                      className="w-full bg-white dark:bg-stone-800 text-gray-600 dark:text-gray-300 border-2 border-gray-200 dark:border-stone-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-stone-700 transition-all"
                    >
                      Cancel
                    </button>
                  </>
                ) : photoPreview ? (
                  <>
                    <button
                      onClick={() => {
                        setUploadedPhoto(null);
                        setPhotoPreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all active:scale-[0.98]"
                    >
                      Remove Photo
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        // Start camera first, then show modal
                        setAlignmentMode("camera");
                        await openCamera();
                        // Only show modal after camera is ready
                        setShowAlignmentGuide(true);
                      }}
                      className="w-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow active:scale-[0.98]"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Open Live Camera
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-white dark:bg-stone-800 text-brand dark:text-brand-400 border-2 border-brand/20 dark:border-brand/30 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand/5 dark:hover:bg-stone-700 transition-all cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </>
                )}
              </div>

              {/* Hidden canvas for photo capture */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Info Panel */}
            <div className="glass-panel rounded-3xl p-6 border-brand/10 dark:border-stone-700/50 flex items-center gap-4">
              <svg className="w-6 h-6 text-brand dark:text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                Natural lighting works best. Ensure your face is clearly visible without heavy makeup or filters for the most accurate palette detection.
              </p>
            </div>
          </div>

          {/* Right Column: Manual Selection */}
          <div className="lg:col-span-7 flex flex-col gap-10">
            {/* Measurement Profile Selector - Only show if NOT from measurement page and not loading */}
            {!isLoadingProfiles && !fromMeasurementPage && measurements.length > 0 ? (
              <div className="glass-panel rounded-3xl p-6 border-brand/10 dark:border-stone-700/50">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Select Measurement Profile <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMeasurementId || ""}
                  onChange={(e) => handleMeasurementChange(e.target.value)}
                  className="w-full bg-white/90 dark:bg-stone-800/50 border border-gray-200 dark:border-stone-700 text-gray-900 dark:text-white rounded-xl px-4 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-brand-400 transition-shadow shadow-sm appearance-none bg-[length:1.5rem] bg-[right_0.75rem_center] bg-no-repeat"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
                  }}
                >
                  {measurements.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.is_primary && "(Primary)"}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Color analysis will be linked to this measurement profile
                </p>
              </div>
            ) : !isLoadingProfiles && !fromMeasurementPage && measurements.length === 0 ? (
              <div className="glass-panel rounded-3xl p-6 border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">
                      No Measurement Profile Found
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Please create a measurement profile first before continuing with color analysis.
                    </p>
                  </div>
                  <Link
                    href="/measurements"
                    className="px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-700 dark:hover:bg-amber-600 transition-all whitespace-nowrap"
                  >
                    Create Profile
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Header */}
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl lg:text-5xl font-cabinet font-extrabold text-gray-900 dark:text-white leading-tight">
                Or Choose Your <span className="text-brand dark:text-brand-400">Natural Tones</span>
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                Manually select the shades that best match your unique features.
              </p>
            </div>

            {/* Skin Tone Grid */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white tracking-tight">Skin Tone Profile</h3>
                <span className="text-[10px] font-black text-brand dark:text-brand-400 bg-brand/10 dark:bg-brand/20 px-3 py-1 rounded-full uppercase tracking-widest">
                  Saturated Modern Palette
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone.name}
                    onClick={() => tone.isSpecial ? handleOpenSkinTonePicker() : handleSkinToneSelect(tone.name, tone.hex)}
                    className={`flex flex-col items-center gap-2 group cursor-pointer transition-all ${
                      selectedSkinTone === tone.name ? "scale-110" : ""
                    }`}
                  >
                    <div className="relative">
                      <div
                        className={`w-16 h-16 rounded-full shadow-md border-2 transition-all group-hover:scale-110 active:scale-95 flex items-center justify-center ${
                          selectedSkinTone === tone.name
                            ? "border-brand dark:border-brand-400 shadow-[0_0_15px_rgba(11,85,99,0.3)]"
                            : "border-white dark:border-stone-700"
                        } ${!tone.isSpecial ? "" : selectedSkinTone === "Custom" ? "" : "bg-brand dark:bg-brand-400"}`}
                        style={
                          tone.isSpecial && selectedSkinTone === "Custom"
                            ? { backgroundColor: customSkinTone }
                            : !tone.isSpecial
                            ? { backgroundColor: tone.hex }
                            : {}
                        }
                      >
                        {tone.isSpecial && (
                          <svg className="w-6 h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        )}
                      </div>
                      {selectedSkinTone === tone.name && (
                        <div
                          className="absolute -inset-2 rounded-full blur-md opacity-100 transition-opacity"
                          style={{ backgroundColor: tone.isSpecial ? `${customSkinTone}20` : `${tone.hex}20` }}
                        ></div>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      {tone.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Hair Color Grid */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="font-cabinet font-bold text-xl text-gray-900 dark:text-white tracking-tight">Hair Color</h3>
                <span className="text-[10px] font-black text-brand dark:text-brand-400 bg-brand/10 dark:bg-brand/20 px-3 py-1 rounded-full uppercase tracking-widest">
                  High Saturated Tones
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {HAIR_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => color.isSpecial ? handleOpenColorPicker() : handleHairColorSelect(color.name, color.hex)}
                    className={`flex flex-col items-center gap-2 group cursor-pointer transition-all ${
                      selectedHairColor === color.name ? "scale-110" : ""
                    }`}
                  >
                    <div
                      className={`w-16 h-16 rounded-[1.5rem] shadow-md border-2 transition-all group-hover:scale-110 group-hover:rotate-6 active:scale-95 flex items-center justify-center ${
                        selectedHairColor === color.name
                          ? "border-brand dark:border-brand-400 shadow-[0_0_15px_rgba(11,85,99,0.3)]"
                          : "border-white dark:border-stone-700"
                      } ${!color.isSpecial ? "" : selectedHairColor === "Other" ? "" : "bg-brand dark:bg-brand-400"}`}
                      style={
                        color.isSpecial && selectedHairColor === "Other"
                          ? { backgroundColor: customHairColor }
                          : !color.isSpecial
                          ? { backgroundColor: color.hex }
                          : {}
                      }
                    >
                      {color.isSpecial && (
                        <svg className="w-6 h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 4V2" />
                          <path d="M15 16v-2" />
                          <path d="M8 9h2" />
                          <path d="M20 9h2" />
                          <path d="M17.8 11.8 19 13" />
                          <path d="M15 9h.01" />
                          <path d="M17.8 6.2 19 5" />
                          <path d="m3 21 9-9" />
                          <path d="M12.2 6.2 11 5" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto pt-10 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/measurements"
                className="w-full sm:w-auto px-10 py-4 rounded-full font-bold text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand-400 hover:bg-brand/5 dark:hover:bg-brand/10 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Size
              </Link>
              <button
                onClick={handleProceed}
                disabled={isSaving || (!selectedSkinTone && !uploadedPhoto)}
                className="w-full sm:w-auto px-12 py-4 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 font-bold text-lg hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow hover:translate-y-[-2px] active:translate-y-0 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isSaving ? "Saving..." : "Proceed to Analysis"}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Custom Skin Tone Picker Modal */}
      {showSkinTonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeInUp_0.3s_ease-out_forwards]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSkinTonePicker(false)}
          ></div>

          {/* Modal */}
          <div className="relative glass-panel rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full border-white/90 dark:border-stone-700/50 animate-[fadeInUp_0.4s_ease-out_forwards]">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-cabinet font-extrabold text-2xl text-gray-900 dark:text-white">
                  Choose Custom Skin Tone
                </h3>
                <button
                  onClick={() => setShowSkinTonePicker(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Color Preview */}
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-[2rem] shadow-lg border-4 border-white dark:border-stone-700 flex items-center justify-center"
                  style={{ backgroundColor: customSkinTone }}
                >
                  <svg className="w-8 h-8 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Selected Tone</p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase">{customSkinTone}</p>
                </div>
              </div>

              {/* Skin Tone Slider */}
              <div className="flex flex-col gap-4">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Slide to Match Your Skin Tone
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Light</span>
                  <div className="relative flex-1 h-12 rounded-full overflow-hidden">
                    {/* Gradient Background */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'linear-gradient(to right, #FCEBD1 0%, #F7D0B2 16%, #E8B999 33%, #C68E65 50%, #B38B67 66%, #6F4F37 83%, #3D2817 100%)',
                      }}
                    ></div>
                    {/* Slider Input */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skinToneSliderValue}
                      onChange={handleSkinToneSliderChange}
                      className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer z-10"
                      style={{
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Deep</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSkinTonePicker(false)}
                  className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-100 dark:hover:bg-stone-800 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySkinTone}
                  className="flex-1 px-6 py-3 bg-brand dark:bg-brand-400 text-white dark:text-gray-900 rounded-2xl font-bold text-sm hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow active:scale-[0.98]"
                >
                  Apply Tone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeInUp_0.3s_ease-out_forwards]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowColorPicker(false)}
          ></div>

          {/* Modal */}
          <div className="relative glass-panel rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full border-white/90 dark:border-stone-700/50 animate-[fadeInUp_0.4s_ease-out_forwards]">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-cabinet font-extrabold text-2xl text-gray-900 dark:text-white">
                  Choose Custom Color
                </h3>
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Color Preview */}
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-[2rem] shadow-lg border-4 border-white dark:border-stone-700 flex items-center justify-center"
                  style={{ backgroundColor: customHairColor }}
                >
                  <svg className="w-8 h-8 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 4V2" />
                    <path d="M15 16v-2" />
                    <path d="M8 9h2" />
                    <path d="M20 9h2" />
                    <path d="M17.8 11.8 19 13" />
                    <path d="M15 9h.01" />
                    <path d="M17.8 6.2 19 5" />
                    <path d="m3 21 9-9" />
                    <path d="M12.2 6.2 11 5" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Selected Color</p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase">{customHairColor}</p>
                </div>
              </div>

              {/* Color Input */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Pick Your Hair Color
                </label>
                <div className="relative">
                  <input
                    type="color"
                    value={customHairColor}
                    onChange={handleCustomColorChange}
                    className="w-full h-16 rounded-[2rem] cursor-pointer border-4 border-white dark:border-stone-700 shadow-md"
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      backgroundColor: customHairColor,
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-100 dark:hover:bg-stone-800 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyColor}
                  className="flex-1 px-6 py-3 bg-brand dark:bg-brand-400 text-white dark:text-gray-900 rounded-2xl font-bold text-sm hover:bg-brand-600 dark:hover:bg-brand-500 transition-all shadow-glow active:scale-[0.98]"
                >
                  Apply Color
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Alignment Guide Modal */}
      {showAlignmentGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-2xl w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/90 dark:border-stone-700/50">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-cabinet font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                  <svg className="w-7 h-7 text-brand dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Photo Alignment & Calibration
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                  For the most accurate color analysis, please align your face with the visual guides below.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAlignmentGuide(false);
                  setTempPhotoPreview(null);
                  setUploadedPhoto(null);
                  setCameraError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  if (isCameraActive) {
                    closeCamera();
                  }
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row">
              {/* Left: Interactive Crop Area */}
              <div className="lg:w-3/5 p-6 md:p-10 bg-gray-50 dark:bg-stone-800/50 flex items-center justify-center">
                <div
                  className="relative w-full max-w-[400px] aspect-[4/5] rounded-3xl overflow-hidden bg-gray-900 shadow-2xl select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: (tempPhotoPreview || isCameraActive) ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                >
                  {/* Zoom Controls - Only show when photo/camera active */}
                  {(tempPhotoPreview || isCameraActive) && (
                    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                      <button
                        onClick={handleZoomIn}
                        className="w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-lg"
                        title="Zoom In"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-lg"
                        title="Zoom Out"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                        </svg>
                      </button>
                      <button
                        onClick={resetImageTransform}
                        className="w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-lg"
                        title="Reset"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Camera Preview, Uploaded Photo, or Placeholder */}
                  {isCameraActive && stream ? (
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && stream) {
                          el.srcObject = stream;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{
                        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale}) scaleX(-1)`,
                        transformOrigin: 'center',
                        zIndex: 1
                      }}
                    />
                  ) : tempPhotoPreview ? (
                    <img
                      src={tempPhotoPreview}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{
                        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                        transformOrigin: 'center',
                        zIndex: 1
                      }}
                    />
                  ) : cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/30 p-8 gap-6 z-[1]">
                      <svg className="w-20 h-20 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <div className="text-center space-y-3">
                        <h4 className="text-white font-bold text-lg">Camera Access Denied</h4>
                        <p className="text-red-300 text-sm max-w-xs leading-relaxed">
                          {cameraError}
                        </p>
                      </div>
                      <button
                        onClick={openCamera}
                        className="mt-4 px-6 py-3 bg-brand hover:bg-brand-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand/5 z-[1]">
                      {/* Human Silhouette SVG */}
                      <svg viewBox="0 0 200 250" className="w-4/5 h-4/5 text-brand/20 fill-none stroke-current stroke-[2]" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100,45 c-35,0 -55,30 -55,70 c0,45 20,80 55,80 s55,-35 55,-80 c0,-40 -20,-70 -55,-70 Z" />
                        <path d="M20,230 c0,-40 30,-60 80,-60 s80,20 80,60" />
                      </svg>
                    </div>
                  )}

                  {/* Positioning Guides Overlay - Professional Design */}
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {/* Gradient Overlay - Only show when no photo/camera to create depth */}
                    {!tempPhotoPreview && !isCameraActive && (
                      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.3) 100%)" }}></div>
                    )}

                    {/* Head Guide Oval - Refined */}
                    <div className="absolute top-[12%] left-[50%] -translate-x-1/2 w-[65%] h-[50%]">
                      <div className={`w-full h-full rounded-[100%] border-[2px] border-dashed relative ${
                        (tempPhotoPreview || isCameraActive)
                          ? "border-white/90"
                          : "border-brand/70 dark:border-brand-400/70"
                      }`} style={{
                        filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.4))',
                        animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}>
                        {/* Center horizontal line inside oval */}
                        <div className={`absolute top-1/2 left-4 right-4 h-[1px] ${
                          (tempPhotoPreview || isCameraActive) ? "bg-white/30" : "bg-brand/20"
                        }`}></div>
                      </div>
                    </div>

                    {/* Eye Level Guide - Precise */}
                    <div className="absolute top-[35%] left-[12%] right-[12%]">
                      <div className={`relative h-[2px] ${
                        (tempPhotoPreview || isCameraActive)
                          ? "bg-gradient-to-r from-transparent via-white to-transparent"
                          : "bg-gradient-to-r from-transparent via-brand to-transparent"
                      }`} style={{
                        filter: (tempPhotoPreview || isCameraActive)
                          ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
                          : 'drop-shadow(0 0 8px rgba(11, 85, 99, 0.6))'
                      }}>
                        {/* Left Eye Marker */}
                        <div className={`absolute left-[28%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${
                          (tempPhotoPreview || isCameraActive)
                            ? "bg-white border-2 border-white/50"
                            : "bg-brand border-2 border-brand/50"
                        }`} style={{
                          boxShadow: (tempPhotoPreview || isCameraActive)
                            ? '0 0 12px rgba(255, 255, 255, 0.8), inset 0 0 4px rgba(255, 255, 255, 0.5)'
                            : '0 0 12px rgba(11, 85, 99, 0.8), inset 0 0 4px rgba(11, 85, 99, 0.5)'
                        }}></div>
                        {/* Right Eye Marker */}
                        <div className={`absolute right-[28%] top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full ${
                          (tempPhotoPreview || isCameraActive)
                            ? "bg-white border-2 border-white/50"
                            : "bg-brand border-2 border-brand/50"
                        }`} style={{
                          boxShadow: (tempPhotoPreview || isCameraActive)
                            ? '0 0 12px rgba(255, 255, 255, 0.8), inset 0 0 4px rgba(255, 255, 255, 0.5)'
                            : '0 0 12px rgba(11, 85, 99, 0.8), inset 0 0 4px rgba(11, 85, 99, 0.5)'
                        }}></div>
                      </div>
                    </div>

                    {/* Shoulder Guide - Elegant Arc */}
                    <div className="absolute bottom-0 left-[50%] -translate-x-1/2 w-[85%] h-[18%]">
                      <div className={`w-full h-full border-t-[2px] border-dashed rounded-t-[100%] ${
                        (tempPhotoPreview || isCameraActive)
                          ? "border-white/80"
                          : "border-brand/60 dark:border-brand-400/60"
                      }`} style={{
                        filter: (tempPhotoPreview || isCameraActive)
                          ? 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.4))'
                          : 'drop-shadow(0 0 10px rgba(11, 85, 99, 0.3))'
                      }}></div>
                    </div>

                    {/* Scanning Line - Sleek */}
                    <div className={`absolute left-0 w-full h-[2px] animate-[scan_3s_ease-in-out_infinite] ${
                      (tempPhotoPreview || isCameraActive)
                        ? "bg-gradient-to-r from-transparent via-white to-transparent"
                        : "bg-gradient-to-r from-transparent via-brand to-transparent"
                    }`} style={{
                      filter: (tempPhotoPreview || isCameraActive)
                        ? 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))'
                        : 'drop-shadow(0 0 16px rgba(11, 85, 99, 0.9)) drop-shadow(0 0 8px rgba(11, 85, 99, 0.6))'
                    }}></div>

                    {/* Corner Brackets - Modern & Clean */}
                    <div className="absolute top-4 left-4 w-12 h-12">
                      <div className={`absolute top-0 left-0 w-full h-[3px] rounded-r-sm ${
                        (tempPhotoPreview || isCameraActive) ? "bg-white/90" : "bg-brand/70"
                      }`} style={{ width: '60%', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))' }}></div>
                      <div className={`absolute top-0 left-0 h-full w-[3px] rounded-b-sm ${
                        (tempPhotoPreview || isCameraActive) ? "bg-white/90" : "bg-brand/70"
                      }`} style={{ height: '60%', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))' }}></div>
                    </div>
                    <div className="absolute top-4 right-4 w-12 h-12">
                      <div className={`absolute top-0 right-0 w-full h-[3px] rounded-l-sm ${
                        (tempPhotoPreview || isCameraActive) ? "bg-white/90" : "bg-brand/70"
                      }`} style={{ width: '60%', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))' }}></div>
                      <div className={`absolute top-0 right-0 h-full w-[3px] rounded-b-sm ${
                        (tempPhotoPreview || isCameraActive) ? "bg-white/90" : "bg-brand/70"
                      }`} style={{ height: '60%', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))' }}></div>
                    </div>
                    <div className="absolute bottom-4 left-4 w-12 h-12">
                      <div className={`absolute bottom-0 left-0 w-full h-[3px] rounded-r-sm ${
                        (tempPhotoPreview || isCameraActive) ? "bg-white/90" : "bg-brand/70"
                      }`} style={{ width: '60%', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))' }}></div>
                      <div className={`absolute bottom-0 left-0 h-full w-[3px] rounded-t-sm ${
                        (tempPhotoPreview || isCameraActive) ? "bg-white/90" : "bg-brand/70"
                      }`} style={{ height: '60%', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))' }}></div>
                    </div>
                    <div className="absolute bottom-4 right-4 w-12 h-12">
                      <div className={`absolute bottom-0 right-0 w-full h-[3px] rounded-l-sm ${
                        (tempPhotoPreview || isCameraActive) ? "bg-white/90" : "bg-brand/70"
                      }`} style={{ width: '60%', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))' }}></div>
                      <div className={`absolute bottom-0 right-0 h-full w-[3px] rounded-t-sm ${
                        (tempPhotoPreview || isCameraActive) ? "bg-white/90" : "bg-brand/70"
                      }`} style={{ height: '60%', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))' }}></div>
                    </div>
                  </div>

                  {/* Center Focus Text - Only show when no photo and no camera */}
                  {!tempPhotoPreview && !isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <div className="bg-black/50 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20">
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Face Alignment Zone</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Instructions Panel */}
              <div className="lg:w-2/5 p-8 md:p-10 flex flex-col justify-between">
                <div className="space-y-10">
                  <div>
                    <h3 className="text-xs font-black text-brand dark:text-brand-400 uppercase tracking-widest mb-6">
                      {(tempPhotoPreview || isCameraActive) ? "Check Your Alignment" : "Alignment Instructions"}
                    </h3>
                    <div className="space-y-6">
                      {/* Step 1 */}
                      <div className="flex gap-5 items-start">
                        <div className="w-8 h-8 rounded-full bg-brand dark:bg-brand-400 text-white dark:text-gray-900 flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-lg">
                          1
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">Head Alignment</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            {(tempPhotoPreview || isCameraActive)
                              ? "Verify your face is centered within the dashed oval with space above your head."
                              : "Ensure your face is centered within the dashed oval, leaving a small space above the crown."
                            }
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex gap-5 items-start">
                        <div className="w-8 h-8 rounded-full bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          2
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">Eye Level</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            {(tempPhotoPreview || isCameraActive)
                              ? "Check that your eyes align with the horizontal line and circular markers."
                              : "Keep your eyes level and aligned with the horizontal guide and circular indicators."
                            }
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-5 items-start">
                        <div className="w-8 h-8 rounded-full bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          3
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">Shoulder Frame</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            {(tempPhotoPreview || isCameraActive)
                              ? "Confirm your shoulders are visible at the bottom of the frame."
                              : "Include your shoulder line at the bottom to help the AI determine accurate body proportions."
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quality Warning */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-2xl p-4 flex gap-4">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                      Tip: Use natural lighting and avoid dark shadows to ensure the most accurate color analysis.
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-12 flex gap-4">
                  <button
                    onClick={() => {
                      if (tempPhotoPreview && alignmentMode === "upload") {
                        // Retake photo - clear and trigger file input again
                        setTempPhotoPreview(null);
                        setUploadedPhoto(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                          fileInputRef.current.click();
                        }
                      } else {
                        // Cancel completely
                        setShowAlignmentGuide(false);
                        setTempPhotoPreview(null);
                        setUploadedPhoto(null);
                        setCameraError(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                        // Close camera if active
                        if (isCameraActive) {
                          closeCamera();
                        }
                      }
                    }}
                    className="flex-1 py-4 border-2 border-gray-100 dark:border-stone-700 rounded-2xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-stone-800 transition-all"
                  >
                    {tempPhotoPreview && alignmentMode === "upload" ? "Retake Photo" : "Cancel"}
                  </button>
                  <button
                    onClick={() => {
                      if (alignmentMode === "camera" && isCameraActive) {
                        // Take photo from camera
                        takePhoto();
                        setShowAlignmentGuide(false);
                      } else if (alignmentMode === "upload" && tempPhotoPreview) {
                        // Confirm the uploaded photo
                        setPhotoPreview(tempPhotoPreview);
                        setTempPhotoPreview(null);
                        setShowAlignmentGuide(false);
                      }
                    }}
                    className="flex-1 py-4 bg-brand dark:bg-brand-400 text-white dark:text-gray-900 rounded-2xl font-bold shadow-glow hover:bg-brand-600 dark:hover:bg-brand-500 transition-all"
                  >
                    {alignmentMode === "camera" && isCameraActive ? "Take Photo" : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transition Animation Modal */}
      {showTransitionAnimation && (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes anim-vortex {
              0% { transform: translate(var(--start-x), var(--start-y)) rotate(0deg) scale(1); opacity: 0; }
              20% { opacity: 1; }
              80% { opacity: 1; }
              100% { transform: translate(-50%, -50%) rotate(720deg) scale(0); opacity: 0; }
            }
            .anim-particle {
              position: absolute;
              pointer-events: none;
              animation: anim-vortex 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            .anim-season-bg {
              position: absolute;
              inset: 0;
              background-size: cover;
              background-position: center;
              opacity: 0;
              transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .anim-season-bg.active {
              opacity: 1;
            }
            .anim-keyword-slide {
              position: absolute;
              width: 100%;
              opacity: 0;
              transform: translateX(100px);
              transition: opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);
              pointer-events: none;
              z-index: 1;
            }
            .anim-keyword-slide.active {
              opacity: 1 !important;
              transform: translateX(0) !important;
              pointer-events: auto;
              z-index: 10;
            }
            .anim-keyword-slide.hidden {
              opacity: 0 !important;
              transform: translateX(0) !important;
              transition: opacity 0.3s ease-out !important;
              pointer-events: none;
              z-index: 1;
            }
            .completed {
              background-color: #D4AF37 !important;
              box-shadow: 0 0 12px #D4AF37 !important;
            }
            #anim-bg-final {
              opacity: 0;
              transition: opacity 1.5s ease-in-out;
            }
            #anim-bg-final.active {
              opacity: 1 !important;
            }
          ` }}></style>

          {/* Background Layers */}
          <div id="anim-bg-spring" className="anim-season-bg active" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&q=80&w=2000')" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-pink-300/30 to-green-300/40 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
          <div id="anim-bg-summer" className="anim-season-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000')" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-yellow-400/40 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          <div id="anim-bg-autumn" className="anim-season-bg" style={{ backgroundImage: "url('https://npr.brightspotcdn.com/legacy/sites/vpr/files/201909/iStock-FallFoliage_0.jpg')" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-900/50 to-amber-950/60 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          <div id="anim-bg-winter" className="anim-season-bg" style={{ backgroundImage: "url('https://samantha-brown.com/wp-content/uploads/2022/11/cozy-winter-lodges.jpg')" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200/40 to-blue-200/40 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-black/50"></div>
          </div>

          {/* Final Gradient Background */}
          <div id="anim-bg-final" className="absolute inset-0 z-0" style={{ background: "linear-gradient(135deg, #0B5563 0%, #1a7b8e 50%, #D4AF37 100%)" }}></div>

          {/* Convergence Container */}
          <div id="anim-convergence-container" className="absolute inset-0 z-20 pointer-events-none overflow-hidden"></div>

          {/* Main UI Overlay */}
          <div className="relative z-30 w-full h-full flex flex-col items-center justify-center px-8 text-center">
            {/* Header */}
            <div className="mb-4 overflow-hidden">
              <p id="anim-header-text" className="text-white/70 font-satoshi text-lg md:text-xl uppercase tracking-[0.3em] font-medium transition-all duration-700">
                Analyzing You Are...
              </p>
            </div>

            {/* Animated Keyword Slider */}
            <div className="relative min-h-[200px] flex items-center justify-center mb-12 md:mb-16 w-full">
              <h1 id="anim-keyword-1" className="anim-keyword-slide text-5xl md:text-8xl font-cabinet font-black text-white tracking-tight leading-none">
                Blooming Spring
              </h1>
              <h1 id="anim-keyword-2" className="anim-keyword-slide text-5xl md:text-8xl font-cabinet font-black text-white tracking-tight leading-none">
                Sunny Summer
              </h1>
              <h1 id="anim-keyword-3" className="anim-keyword-slide text-5xl md:text-8xl font-cabinet font-black text-white tracking-tight leading-none">
                Deep Autumn
              </h1>
              <h1 id="anim-keyword-4" className="anim-keyword-slide text-5xl md:text-8xl font-cabinet font-black text-white tracking-tight leading-none">
                Snowy Winter
              </h1>
            </div>

            {/* Progress Bar Section */}
            <div className="max-w-xl mx-auto w-full space-y-8">
              <div className="relative h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div id="anim-main-progress" className="absolute top-0 left-0 h-full bg-[#D4AF37] transition-all duration-1000 ease-out" style={{ width: "25%" }}></div>
              </div>

              <div className="flex justify-between items-start">
                <div className="flex flex-col items-center">
                  <div id="anim-dot-1" className="w-3 h-3 rounded-full mb-3 transition-all duration-500 bg-[#D4AF37] shadow-[0_0_12px_#D4AF37]"></div>
                  <span className="text-[10px] font-cabinet font-bold text-white/40 uppercase tracking-widest">Analysis</span>
                </div>
                <div className="flex flex-col items-center">
                  <div id="anim-dot-2" className="w-3 h-3 rounded-full bg-white/20 mb-3 transition-all duration-500"></div>
                  <span className="text-[10px] font-cabinet font-bold text-white/40 uppercase tracking-widest">Extract</span>
                </div>
                <div className="flex flex-col items-center">
                  <div id="anim-dot-3" className="w-3 h-3 rounded-full bg-white/20 mb-3 transition-all duration-500"></div>
                  <span className="text-[10px] font-cabinet font-bold text-white/40 uppercase tracking-widest">Calculate</span>
                </div>
                <div className="flex flex-col items-center">
                  <div id="anim-dot-4" className="w-3 h-3 rounded-full bg-white/20 mb-3 transition-all duration-500"></div>
                  <span className="text-[10px] font-cabinet font-bold text-white/40 uppercase tracking-widest">Match</span>
                </div>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="fixed bottom-8 left-8 z-50 flex items-center gap-3">
            <svg className="w-6 h-6 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            <span className="font-cabinet font-bold text-white text-sm tracking-widest uppercase">Neural Engine Active</span>
          </div>

        </div>
      )}
    </div>
  );
}
