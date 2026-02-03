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
