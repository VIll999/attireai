/**
 * Guidance logic for camera body scanning.
 * Evaluates pose quality and returns user-facing guidance hints.
 */

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface GuidanceState {
  isFullBodyVisible: boolean;
  isFacingCamera: boolean;
  isPoseStable: boolean;
  distanceHint: string | null; // "Step closer" | "Step back" | null
  poseHint: string | null;     // "Stand straight" | "Face the camera" | "Hold still..." | null
  stableSeconds: number;       // How many seconds the pose has been stable
  isReady: boolean;            // All checks pass and stable long enough
}

// Key landmarks that must be visible
const REQUIRED_LANDMARKS = [0, 11, 12, 23, 24, 27, 28]; // nose, shoulders, hips, ankles
const VISIBILITY_THRESHOLD = 0.5;
const STABILITY_THRESHOLD = 0.015; // Max average landmark movement (normalized coords)
const READY_SECONDS = 3; // Seconds of stability needed before capture

let prevLandmarks: Landmark[] | null = null;
let stableStartTime: number | null = null;

export function resetGuidance() {
  prevLandmarks = null;
  stableStartTime = null;
}

export function evaluateGuidance(landmarks: Landmark[]): GuidanceState {
  const now = Date.now();

  // 1. Check full body visibility
  const isFullBodyVisible = REQUIRED_LANDMARKS.every(
    (idx) => (landmarks[idx]?.visibility ?? 0) > VISIBILITY_THRESHOLD
  );

  // 2. Check distance (shoulder width relative to frame)
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);

  let distanceHint: string | null = null;
  if (shoulderWidth < 0.12) {
    distanceHint = "Step closer to the camera";
  } else if (shoulderWidth > 0.45) {
    distanceHint = "Step back from the camera";
  }

  // 3. Check facing camera (left shoulder should be to the left of right shoulder in image)
  const isFacingCamera =
    lShoulder.x < rShoulder.x &&
    (lShoulder.visibility ?? 0) > VISIBILITY_THRESHOLD &&
    (rShoulder.visibility ?? 0) > VISIBILITY_THRESHOLD;

  // 4. Check shoulder level (standing straight)
  const shoulderTilt = Math.abs(lShoulder.y - rShoulder.y);
  const isStandingStraight = shoulderTilt < 0.04;

  // 5. Check pose stability (compare to previous frame)
  let isCurrentlyStable = false;
  if (prevLandmarks && prevLandmarks.length === landmarks.length) {
    let totalDisplacement = 0;
    for (let i = 0; i < REQUIRED_LANDMARKS.length; i++) {
      const idx = REQUIRED_LANDMARKS[i];
      const dx = landmarks[idx].x - prevLandmarks[idx].x;
      const dy = landmarks[idx].y - prevLandmarks[idx].y;
      totalDisplacement += Math.sqrt(dx * dx + dy * dy);
    }
    const avgDisplacement = totalDisplacement / REQUIRED_LANDMARKS.length;
    isCurrentlyStable = avgDisplacement < STABILITY_THRESHOLD;
  }
  prevLandmarks = [...landmarks];

  // Track stability duration
  const allBasicChecks = isFullBodyVisible && isFacingCamera && isStandingStraight && !distanceHint;

  if (allBasicChecks && isCurrentlyStable) {
    if (stableStartTime === null) {
      stableStartTime = now;
    }
  } else {
    stableStartTime = null;
  }

  const stableSeconds = stableStartTime ? (now - stableStartTime) / 1000 : 0;
  const isPoseStable = stableSeconds >= 1; // At least 1 second of stability
  const isReady = stableSeconds >= READY_SECONDS;

  // Build pose hint
  let poseHint: string | null = null;
  if (!isFullBodyVisible) {
    poseHint = "Make sure your full body is visible";
  } else if (!isFacingCamera) {
    poseHint = "Face the camera";
  } else if (!isStandingStraight) {
    poseHint = "Stand up straight";
  } else if (distanceHint) {
    poseHint = distanceHint;
  } else if (!isPoseStable) {
    poseHint = "Hold still...";
  } else if (!isReady) {
    const remaining = Math.ceil(READY_SECONDS - stableSeconds);
    poseHint = `Hold still... ${remaining}s`;
  }

  return {
    isFullBodyVisible,
    isFacingCamera,
    isPoseStable,
    distanceHint,
    poseHint,
    stableSeconds,
    isReady,
  };
}
