"use client";

import { useState, useEffect } from "react";

export type NotificationType = "success" | "error" | "warning" | "info";
export type NotificationVariant = "banner" | "inline" | "toast" | "callout";

interface NotificationProps {
  type: NotificationType;
  variant?: NotificationVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  dismissible?: boolean;
  autoClose?: number; // milliseconds
  action?: {
    label: string;
    onClick: () => void;
  };
}

const iconMap = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const colorMap = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-100 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-200",
    iconBg: "bg-emerald-100 dark:bg-emerald-800",
    iconText: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },
  error: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-100 dark:border-rose-800",
    text: "text-rose-800 dark:text-rose-200",
    iconBg: "bg-rose-100 dark:bg-rose-800",
    iconText: "text-rose-600 dark:text-rose-400",
    accent: "bg-rose-500",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-100 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    iconBg: "bg-amber-100 dark:bg-amber-800",
    iconText: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500",
  },
  info: {
    bg: "bg-brand-50 dark:bg-brand-900/20",
    border: "border-brand-100 dark:border-brand-800",
    text: "text-brand-800 dark:text-brand-200",
    iconBg: "bg-brand-100 dark:bg-brand-800",
    iconText: "text-brand-600 dark:text-brand-400",
    accent: "bg-brand-500",
  },
};

export default function Notification({
  type,
  variant = "banner",
  title,
  message,
  onClose,
  dismissible = true,
  autoClose,
  action,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const colors = colorMap[type];

  useEffect(() => {
    if (autoClose && autoClose > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(onClose, 300); // Wait for animation
    }
  };

  if (!isVisible) return null;

  // Banner variant (full-width with left accent)
  if (variant === "banner") {
    return (
      <div className={`w-full glass-panel ${colors.border} rounded-3xl p-5 flex items-center justify-between shadow-soft overflow-hidden relative animate-[fadeInUp_0.4s_ease-out_forwards]`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colors.accent}`}></div>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full ${colors.iconBg} ${colors.iconText} flex items-center justify-center flex-shrink-0`}>
            {iconMap[type]}
          </div>
          <div>
            {title && <h4 className="font-bold text-gray-900 dark:text-white">{title}</h4>}
            <p className={`text-sm ${title ? 'text-gray-600 dark:text-gray-400' : 'font-medium text-gray-900 dark:text-white'}`}>{message}</p>
          </div>
        </div>
        {dismissible && (
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Inline variant (compact)
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-3 py-3 px-4 ${colors.bg} border ${colors.border} rounded-2xl ${colors.text} animate-[fadeInUp_0.4s_ease-out_forwards]`}>
        <div className={colors.iconText}>{iconMap[type]}</div>
        <span className="text-sm font-medium flex-1">{message}</span>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-bold uppercase tracking-wider hover:underline ml-2"
          >
            {action.label}
          </button>
        )}
        {dismissible && (
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Toast variant (floating notification)
  if (variant === "toast") {
    return (
      <div className={`glass-panel ${colors.border} rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-[slideInRight_0.5s_ease-out_forwards] border-l-4 ${colors.accent.replace('bg-', 'border-l-')}`}>
        <div className={`w-8 h-8 rounded-full ${colors.iconBg} ${colors.iconText} flex items-center justify-center flex-shrink-0`}>
          {iconMap[type]}
        </div>
        <div className="flex-1">
          {title && <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>}
          <p className="text-xs text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        {dismissible && (
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Callout variant (large educational card)
  if (variant === "callout") {
    return (
      <div className={`glass-panel ${colors.border} rounded-[2.5rem] p-8 shadow-glass animate-[fadeInUp_0.4s_ease-out_forwards]`}>
        <div className="flex flex-col gap-6">
          <div className={`w-16 h-16 rounded-[2rem] ${colors.accent} text-white flex items-center justify-center shadow-lg`}>
            {iconMap[type]}
          </div>
          <div>
            {title && <h3 className="text-2xl font-cabinet font-extrabold text-gray-900 dark:text-white mb-2">{title}</h3>}
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{message}</p>
          </div>
          {action && (
            <div className="flex gap-3">
              <button
                onClick={action.onClick}
                className={`px-6 py-2.5 ${colors.accent} text-white rounded-full font-bold text-sm hover:opacity-90 transition-all`}
              >
                {action.label}
              </button>
              {dismissible && (
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-bold text-sm hover:underline"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
