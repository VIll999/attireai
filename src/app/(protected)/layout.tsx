"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Check if email/password user needs verification
  const isEmailProvider = user?.providerData.some(
    (provider) => provider.providerId === "password"
  );
  const needsVerification = isEmailProvider && !user?.emailVerified;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth");
      } else if (needsVerification) {
        router.push("/auth/verify-email");
      }
    }
  }, [user, loading, needsVerification, router]);

  // Show loading while checking auth
  if (loading || !user || needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // User is authenticated and verified - render protected content
  return <>{children}</>;
}
