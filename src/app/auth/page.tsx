"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale } from "@/context/LocaleContext";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "@/lib/firebase";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password validation
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setIsSignUp(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError(t("auth.passwordsNoMatch"));
          setIsLoading(false);
          return;
        }
        if (!isPasswordValid) {
          setError(t("auth.passwordRequirements"));
          setIsLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        // Redirect to verify email page after signup
        router.push("/auth/verify-email");
        return;
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          router.push("/auth/verify-email");
          return;
        }
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/email-already-in-use") {
        setError(t("auth.emailAlreadyInUse"));
      } else if (error.code === "auth/invalid-email") {
        setError(t("auth.invalidEmail"));
      } else if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        setError(t("auth.invalidCredential"));
      } else {
        setError(error.message || "An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || t("auth.failedGoogleSignIn"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage(t("auth.resetEmailSent"));
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/user-not-found") {
        setError(t("auth.noAccountFound"));
      } else if (error.code === "auth/invalid-email") {
        setError(t("auth.invalidEmail"));
      } else {
        setError(error.message || t("auth.failedResetEmail"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-8"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("auth.backToHome")}
          </Link>

          <div className="bg-white dark:bg-slate-900/50 dark:border dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-slate-950/50 p-8">
            {isForgotPassword ? (
              <>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {t("auth.resetPassword")}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {t("auth.resetPasswordDesc")}
                </p>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 text-sm">
                      {successMessage}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.email")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-500"
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t("auth.sending")}
                      </span>
                    ) : (
                      t("auth.sendResetLink")
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-slate-600 dark:text-slate-400">
                  {t("auth.rememberPassword")}{" "}
                  <button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError("");
                      setSuccessMessage("");
                    }}
                    className="text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    {t("auth.backToSignIn")}
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {isSignUp ? t("auth.createAccount") : t("auth.welcomeBack")}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {isSignUp
                    ? t("auth.startJourney")
                    : t("auth.signInContinue")}
                </p>

                {/* Google Sign In */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50 dark:text-slate-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {t("auth.continueWithGoogle")}
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">{t("auth.orContinueWithEmail")}</span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.email")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-500"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("auth.password")}
                      </label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setError("");
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          {t("auth.forgotPassword")}
                        </button>
                      )}
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-500"
                      placeholder={t("auth.passwordPlaceholder")}
                    />
                    {isSignUp && password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t("auth.passwordMustHave")}</p>
                        <div className="grid grid-cols-2 gap-1">
                          <p className={`text-xs flex items-center gap-1 ${passwordRequirements.minLength ? 'text-green-600' : 'text-slate-400'}`}>
                            <span>{passwordRequirements.minLength ? '✓' : '○'}</span> {t("auth.minLength")}
                          </p>
                          <p className={`text-xs flex items-center gap-1 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-slate-400'}`}>
                            <span>{passwordRequirements.hasUppercase ? '✓' : '○'}</span> {t("auth.uppercase")}
                          </p>
                          <p className={`text-xs flex items-center gap-1 ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-slate-400'}`}>
                            <span>{passwordRequirements.hasLowercase ? '✓' : '○'}</span> {t("auth.lowercase")}
                          </p>
                          <p className={`text-xs flex items-center gap-1 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-slate-400'}`}>
                            <span>{passwordRequirements.hasNumber ? '✓' : '○'}</span> {t("auth.number")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {isSignUp && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {t("auth.confirmPassword")}
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-500"
                        placeholder={t("auth.confirmPasswordPlaceholder")}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t("auth.loading")}
                      </span>
                    ) : isSignUp ? (
                      t("auth.createAccountBtn")
                    ) : (
                      t("auth.signIn")
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-slate-600 dark:text-slate-400">
                  {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}{" "}
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                    }}
                    className="text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    {isSignUp ? t("auth.signIn") : t("auth.signUp")}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <h2 className="text-4xl font-bold mb-4">{t("auth.brandingTitle")}</h2>
          <p className="text-xl text-indigo-100 mb-8">
            {t("auth.brandingSubtitle")}
          </p>
          <div className="space-y-4 text-left">
            {[
              t("auth.feature1"),
              t("auth.feature2"),
              t("auth.feature3"),
              t("auth.feature4"),
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-indigo-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthForm />
    </Suspense>
  );
}
