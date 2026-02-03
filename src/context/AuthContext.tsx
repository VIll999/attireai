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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  syncUserToBackend: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  syncUserToBackend: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const syncUserToBackend = async () => {
    if (!user) return;

    try {
      await syncUser({
        firebase_uid: user.uid,
        email: user.email || "",
        name: user.displayName || user.email?.split("@")[0] || "User",
        profile_picture_url: user.photoURL || undefined,
      });
      console.log("User synced to backend");
    } catch (error) {
      console.error("Failed to sync user to backend:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Sync user to backend when they log in
      if (firebaseUser) {
        try {
          await syncUser({
            firebase_uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
            profile_picture_url: firebaseUser.photoURL || undefined,
          });
          console.log("User synced to backend");
        } catch (error) {
          console.error("Failed to sync user to backend:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, syncUserToBackend }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
