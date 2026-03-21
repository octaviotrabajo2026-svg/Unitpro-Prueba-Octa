'use client';

import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type AlertType = 'error' | 'success' | 'warning' | 'info';

interface InlineAlertProps {
  type: AlertType;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const ALERT_CONFIG = {
  error: {
    icon: AlertCircle,
    containerClass: 'bg-red-50 border-red-200 text-red-700',
    iconClass: 'text-red-500',
  },
  success: {
    icon: CheckCircle,
    containerClass: 'bg-green-50 border-green-200 text-green-700',
    iconClass: 'text-green-500',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-amber-50 border-amber-200 text-amber-700',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 border-blue-200 text-blue-700',
    iconClass: 'text-blue-500',
  },
};

export default function InlineAlert({ type, message, onDismiss, className = '' }: InlineAlertProps) {
  const config = ALERT_CONFIG[type];
  const Icon = config.icon;

  if (!message) return null;

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm ${config.containerClass} ${className}`}
      role="alert"
    >
      <Icon size={15} className={`flex-shrink-0 mt-0.5 ${config.iconClass}`} />
      <span className="flex-1 leading-snug">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
