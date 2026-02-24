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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafb] dark:bg-stone-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand dark:border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // User is authenticated and verified - render protected content
  return <>{children}</>;
}
