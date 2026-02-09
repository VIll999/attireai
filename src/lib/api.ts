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
