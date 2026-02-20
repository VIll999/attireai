const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";

interface UserData {
  firebase_uid: string;
  email: string;
  name: string;
  profile_picture_url?: string;
}

interface UserResponse {
  id: string;
  email: string;
  firebase_uid: string;
  name: string;
  profile_picture_url: string | null;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

/**
 * Sync user to backend database after Firebase authentication
 */
export async function syncUser(userData: UserData): Promise<UserResponse> {
  const response = await fetch(`${API_URL}/users/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error("Failed to sync user");
  }

  return response.json();
}

/**
 * Get current user from backend
 */
export async function getCurrentUser(firebaseUid: string): Promise<UserResponse> {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user");
  }

  return response.json();
}

/**
 * Delete current user from backend database
 */
export async function deleteUserFromBackend(firebaseUid: string): Promise<void> {
  const response = await fetch(`${API_URL}/users/me`, {
    method: "DELETE",
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok && response.status !== 204) {
    throw new Error("Failed to delete user");
  }
}

/**
 * Update current user profile
 */
export async function updateUserProfile(
  firebaseUid: string,
  data: { name?: string; profile_picture_url?: string }
): Promise<UserResponse> {
  const response = await fetch(`${API_URL}/users/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update profile");
  }

  return response.json();
}

/**
 * Upload profile picture to S3
 */
// --- Measurement API ---

export interface MeasurementData {
  name: string;
  height?: number | null;
  weight?: number | null;
  chest?: number | null;
  waist?: number | null;
  hip?: number | null;
  inseam?: number | null;
  shoulder_width?: number | null;
  arm_length?: number | null;
  is_primary?: boolean;
}

export interface MeasurementResponse {
  id: string;
  user_id: string;
  name: string;
  height: number | null;
  weight: number | null;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  inseam: number | null;
  shoulder_width: number | null;
  arm_length: number | null;
  is_primary: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

export async function getMeasurements(firebaseUid: string): Promise<MeasurementResponse[]> {
  const response = await fetch(`${API_URL}/measurements`, {
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!response.ok) throw new Error("Failed to get measurements");
  return response.json();
}

export async function createMeasurement(
  firebaseUid: string,
  data: MeasurementData
): Promise<MeasurementResponse> {
  const response = await fetch(`${API_URL}/measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Firebase-UID": firebaseUid },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create measurement");
  return response.json();
}

export async function updateMeasurement(
  firebaseUid: string,
  id: string,
  data: Partial<MeasurementData>
): Promise<MeasurementResponse> {
  const response = await fetch(`${API_URL}/measurements/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Firebase-UID": firebaseUid },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update measurement");
  return response.json();
}

export async function deleteMeasurement(
  firebaseUid: string,
  id: string
): Promise<void> {
  const response = await fetch(`${API_URL}/measurements/${id}`, {
    method: "DELETE",
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!response.ok && response.status !== 204) throw new Error("Failed to delete measurement");
}

// --- Sizing API ---

export interface SizingFitDetail {
  size_range: [number, number];
  user_value: number;
  position: number;
  in_range: boolean;
}

export interface SizingRecommendation {
  brand: string;
  category: string;
  sizing_notes: string;
  recommended_size: string;
  confidence: string;
  fit_score: number;
  fit_details: {
    chest: SizingFitDetail;
    waist: SizingFitDetail;
    hip: SizingFitDetail;
  };
}

export interface SizingResponse {
  measurement_name: string;
  body_type: string;
  body_type_description: string;
  recommendations: SizingRecommendation[];
}

export async function getSizeRecommendations(
  firebaseUid: string,
  measurementId: string,
  gender: string = "male"
): Promise<SizingResponse> {
  const response = await fetch(
    `${API_URL}/sizing/recommendations?measurement_id=${measurementId}&gender=${gender}`,
    {
      headers: { "X-Firebase-UID": firebaseUid },
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to get recommendations" }));
    throw new Error(error.detail || "Failed to get size recommendations");
  }
  return response.json();
}

// --- Upload API ---

export async function uploadProfilePicture(
  firebaseUid: string,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload/profile-picture`, {
    method: "POST",
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Failed to upload profile picture");
  }

  return response.json();
}
