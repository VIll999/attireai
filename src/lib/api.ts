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
  vip_trial_used?: boolean;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatus {
  tier: string;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  vip_trial_used: boolean;
  is_admin: boolean;
  monthly_price_usd: number;
}

export interface StripeConfig {
  publishable_key: string;
  monthly_price_usd: number;
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

/**
 * Upload color analysis photo to S3
 */
export async function uploadColorAnalysisPhoto(
  firebaseUid: string,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload/color-analysis-photo`, {
    method: "POST",
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Failed to upload color analysis photo");
  }

  return response.json();
}

// --- Color Profiles API ---

interface ColorProfileResponse {
  id: string;
  user_id: string;
  measurement_id: string;
  measurement_name: string | null;
  skin_tone: string | null;
  skin_tone_hex: string | null;
  hair_color: string | null;
  hair_color_hex: string | null;
  recommended_palette: any;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all color profiles for current user
 */
export async function getColorProfiles(
  firebaseUid: string,
  measurementId?: string
): Promise<ColorProfileResponse[]> {
  const params = new URLSearchParams();
  if (measurementId) {
    params.append("measurement_id", measurementId);
  }

  const url = `${API_URL}/color-profiles${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get color profiles");
  }

  return response.json();
}

// --- Outfit Recommendations API ---

interface OutfitRecommendationCreate {
  measurement_id?: string;
  occasion: string;
  weather: string;
  dress_code: string;
}

export interface OutfitRecommendationItemResponse {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  purchase_url: string | null;
  recommended_size: string | null;
  outfit_index: number | null;
  stock_status: string | null;
}

export interface OutfitRecommendationResponse {
  id: string;
  user_id: string;
  measurement_id: string | null;
  occasion: string | null;
  weather: string | null;
  dress_code: string | null;
  total_price: number | null;
  reasoning: string | null;
  user_rating: string | null;
  created_at: string;
  items: OutfitRecommendationItemResponse[];
}

/**
 * Create outfit recommendation
 */
export async function createOutfitRecommendation(
  firebaseUid: string,
  data: OutfitRecommendationCreate
): Promise<OutfitRecommendationResponse> {
  const response = await fetch(`${API_URL}/outfit-recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to create outfit recommendation" }));
    throw new Error(error.detail || "Failed to create outfit recommendation");
  }

  return response.json();
}

/**
 * Get all outfit recommendations for current user
 */
export async function getOutfitRecommendations(
  firebaseUid: string,
  measurementId?: string
): Promise<OutfitRecommendationResponse[]> {
  const params = new URLSearchParams();
  if (measurementId) {
    params.append("measurement_id", measurementId);
  }

  const url = `${API_URL}/outfit-recommendations${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get outfit recommendations");
  }

  return response.json();
}

/**
 * Get specific outfit recommendation
 */
export async function getOutfitRecommendation(
  firebaseUid: string,
  recommendationId: string
): Promise<OutfitRecommendationResponse> {
  const response = await fetch(`${API_URL}/outfit-recommendations/${recommendationId}`, {
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get outfit recommendation");
  }

  return response.json();
}

// --- Preferences API ---

export type PriceRange = "BUDGET" | "MID_RANGE" | "LUXURY";

export interface StylePreferencesData {
  occasion?: string | null;
  weather?: string | null;
  dress_code?: string | null;
  preferred_styles: string[];
  avoided_styles: string[];
  price_range: PriceRange;
  preferred_brands: string[];
  excluded_brands: string[];
}

export async function getStylePreferences(firebaseUid: string): Promise<StylePreferencesData | null> {
  try {
    const res = await fetch(`${API_URL}/style-preferences`, {
      headers: { "X-Firebase-UID": firebaseUid },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch style preferences");
    return res.json();
  } catch {
    return null;
  }
}

export async function saveStylePreferences(
  firebaseUid: string,
  data: StylePreferencesData
): Promise<StylePreferencesData> {
  const res = await fetch(`${API_URL}/style-preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Firebase-UID": firebaseUid },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save style preferences");
  return res.json();
}

// --- Style Presets (Sprint 3 Story #7) ---

export interface StylePreset {
  id: string;
  name: string;
  occasion: string | null;
  weather: string | null;
  dress_code: string | null;
  preferred_styles: string[];
  created_at: string;
}

export interface StylePresetCreate {
  name: string;
  occasion?: string | null;
  weather?: string | null;
  dress_code?: string | null;
  preferred_styles?: string[];
}

export async function listStylePresets(firebaseUid: string): Promise<StylePreset[]> {
  const res = await fetch(`${API_URL}/style-preferences/presets`, {
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!res.ok) throw new Error("Failed to load presets");
  return res.json();
}

export async function createStylePreset(
  firebaseUid: string,
  data: StylePresetCreate,
): Promise<StylePreset> {
  const res = await fetch(`${API_URL}/style-preferences/presets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Firebase-UID": firebaseUid },
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw new Error("DUPLICATE_NAME");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to save preset");
  }
  return res.json();
}

export async function deleteStylePreset(firebaseUid: string, presetId: string): Promise<void> {
  const res = await fetch(`${API_URL}/style-preferences/presets/${presetId}`, {
    method: "DELETE",
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete preset");
}

// --- AI Recommendations API ---

export interface AIRecommendationRequest {
  occasion?: string;
  budget?: number;
  currency?: string;
  styles?: string[];
  gender?: string;
  location?: string;
  weather?: string;
  dress_code?: string;
  measurement_profile_id?: string;
  k?: number;
  save_to_db?: boolean;
}

export interface AIRecommendationItem {
  name: string;
  category?: string | null;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  image_url?: string | null;
  purchase_url?: string | null;
  reasoning?: string;
  recommended_color?: string | null;
  recommended_size?: string | null;
  source_urls?: string[];
  outfit_index?: number | null;
  stock_status?: string | null;
}

export interface AIRecommendationResponse {
  items: AIRecommendationItem[];
  recommendation_ids?: string[];
  debug?: Record<string, unknown>;
}

export async function getAIRecommendations(
  firebaseUid: string,
  data: AIRecommendationRequest
): Promise<AIRecommendationResponse> {
  const response = await fetch(`${API_URL}/recommendations/ai-products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("DAILY_LIMIT_REACHED");
    }
    const error = await response.json().catch(() => ({ detail: "Failed to get recommendations" }));
    throw new Error(error.detail || "Failed to get AI recommendations");
  }

  return response.json();
}

export interface UsageStatus {
  is_vip: boolean;
  daily_used: number;
  daily_limit: number;
  daily_remaining: number | null;
  vip_trial_used: boolean;
  vip_trial_available: boolean;
}

export async function getMyUsage(firebaseUid: string): Promise<UsageStatus> {
  const response = await fetch(`${API_URL}/users/me/usage`, {
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!response.ok) {
    throw new Error("Failed to load usage");
  }
  return response.json();
}

/**
 * Rate an outfit recommendation (like/dislike)
 */
export async function rateOutfitRecommendation(
  firebaseUid: string,
  recommendationId: string,
  rating: "LIKE" | "DISLIKE" | "NONE"
): Promise<OutfitRecommendationResponse> {
  const response = await fetch(`${API_URL}/outfit-recommendations/${recommendationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify({ user_rating: rating }),
  });

  if (!response.ok) {
    throw new Error("Failed to rate recommendation");
  }

  return response.json();
}

/**
 * Get alternative items for a specific category in an outfit
 */
export interface AlternativeItemsRequest {
  measurement_profile_id?: string;
  category: string;
  occasion?: string;
  weather?: string;
  location?: string;
  dress_code?: string;
  budget?: number;
  currency?: string;
  styles?: string[];
  original_item_name?: string;
  original_item_brand?: string;
  num_alternatives?: number;
}

export interface AlternativeItemsResponse {
  items: AIRecommendationItem[];
  debug?: Record<string, unknown>;
}

export async function getAlternativeItems(
  firebaseUid: string,
  data: AlternativeItemsRequest
): Promise<AlternativeItemsResponse> {
  const response = await fetch(`${API_URL}/recommendations/alternatives`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to get alternative items" }));
    throw new Error(error.detail || "Failed to get alternative items");
  }

  return response.json();
}

// ── Rating System (Learning) ──

export interface RatingResponse {
  id: string;
  recommendation_id: string;
  rating: string;
  created_at: string;
  updated_at: string;
}

export interface LearningStatsResponse {
  total_ratings: number;
  likes: number;
  dislikes: number;
  learning_active: boolean;
  min_ratings_needed: number;
}

/**
 * Rate an outfit recommendation (new learning system)
 */
export async function rateRecommendation(
  firebaseUid: string,
  recommendationId: string,
  rating: "LIKE" | "DISLIKE"
): Promise<RatingResponse> {
  const response = await fetch(`${API_URL}/recommendations/${recommendationId}/rate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify({ rating }),
  });

  if (!response.ok) {
    throw new Error("Failed to rate recommendation");
  }

  return response.json();
}

/**
 * Get user's rating for a specific recommendation
 */
export async function getRating(
  firebaseUid: string,
  recommendationId: string
): Promise<RatingResponse | null> {
  const response = await fetch(`${API_URL}/recommendations/${recommendationId}/rating`, {
    method: "GET",
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to get rating");
  }

  const data = await response.json();
  return data || null;
}

/**
 * Delete user's rating for a recommendation
 */
export async function deleteRating(
  firebaseUid: string,
  recommendationId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/recommendations/${recommendationId}/rating`, {
    method: "DELETE",
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete rating");
  }
}

/**
 * Get learning statistics for the current user
 */
export async function getLearningStats(
  firebaseUid: string
): Promise<LearningStatsResponse> {
  const response = await fetch(`${API_URL}/recommendations/learning/stats`, {
    method: "GET",
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get learning stats");
  }

  return response.json();
}

// ── Vision / Color Analysis ──

export async function analyzePhotoColors(
  firebaseUid: string,
  photoBase64: string
): Promise<{ skin_tone: string; skin_tone_hex: string; hair_color: string; hair_color_hex: string; confidence?: number }> {
  const response = await fetch(`${API_URL}/vision/analyze-colors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify({ photo_base64: photoBase64 }),
  });
  if (!response.ok) throw new Error("Color analysis failed");
  return response.json();
}

// --- Saved Outfits API ---

export interface SaveOutfitRequest {
  recommendation_id: string;
  collection_name?: string;
}

export interface UpdateSavedOutfitRequest {
  collection_name?: string;
  is_purchased?: boolean;
}

export interface SavedOutfitResponse {
  id: string;
  user_id: string;
  recommendation_id: string;
  collection_name: string;
  is_purchased: boolean;
  try_on_image_url: string | null;
  created_at: string;
}

export interface SavedOutfitWithDetailsResponse extends SavedOutfitResponse {
  recommendation: OutfitRecommendationResponse | null;
}

/**
 * Save an outfit to favorites or a collection
 */
export async function saveOutfit(
  firebaseUid: string,
  data: SaveOutfitRequest
): Promise<SavedOutfitResponse> {
  const response = await fetch(`${API_URL}/saved-outfits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to save outfit" }));
    throw new Error(error.detail || "Failed to save outfit");
  }

  return response.json();
}

/**
 * Get all saved outfits for current user
 */
export async function getSavedOutfits(
  firebaseUid: string,
  filters?: {
    collectionName?: string;
    isPurchased?: boolean;
    brand?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    color?: string;
    weather?: string;
  }
): Promise<SavedOutfitWithDetailsResponse[]> {
  const params = new URLSearchParams();

  if (filters?.collectionName) {
    params.append("collection_name", filters.collectionName);
  }
  if (filters?.isPurchased !== undefined) {
    params.append("is_purchased", filters.isPurchased.toString());
  }
  if (filters?.brand) {
    params.append("brand", filters.brand);
  }
  if (filters?.category) {
    params.append("category", filters.category);
  }
  if (filters?.minPrice !== undefined) {
    params.append("min_price", filters.minPrice.toString());
  }
  if (filters?.maxPrice !== undefined) {
    params.append("max_price", filters.maxPrice.toString());
  }
  if (filters?.color) {
    params.append("color", filters.color);
  }
  if (filters?.weather) {
    params.append("weather", filters.weather);
  }

  const url = `${API_URL}/saved-outfits${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get saved outfits");
  }

  return response.json();
}

/**
 * Get a specific saved outfit with details
 */
export async function getSavedOutfit(
  firebaseUid: string,
  savedOutfitId: string
): Promise<SavedOutfitWithDetailsResponse> {
  const response = await fetch(`${API_URL}/saved-outfits/${savedOutfitId}`, {
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get saved outfit");
  }

  return response.json();
}

/**
 * Update a saved outfit (change collection or mark as purchased)
 */
export async function updateSavedOutfit(
  firebaseUid: string,
  savedOutfitId: string,
  data: UpdateSavedOutfitRequest
): Promise<SavedOutfitResponse> {
  const response = await fetch(`${API_URL}/saved-outfits/${savedOutfitId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update saved outfit");
  }

  return response.json();
}

/**
 * Delete a saved outfit
 */
export async function deleteSavedOutfit(
  firebaseUid: string,
  savedOutfitId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/saved-outfits/${savedOutfitId}`, {
    method: "DELETE",
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok && response.status !== 204) {
    throw new Error("Failed to delete saved outfit");
  }
}

/**
 * Get list of all collection names for current user
 */
export async function getCollections(firebaseUid: string): Promise<string[]> {
  const response = await fetch(`${API_URL}/saved-outfits-collections`, {
    headers: {
      "X-Firebase-UID": firebaseUid,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get collections");
  }

  return response.json();
}

/**
 * Subscription / Stripe APIs
 */
export async function getStripeConfig(): Promise<StripeConfig> {
  const response = await fetch(`${API_URL}/subscriptions/config`);
  if (!response.ok) throw new Error("Failed to get Stripe config");
  return response.json();
}

export async function getSubscriptionStatus(firebaseUid: string): Promise<SubscriptionStatus> {
  const response = await fetch(`${API_URL}/subscriptions/status`, {
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!response.ok) throw new Error("Failed to get subscription status");
  return response.json();
}

export async function createCheckoutSession(
  firebaseUid: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ checkout_url: string }> {
  const response = await fetch(`${API_URL}/subscriptions/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to start checkout: ${text}`);
  }
  return response.json();
}

export async function cancelSubscription(firebaseUid: string): Promise<SubscriptionStatus> {
  const response = await fetch(`${API_URL}/subscriptions/cancel`, {
    method: "POST",
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!response.ok) throw new Error("Failed to cancel subscription");
  return response.json();
}

export async function reactivateSubscription(firebaseUid: string): Promise<SubscriptionStatus> {
  const response = await fetch(`${API_URL}/subscriptions/reactivate`, {
    method: "POST",
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!response.ok) throw new Error("Failed to reactivate subscription");
  return response.json();
}

/**
 * Virtual Try-On (Sprint 3 Story #1)
 */
export interface TryOnResponse {
  id: string;
  outfit_id: string;
  user_photo_url: string;
  result_image_url: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  created_at: string;
  completed_at: string | null;
}

export async function uploadTryOnPhoto(
  firebaseUid: string,
  file: File,
): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const response = await fetch(`${API_URL}/virtual-try-on/upload-photo`, {
    method: "POST",
    headers: { "X-Firebase-UID": firebaseUid },
    body: fd,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Upload failed");
  }
  return response.json();
}

export async function generateTryOn(
  firebaseUid: string,
  outfitId: string,
  userPhotoUrl: string,
): Promise<TryOnResponse> {
  const response = await fetch(`${API_URL}/virtual-try-on/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-UID": firebaseUid,
    },
    body: JSON.stringify({ outfit_id: outfitId, user_photo_url: userPhotoUrl }),
  });
  if (response.status === 402) {
    throw new Error("VIP_REQUIRED");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Try-on failed");
  }
  return response.json();
}

export async function listTryOns(firebaseUid: string): Promise<TryOnResponse[]> {
  const response = await fetch(`${API_URL}/virtual-try-on`, {
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!response.ok) throw new Error("Failed to list try-ons");
  return response.json();
}

export async function deleteTryOn(firebaseUid: string, tryOnId: string): Promise<void> {
  const response = await fetch(`${API_URL}/virtual-try-on/${tryOnId}`, {
    method: "DELETE",
    headers: { "X-Firebase-UID": firebaseUid },
  });
  if (!response.ok && response.status !== 204) {
    throw new Error("Failed to delete try-on");
  }
}
