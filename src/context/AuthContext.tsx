"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  auth,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from "@/lib/firebase";
import { syncUser } from "@/lib/api";
import { useRouter } from "next/navigation";

// Backend user data type
export interface DbUser {
  id: string;
  email: string;
  firebase_uid: string;
  name: string;
  profile_picture_url: string | null;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateDbUser: (updates: Partial<DbUser>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  signOut: async () => {},
  updateDbUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Update dbUser locally (after profile edits)
  const updateDbUser = (updates: Partial<DbUser>) => {
    setDbUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      // Sync user to backend when they log in
      if (firebaseUser) {
        try {
          const syncedUser = await syncUser({
            firebase_uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
            profile_picture_url: firebaseUser.photoURL || undefined,
          });
          setDbUser(syncedUser);
        } catch (error) {
          console.error("Failed to sync user to backend:", error);
        }
      } else {
        setDbUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setDbUser(null);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signOut, updateDbUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
