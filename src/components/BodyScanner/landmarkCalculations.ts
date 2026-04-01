/**
 * Pure functions for converting MediaPipe Pose landmarks into body measurements.
 * All outputs are in centimeters.
 */

interface Landmark {
  x: number; // Normalized 0-1
  y: number;
  z: number;
  visibility?: number;
}

export interface DetectedMeasurements {
  shoulder_width: number;
  arm_length: number;
  inseam: number;
  chest: number;
  waist: number;
  hip: number;
}

// MediaPipe Pose landmark indices
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const NOSE = 0;

function distance2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function midpoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

/**
 * Estimate the top-of-head position from the nose landmark.
 * The head height is roughly 1/8 of total body height.
 * We approximate by moving up from the nose by ~60% of face height.
 */
function estimateHeadTop(nose: Landmark, shoulderMid: Landmark): Landmark {
  const noseToShoulder = Math.abs(nose.y - shoulderMid.y);
  // Head top is approximately the same distance above nose as nose-to-shoulder
  return { x: nose.x, y: nose.y - noseToShoulder * 0.7, z: nose.z };
}

/**
 * Calculate body measurements from MediaPipe Pose landmarks.
 *
 * @param landmarks - Array of 33 normalized landmarks from MediaPipe Pose
 * @param heightCm - User's known height in centimeters (used as scale reference)
 * @param frameWidth - Video frame width in pixels
 * @param frameHeight - Video frame height in pixels
 */
export function calculateMeasurements(
  landmarks: Landmark[],
  heightCm: number,
  frameWidth: number,
  frameHeight: number,
): DetectedMeasurements {
  const nose = landmarks[NOSE];
  const lShoulder = landmarks[LEFT_SHOULDER];
  const rShoulder = landmarks[RIGHT_SHOULDER];
  const lElbow = landmarks[LEFT_ELBOW];
  const rElbow = landmarks[RIGHT_ELBOW];
  const lWrist = landmarks[LEFT_WRIST];
  const rWrist = landmarks[RIGHT_WRIST];
  const lHip = landmarks[LEFT_HIP];
  const rHip = landmarks[RIGHT_HIP];
  const lAnkle = landmarks[LEFT_ANKLE];
  const rAnkle = landmarks[RIGHT_ANKLE];

  const shoulderMid = midpoint(lShoulder, rShoulder);
  const hipMid = midpoint(lHip, rHip);
  const ankleMid = midpoint(lAnkle, rAnkle);
  const headTop = estimateHeadTop(nose, shoulderMid);

  // Pixel height: head top to ankle midpoint (normalized coords)
  const pixelHeight = Math.abs(headTop.y - ankleMid.y);
  if (pixelHeight < 0.1) {
    // Not enough body visible — return zeroes
    return { shoulder_width: 0, arm_length: 0, inseam: 0, chest: 0, waist: 0, hip: 0 };
  }

  const scale = heightCm / pixelHeight;

  // Shoulder width: direct distance between shoulder landmarks
  const shoulderWidthNorm = distance2D(lShoulder, rShoulder);
  const shoulder_width = Math.round(shoulderWidthNorm * scale * 10) / 10;

  // Arm length: shoulder → elbow → wrist (average of both arms)
  const leftArm = distance2D(lShoulder, lElbow) + distance2D(lElbow, lWrist);
  const rightArm = distance2D(rShoulder, rElbow) + distance2D(rElbow, rWrist);
  const avgArmNorm = (leftArm + rightArm) / 2;
  const arm_length = Math.round(avgArmNorm * scale * 10) / 10;

  // Inseam: hip midpoint to ankle midpoint
  const inseamNorm = distance2D(hipMid, ankleMid);
  const inseam = Math.round(inseamNorm * scale * 10) / 10;

  // Circumference estimates from frontal width using elliptical approximation
  // circumference ≈ π × √(2 × (a² + b²)) where a = half-width, b = a × depthRatio
  function estimateCircumference(width: number, depthRatio: number): number {
    const a = width / 2;
    const b = a * depthRatio;
    return Math.PI * Math.sqrt(2 * (a * a + b * b));
  }

  // Chest: slightly wider than shoulder width (chest expands beyond bone)
  const chestWidthNorm = shoulderWidthNorm * 1.05;
  const chestWidthCm = chestWidthNorm * scale;
  const chest = Math.round(estimateCircumference(chestWidthCm, 0.7) * 10) / 10;

  // Waist: estimate from a point between chest and hips
  // Use the narrowest width estimate — hip distance is a reasonable proxy
  const hipWidthNorm = distance2D(lHip, rHip);
  const waistWidthCm = hipWidthNorm * scale * 0.85; // Waist is typically narrower than hips
  const waist = Math.round(estimateCircumference(waistWidthCm, 0.75) * 10) / 10;

  // Hip: widest point at hip landmarks
  const hipWidthCm = hipWidthNorm * scale * 1.1; // Hips extend beyond bone landmarks
  const hip = Math.round(estimateCircumference(hipWidthCm, 0.85) * 10) / 10;

  return { shoulder_width, arm_length, inseam, chest, waist, hip };
}
