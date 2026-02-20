"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, sendEmailVerification } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { t } = useLocale();
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check if user is verified (poll every 3 seconds)
  useEffect(() => {
    if (!user) return;

    const checkVerification = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        clearInterval(checkVerification);
        router.push("/dashboard");
      }
    }, 3000);

    return () => clearInterval(checkVerification);
  }, [user, router]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Redirect if already verified
  useEffect(() => {
    if (!loading && user?.emailVerified) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;

    setError("");
    setIsLoading(true);

    try {
      await sendEmailVerification(auth.currentUser);
      setEmailSent(true);
      setCountdown(60); // 60 second cooldown
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/too-many-requests") {
        setError(t("verifyEmail.tooManyRequests"));
      } else {
        setError(error.message || t("verifyEmail.failedSend"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCheck = async () => {
    await auth.currentUser?.reload();
    if (auth.currentUser?.emailVerified) {
      router.push("/dashboard");
    } else {
      setError(t("verifyEmail.notVerifiedYet"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900/50 dark:border dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-slate-950/50 p-8 text-center">
          {/* Email Icon */}
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t("verifyEmail.title")}
          </h1>

          {emailSent ? (
            <>
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                {t("verifyEmail.sentTo")}
              </p>
              <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-6">
                {user.email}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {t("verifyEmail.autoRedirect")}
              </p>
            </>
          ) : (
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t("verifyEmail.pleaseVerify")}
            </p>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {!emailSent ? (
              <button
                onClick={handleSendVerification}
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("auth.sending")}
                  </span>
                ) : (
                  t("verifyEmail.sendVerification")
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSendVerification}
                  disabled={isLoading || countdown > 0}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("auth.sending")}
                    </span>
                  ) : countdown > 0 ? (
                    `${t("verifyEmail.resendIn")} ${countdown}s`
                  ) : (
                    t("verifyEmail.resendVerification")
                  )}
                </button>

                <button
                  onClick={handleManualCheck}
                  className="w-full py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  {t("verifyEmail.iveVerified")}
                </button>
              </>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("verifyEmail.wrongEmail")}{" "}
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/auth?mode=signup");
                }}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {t("verifyEmail.signUpDifferent")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
