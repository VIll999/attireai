"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getMeasurements, getColorProfiles, getOutfitRecommendations, MeasurementResponse } from "@/lib/api";

interface ProfileContextType {
  measurements: MeasurementResponse[];
  hasMeasurements: boolean;
  hasColorAnalysis: boolean;
  hasStylePreferences: boolean;
  primaryMeasurementId: string | null;
  profileCompletion: number;
  loaded: boolean;
  ensureLoaded: () => void;
  refreshMeasurements: () => Promise<void>;
  refreshColorProfiles: () => Promise<void>;
  refreshStylePreferences: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  measurements: [],
  hasMeasurements: false,
  hasColorAnalysis: false,
  hasStylePreferences: false,
  primaryMeasurementId: null,
  profileCompletion: 0,
  loaded: false,
  ensureLoaded: () => {},
  refreshMeasurements: async () => {},
  refreshColorProfiles: async () => {},
  refreshStylePreferences: async () => {},
  refreshAll: async () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([]);
  const [hasColorAnalysis, setHasColorAnalysis] = useState(false);
  const [hasStylePreferences, setHasStylePreferences] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [requested, setRequested] = useState(false);
  const fetchingRef = useRef(false);

  const hasMeasurements = measurements.length > 0;
  const primaryMeasurementId = hasMeasurements
    ? (measurements.find(m => m.is_primary) || measurements[0]).id
    : null;
  const profileCompletion = (hasMeasurements ? 33 : 0) + (hasColorAnalysis ? 33 : 0) + (hasStylePreferences ? 34 : 0);

  const refreshMeasurements = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMeasurements(user.uid);
      setMeasurements(data);
    } catch (err) {
      console.error("Failed to fetch measurements:", err);
    }
  }, [user]);

  const refreshColorProfiles = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getColorProfiles(user.uid);
      setHasColorAnalysis(data.length > 0);
    } catch (err) {
      console.error("Failed to fetch color profiles:", err);
    }
  }, [user]);

  const refreshStylePreferences = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getOutfitRecommendations(user.uid);
      setHasStylePreferences(data.length > 0);
    } catch (err) {
      console.error("Failed to fetch outfit recommendations:", err);
    }
  }, [user]);

  const refreshAll = useCallback(async () => {
    if (!user || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const [measurementsData, colorData, outfitData] = await Promise.all([
        getMeasurements(user.uid),
        getColorProfiles(user.uid),
        getOutfitRecommendations(user.uid),
      ]);
      setMeasurements(measurementsData);
      setHasColorAnalysis(colorData.length > 0);
      setHasStylePreferences(outfitData.length > 0);
    } catch (err) {
      console.error("Failed to fetch profile data:", err);
    } finally {
      setLoaded(true);
      fetchingRef.current = false;
    }
  }, [user]);

  // Lazy fetch: only runs when a consumer calls ensureLoaded()
  const ensureLoaded = useCallback(() => {
    if (!loaded && !fetchingRef.current) {
      setRequested(true);
    }
  }, [loaded]);

  // Fetch when requested and user is available
  useEffect(() => {
    if (user && requested && !loaded && !fetchingRef.current) {
      refreshAll();
    }
  }, [user, requested, loaded, refreshAll]);

  // Reset on logout
  useEffect(() => {
    if (!user) {
      setMeasurements([]);
      setHasColorAnalysis(false);
      setHasStylePreferences(false);
      setLoaded(false);
      setRequested(false);
      fetchingRef.current = false;
    }
  }, [user]);

  return (
    <ProfileContext.Provider value={{
      measurements,
      hasMeasurements,
      hasColorAnalysis,
      hasStylePreferences,
      primaryMeasurementId,
      profileCompletion,
      loaded,
      ensureLoaded,
      refreshMeasurements,
      refreshColorProfiles,
      refreshStylePreferences,
      refreshAll,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
